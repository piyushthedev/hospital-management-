#!/usr/bin/env bash
# ==============================================================================
# AWS EC2 Automated User Data Deployment Script
# Supports: Ubuntu 22.04/24.04 LTS & Amazon Linux 2023
# Purpose: Automatically provisions Node.js 22 LTS, Nginx, Systemd, and HMS
# ==============================================================================

set -euo pipefail
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo ">>> [HMS-DEPLOY] Starting AWS EC2 Automated Deployment..."

APP_DIR="/opt/hospital-management-system"
APP_USER="hospital"

# 1. Detect OS and install base dependencies
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

echo ">>> [HMS-DEPLOY] Detected OS: $OS"

if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y curl git nginx ufw ca-certificates gnupg

    # Install Node.js 22.x LTS via NodeSource
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt-get update -y
    apt-get install -y nodejs
elif [[ "$OS" == "al2023" || "$OS" == "amzn" ]]; then
    dnf update -y
    dnf install -y curl git nginx
    # Install Node.js 22
    dnf install -y nodejs22 || dnf install -y nodejs
fi

node -v
echo ">>> [HMS-DEPLOY] Node.js version installed: $(node -v)"

# 2. Create dedicated service user
if ! id "$APP_USER" &>/dev/null; then
    useradd --system --shell /bin/bash --create-home --home-dir "$APP_DIR" "$APP_USER"
fi

# 3. Create app directory structure and permissions
mkdir -p "$APP_DIR/data"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# 4. Generate random cryptographic JWT secret for production
JWT_SECRET=$(head -c 32 /dev/urandom | xxd -p 2>/dev/null || od -A n -v -t x1 -N 32 /dev/urandom | tr -d ' \n')

cat <<EOF > "$APP_DIR/.env"
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
JWT_SECRET=${JWT_SECRET}
DB_PATH=${APP_DIR}/data/hospital.db
EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# 5. Create Systemd Service Unit
cat <<EOF > /etc/systemd/system/hospital.service
[Unit]
Description=Modular Hospital Management System
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# 6. Configure Nginx Reverse Proxy
cat <<'EOF' > /etc/nginx/conf.d/hospital.conf
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 25M;

    # Gzip Compression for fast HealthTech assets
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss text/javascript;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static assets caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # Application & API Routing
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }
}
EOF

# Remove default site if on Debian/Ubuntu
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl restart nginx
systemctl enable nginx

echo ">>> [HMS-DEPLOY] Nginx configured and running."
echo ">>> [HMS-DEPLOY] Server setup completed. Copy your application files to $APP_DIR and execute: systemctl start hospital"

