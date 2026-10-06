# Glassofy Production Deployment & HTTPS Guide

This guide describes how to deploy Glassofy Architectural E-Commerce to production using Docker Compose, Nginx, Let's Encrypt SSL/TLS, and automated MongoDB backups.

---

## 1. Prerequisites

- A Linux Server (Ubuntu 22.04 LTS or Debian 12 recommended) with at least 2 vCPUs and 4GB RAM.
- A registered domain name (e.g., `glassofy.com`) with DNS A records pointing to your server's public IP:
  - `glassofy.com` -> `YOUR_SERVER_IP`
  - `www.glassofy.com` -> `YOUR_SERVER_IP`
- Docker Engine 24+ and Docker Compose v2.20+ installed.

---

## 2. Server Setup & Repository Clone

```bash
# Update package indices
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Clone the repository
git clone https://github.com/your-org/glassofy.git /opt/glassofy
cd /opt/glassofy
```

---

## 3. Configuring Production Environment

Create `.env.production` at the project root:

```bash
cp .env.example .env.production
nano .env.production
```

Ensure all passwords and cryptographic tokens are regenerated:
```bash
# Generate 256-bit secrets
openssl rand -hex 32 # for JWT_SECRET
openssl rand -hex 32 # for JWT_REFRESH_SECRET
openssl rand -base64 24 # for MONGO_ROOT_PASSWORD
```

---

## 4. HTTPS Setup with Let's Encrypt & Certbot

### Method A: Automated Certbot with Docker

1. Create Certbot directories:
   ```bash
   mkdir -p ./certbot/conf ./certbot/www
   ```

2. Request an initial certificate:
   ```bash
   docker run -it --rm --name certbot \
     -v "/opt/glassofy/certbot/conf:/etc/letsencrypt" \
     -v "/opt/glassofy/certbot/www:/var/www/certbot" \
     certbot/certbot certonly --webroot \
     --webroot-path=/var/www/certbot \
     --email admin@glassofy.com --agree-tos --no-eff-email \
     -d glassofy.com -d www.glassofy.com
   ```

3. Update `client/nginx.conf` to enable SSL termination on port 443:
   ```nginx
   server {
       listen 80;
       server_name glassofy.com www.glassofy.com;
       location /.well-known/acme-challenge/ {
           root /var/www/certbot;
       }
       location / {
           return 301 https://$host$request_uri;
       }
   }

   server {
       listen 443 ssl http2;
       server_name glassofy.com www.glassofy.com;

       ssl_certificate /etc/letsencrypt/live/glassofy.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/glassofy.com/privkey.pem;

       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ssl_prefer_server_ciphers on;

       # HSTS (Strict-Transport-Security)
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

       # [Remaining proxy locations for /, /api/, /images/, /sitemap.xml]
   }
   ```

4. Automated Certificate Renewal via Cron:
   ```bash
   # Add to crontab (crontab -e)
   0 3 * * * docker run --rm -v "/opt/glassofy/certbot/conf:/etc/letsencrypt" -v "/opt/glassofy/certbot/www:/var/www/certbot" certbot/certbot renew --quiet && docker exec glassofy-client-prod nginx -s reload
   ```

---

## 5. Launching Production Stack

```bash
# Build and launch background services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Inspect running containers
docker compose -f docker-compose.prod.yml ps

# Check API health status
curl -i http://localhost:5000/api/health
```

---

## 6. Automated MongoDB Backups

Set up daily automated backups with 14-day retention:

```bash
chmod +x ./scripts/backup-mongo.sh ./scripts/restore-mongo.sh

# Add to root crontab (crontab -e)
0 2 * * * /opt/glassofy/scripts/backup-mongo.sh >> /var/log/glassofy-backup.log 2>&1
```

To restore from a backup:
```bash
./scripts/restore-mongo.sh ./scripts/mongo-backups/glassofy_backup_YYYYMMDD_HHMMSS.gz
```

---

## 7. Zero-Downtime Deployment Updates

When deploying a new version:

```bash
git pull origin master
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps server
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps client
```
