# 🏥 Cloud Deployment Guide - Modular Hospital Management System

This guide provides instructions to deploy the Modular Hospital Management System on any cloud provider (Oracle Cloud Infrastructure / OCI, DigitalOcean, Hetzner, Linode, or any VPS/VM).

Because the system was engineered with **zero external runtime dependencies** (built natively with Node.js 22+ `node:sqlite`, `node:http`, and `node:crypto`), it runs with maximum speed, minimal memory footprint (~40 MB RAM), and simple single-server or containerized deployment.

---

## 🚀 Fast Deployment with Docker Compose (Recommended)

### Step 1: Connect to your Cloud Server
```bash
ssh -i /path/to/your-key.key ubuntu@<YOUR-SERVER-PUBLIC-IP>
```

### Step 2: Install Docker & Docker Compose
On Ubuntu / Debian:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
newgrp docker
```

*(Note for Oracle Cloud Ubuntu instances: Oracle Ubuntu images enable iptables rules that block inbound ports 80/443. Run:)*
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### Step 3: Clone Project & Launch
```bash
git clone https://github.com/piyushthedev/hospital-management-.git /opt/hospital-management-system
cd /opt/hospital-management-system
cp .env.example .env
docker compose up -d
```

### Step 4: Verify
```bash
docker compose ps
curl -I http://localhost:80/api/health
```

Your system is live at `http://<YOUR-SERVER-PUBLIC-IP>`.

---

## 🛠️ Native Systemd & Nginx Deployment

If you prefer running natively with Systemd and Nginx without Docker:

1. Clone repo to `/opt/hospital-management-system`.
2. Run the bootstrap script:
   ```bash
   sudo bash /opt/hospital-management-system/deploy/cloud-init.sh
   ```
3. Start and enable the service:
   ```bash
   sudo systemctl start hospital
   sudo systemctl enable hospital
   sudo systemctl status hospital
   ```

---

## 🔒 Free HTTPS / SSL with Let's Encrypt Certbot

Once your domain name points to your server's Public IP:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hospital.yourdomain.com
```

---

## 💾 Database Backups

Run automated backups via the provided script:
```bash
chmod +x /opt/hospital-management-system/deploy/backup.sh
/opt/hospital-management-system/deploy/backup.sh
```

To schedule a daily backup at 2:00 AM:
```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/hospital-management-system/deploy/backup.sh >> /var/log/hms_backup.log 2>&1") | crontab -
```
