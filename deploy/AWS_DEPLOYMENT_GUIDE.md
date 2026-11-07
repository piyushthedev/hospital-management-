# 🏥 AWS Deployment Guide - Modular Hospital Management System

This guide provides step-by-step instructions to deploy the Modular Hospital Management System on Amazon Web Services (AWS).

Because the system was engineered with **zero external runtime dependencies** (built natively with Node.js 22+ `node:sqlite`, `node:http`, and `node:crypto`), it runs with maximum speed, minimal memory footprint (~40 MB RAM), and simple single-server or containerized deployment.

---

## Architecture Options

| Method | Target Service | Recommended For | Estimated Cost |
| :--- | :--- | :--- | :--- |
| **Option 1 (Recommended)** | **AWS EC2 / Lightsail + Docker** | Fastest setup, isolated container, persistent data | \$3.50 – \$5.00 / month (or Free Tier) |
| **Option 2** | **AWS EC2 + Native Systemd + Nginx** | Bare-metal performance, automated via User-Data | Free Tier eligible (t4g.small / t3.micro) |
| **Option 3** | **AWS App Runner / ECS Fargate** | Fully managed serverless container | Pay per request / vCPU |

---

## Option 1: Docker Compose on AWS EC2 or Lightsail (Recommended)

### Step 1: Launch your AWS Instance
1. Open the [AWS Management Console](https://console.aws.amazon.com/).
2. Navigate to **EC2** > **Launch Instance** (or **Amazon Lightsail** > **Create Instance**).
3. Choose:
   - **AMI**: Ubuntu 24.04 LTS (or Amazon Linux 2023)
   - **Instance Type**: `t4g.small` (ARM Graviton) or `t3.small` / `t3.micro` (Free Tier)
   - **Key Pair**: Select or create an SSH key pair (`hospital-key.pem`)
   - **Storage**: 20 GB gp3 SSD

### Step 2: Configure Security Group (Firewall)
Under **Network settings**, create or select a Security Group with these Inbound rules:
- **SSH (22)**: Source `My IP` (for secure administrative access)
- **HTTP (80)**: Source `0.0.0.0/0` (public access to hospital portal)
- **HTTPS (443)**: Source `0.0.0.0/0` (encrypted SSL access)

### Step 3: Connect and Deploy
1. Connect to your instance via SSH:
   ```bash
   chmod 400 hospital-key.pem
   ssh -i hospital-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
   ```

2. Install Docker and Docker Compose (if not already installed):
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. Clone or copy your project repository:
   ```bash
   git clone <YOUR-REPOSITORY-URL> /opt/hospital-management-system
   cd /opt/hospital-management-system
   ```

4. Configure production environment:
   ```bash
   cp .env.example .env
   # Generate a cryptographically secure JWT secret
   sed -i "s/replace-with-a-secure-random-64-character-hex-string-for-production/$(openssl rand -hex 32)/" .env
   ```

5. Launch the application with Docker Compose:
   ```bash
   docker compose up -d
   ```

6. Verify container health:
   ```bash
   docker compose ps
   curl -I http://localhost:80/api/health
   ```

Your Hospital Management System is now live at `http://<YOUR-EC2-PUBLIC-IP>`!

---

## Option 2: Automated Deployment via EC2 User Data

If you prefer running natively with Systemd and Nginx without Docker, use the included bootstrap script.

1. When creating your EC2 instance in the AWS Console, expand **Advanced Details** at the bottom.
2. In the **User Data** field, paste the contents of [`deploy/ec2-user-data.sh`](ec2-user-data.sh).
3. Launch the instance.
4. Copy your project files to `/opt/hospital-management-system`:
   ```bash
   rsync -avz -e "ssh -i hospital-key.pem" --exclude '.git' --exclude 'data' ./ ubuntu@<YOUR-EC2-IP>:/opt/hospital-management-system/
   ```
5. SSH into the instance and start the hospital service:
   ```bash
   sudo chown -R hospital:hospital /opt/hospital-management-system
   sudo systemctl start hospital
   sudo systemctl enable hospital
   sudo systemctl status hospital
   ```

---

## Adding Free HTTPS / SSL with Let's Encrypt Certbot

Once your domain name (e.g. `hospital.yourdomain.com`) points to your EC2 Public IP address via Route 53:

1. Install Certbot on your EC2 instance:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. Obtain and install the SSL certificate:
   ```bash
   sudo certbot --nginx -d hospital.yourdomain.com
   ```

3. Certbot will automatically configure HTTPS on port 443 and setup automatic certificate renewal.

---

## Automated Database Backups to Amazon S3

To safeguard patient medical records and billing claims:

1. Create an S3 bucket in the same AWS region:
   ```bash
   aws s3 mb s3://my-hospital-backups-bucket --region us-east-1
   ```

2. Attach an IAM Role with `AmazonS3FullAccess` (or write permissions to the bucket) to your EC2 instance.

3. Make the backup script executable and test it:
   ```bash
   chmod +x deploy/backup-s3.sh
   export AWS_S3_BACKUP_BUCKET="my-hospital-backups-bucket"
   ./deploy/backup-s3.sh
   ```

4. Add a daily cron job at 2:00 AM:
   ```bash
   (crontab -l 2>/dev/null; echo "0 2 * * * AWS_S3_BACKUP_BUCKET=my-hospital-backups-bucket /opt/hospital-management-system/deploy/backup-s3.sh >> /var/log/hms_backup.log 2>&1") | crontab -
   ```

---

## Production Health & Monitoring

- **Healthcheck URL**: `GET /api/health`
  - Returns HTTP 200: `{"status":"UP","system":"Modular Hospital Management System","version":"1.0.0"}`
  - Compatible with AWS Application Load Balancer (ALB) health checks and Route 53 failover routing.
- **System Logs**:
  ```bash
  # Docker
  docker compose logs -f

  # Systemd
  sudo journalctl -u hospital -f
  ```

