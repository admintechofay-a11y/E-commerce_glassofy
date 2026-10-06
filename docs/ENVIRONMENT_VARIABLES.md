# Glassofy Environment Variable Guide

This document describes all environment variables used across the Glassofy Monorepo (`/server` and `/client`).

---

## 1. Backend (`/server/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5000` | Port for Express HTTP server to listen on. |
| `NODE_ENV` | Yes | `development` | Runtime environment (`development`, `production`, `test`). |
| `CLIENT_URL` | Yes | `http://localhost:3000` | Storefront origin URL permitted by CORS & Helmet CSP. |
| `MONGO_URI` | Yes | `mongodb://localhost:27017/glassofy` | MongoDB connection connection string (with authentication in production). |
| `JWT_SECRET` | **YES** | - | Cryptographic secret used to sign HS256 access tokens (minimum 32 characters). |
| `JWT_EXPIRE` | No | `1d` | Access token lifespan (e.g., `1d`, `12h`). |
| `JWT_REFRESH_SECRET` | **YES** | - | Cryptographic secret for signing long-lived refresh tokens. |
| `JWT_REFRESH_EXPIRE` | No | `7d` | Refresh token lifespan (e.g., `7d`, `30d`). |
| `ADMIN_NAME` | No | `Glassofy Admin` | Default admin name seeded on first start. |
| `ADMIN_EMAIL` | No | `admin@glassofy.com` | Default admin login email address. |
| `ADMIN_PASSWORD` | **YES** | `AdminSecurePassword123!` | Default admin password seeded on first start. Must be changed in production. |
| `ADMIN_MOBILE` | No | `9876543210` | Default admin mobile number. |
| `RAZORPAY_KEY_ID` | No | `rzp_test_...` | Razorpay API key ID for test/live payment gateway. |
| `RAZORPAY_KEY_SECRET` | No | - | Razorpay API secret key for HMAC signature verification. |
| `WHATSAPP_PHONE_NUMBER_ID` | No | - | Meta WhatsApp Cloud API Phone Number ID. |
| `WHATSAPP_ACCESS_TOKEN` | No | - | Permanent system user token from Meta Business Manager. |
| `WHATSAPP_VERIFY_TOKEN` | No | `glassofy_webhook_verify_token_2026` | Webhook verification handshake token. |
| `WHATSAPP_APP_SECRET` | No | `glassofy_meta_app_secret_2026` | Meta App Secret for `X-Hub-Signature-256` payload verification. |
| `WHATSAPP_MOCK` | No | `true` (in dev/test) | Set to `false` in production for live Meta Graph API calls. |
| `EMAIL_HOST` | No | `smtp.ethereal.email` | SMTP host for password reset and notifications. |
| `EMAIL_PORT` | No | `587` | SMTP port (typically 587 for TLS, 465 for SSL). |
| `EMAIL_USER` | No | - | SMTP authentication username. |
| `EMAIL_PASS` | No | - | SMTP authentication password. |

---

## 2. Generating Strong Cryptographic Secrets

Generate 256-bit cryptographic keys using Node.js or OpenSSL:

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or with OpenSSL
openssl rand -hex 32
```

---

## 3. Frontend (`/client/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | `/api` | Base URL prefix for backend REST API calls. In Docker production, requests route through Nginx reverse proxy. |

---

## 4. Production Docker Compose (`docker-compose.prod.yml`)

When running in production with `docker compose -f docker-compose.prod.yml up -d`, provide a `.env.production` file at the root containing:

```env
MONGO_ROOT_USER=glassofy_admin
MONGO_ROOT_PASSWORD=SUPER_STRONG_DATABASE_PASSWORD_2026!
MONGO_DB=glassofy
CLIENT_URL=https://glassofy.com
JWT_SECRET=YOUR_64_CHAR_HEX_ACCESS_SECRET
JWT_REFRESH_SECRET=YOUR_64_CHAR_HEX_REFRESH_SECRET
ADMIN_EMAIL=security@glassofy.com
ADMIN_PASSWORD=COMPLEX_PRODUCTION_PASSWORD!
ADMIN_MOBILE=919876543210
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=live_secret_...
WHATSAPP_MOCK=false
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_ACCESS_TOKEN=EAAG...
WHATSAPP_APP_SECRET=abc123...
WHATSAPP_VERIFY_TOKEN=glassofy_prod_token_...
```
