# Glassofy - WhatsApp Cloud API Automation & Setup Guide

This guide provides step-by-step instructions to configure Meta Cloud API, secure webhooks, set up ngrok tunneling for local development, and test the catalogue ingestion pipeline with or without live Meta credentials.

---

## 1. Architecture & Workflow Overview

Glassofy enables authorized fabricators, glazing contractors, and architectural consultants to upload catalogue items directly via WhatsApp by sending a product photo with a pipe-delimited caption:

```text
Name | Code | Category | Finish | Price | Stock | Description
```

### Ingestion Lifecycle:
1. **Meta Webhook Handshake (`GET /api/whatsapp/webhook`)**: Meta verifies ownership with `hub.mode`, `hub.verify_token`, and `hub.challenge`.
2. **Payload Delivery & Fast 200 (`POST /api/whatsapp/webhook`)**: 
   - Server verifies the `X-Hub-Signature-256` HMAC-SHA256 signature using the raw request body and `WHATSAPP_APP_SECRET`.
   - Returns HTTP `200 EVENT_RECEIVED` immediately to satisfy Meta's SLA.
3. **Idempotency Guard**: Every incoming `messageId` (e.g., `wamid.HBgLOTE...`) is recorded. Duplicate payloads are ignored automatically.
4. **Security Whitelist Enforcement**: Only senders registered in `WhatsappWhitelist` are permitted. Unknown numbers receive an automated polite alert.
5. **Media Download**: Product photos are fetched from Meta Graph API (or simulated in mock mode) and saved to `/public/images/whatsapp/`.
6. **Tolerant Zod Caption Parsing**: Parses fields, strips whitespace, defaults missing optional fields, and validates data types.
7. **Draft Creation**: Product is created with `status: 'DRAFT'`, `source: 'whatsapp'`, and `isPublished: false`.
8. **Automated WhatsApp Confirmation**: The sender receives an immediate WhatsApp reply:
   ```text
   Received. Draft created: Shower Hinge 90 (ID: 67123...)
   Admin review link: http://localhost:3000/admin/products?search=SH-90-CP
   ```
9. **Admin Review & 1-Click Publishing**: The store admin opens `/admin/whatsapp-inbox`, verifies the photo and specs, and clicks **Publish to Store**, making the product immediately visible on the storefront.

---

## 2. Meta Cloud API Setup (Live Production / Sandbox)

### Step 1: Create a Meta for Developers Account & App
1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in.
2. Click **My Apps** > **Create App**.
3. Choose **Other** as the use case, then select **Business** as the app type.
4. Set an App Display Name (e.g., `Glassofy Hardware Bot`) and select your Meta Business Account.
5. Click **Create App**.

### Step 2: Add WhatsApp to Your App
1. On the App Dashboard, scroll to **Add products to your app**.
2. Locate **WhatsApp** and click **Set up**.
3. In the left sidebar, navigate to **WhatsApp** > **API Setup**.
4. You will see:
   - **Temporary access token** (valid for 24 hours)
   - **Phone number ID** (e.g., `100609346426457`)
   - **WhatsApp Business Account ID** (e.g., `101827364521098`)
   - A test "From" phone number and a field to send test messages.

### Step 3: Generate a Permanent System User Token
For continuous server operation, generate a permanent access token:
1. Open [business.facebook.com/settings](https://business.facebook.com/settings).
2. Go to **Users** > **System Users**.
3. Click **Add**, name the user (e.g., `glassofy-api-user`), and select role **Admin**.
4. Click **Add Assets** > assign your WhatsApp Business Account with **Full Control**.
5. Click **Generate New Token**, select your app, and check the following permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Copy the generated token immediately and store it as `WHATSAPP_ACCESS_TOKEN`.

### Step 4: Retrieve App Secret for Signature Verification
1. On the Meta Developer portal, go to **App Settings** > **Basic**.
2. Click **Show** next to **App Secret**.
3. Copy this secret and save it as `WHATSAPP_APP_SECRET`.

---

## 3. Local Webhook Tunneling with ngrok

Because Meta requires a publicly accessible HTTPS URL to deliver webhook events, use `ngrok` during local development:

### Step 1: Install & Authenticate ngrok
```bash
# If not already installed:
npm install -g ngrok
# or download from https://ngrok.com/download

# Authenticate with your ngrok token:
ngrok config add-authtoken <YOUR_NGROK_AUTH_TOKEN>
```

### Step 2: Start Glassofy Server & Tunnel
1. Start the Express server on port 5000:
   ```bash
   npm run dev --prefix server
   ```
2. In a separate terminal, launch the ngrok tunnel:
   ```bash
   ngrok http 5000
   ```
3. Copy the **Forwarding** HTTPS URL provided by ngrok (e.g., `https://a1b2-2405-201.ngrok-free.app`).

### Step 3: Configure Webhook in Meta Dashboard
1. On the Meta Developer portal, go to **WhatsApp** > **Configuration**.
2. Beside **Webhook**, click **Edit**.
3. Fill in:
   - **Callback URL**: `https://<YOUR_NGROK_DOMAIN>/api/whatsapp/webhook`
   - **Verify Token**: Must match `WHATSAPP_VERIFY_TOKEN` in your `.env` (e.g., `glassofy_wa_verify_token_secure_2026`).
4. Click **Verify and Save**. Meta will send a GET request to `/api/whatsapp/webhook`. Your server responds with `hub.challenge` and the status changes to verified.
5. Under **Webhook fields**, click **Manage** and click **Subscribe** on the **`messages`** row.

---

## 4. Environment Variables Reference

Add the following variables to your `server/.env` file:

```env
# ====================================================
# WhatsApp Meta Cloud API Configuration
# ====================================================
WHATSAPP_VERIFY_TOKEN=glassofy_wa_verify_token_secure_2026
WHATSAPP_APP_SECRET=your_32_character_meta_app_secret
WHATSAPP_ACCESS_TOKEN=EAAG...your_permanent_system_user_token
WHATSAPP_PHONE_NUMBER_ID=100609346426457
WHATSAPP_BUSINESS_ACCOUNT_ID=101827364521098

# Set to true to test without live Meta credentials
WHATSAPP_MOCK=false

# Email destination for new WhatsApp draft notifications
WHATSAPP_NOTIFY_EMAIL=admin@glassofy.com
```

---

## 5. Caption Format & Parser Syntax

When an authorized user sends an image message on WhatsApp, the caption is parsed with the following pipe-delimited format:

```text
Name | Code | Category | Finish | Price | Stock | Description
```

### Field Rules & Defaults:
| Field | Required? | Type | Default if Omitted | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Name** | **Yes** | String (min 2 chars) | — | `Shower Hinge 90 Deg` |
| **Code** | No | String | Auto-generated (`SHOWER-H-12345`) | `SH-90-CP` |
| **Category** | No | String | `Architectural Hardware` | `Shower Hinges` |
| **Finish** | No | String | `CP` (Chrome Plated) | `CP`, `SS`, `BM` |
| **Price** | **Yes** | Number (> 0) | — | `1250` or `₹1,250` |
| **Stock** | No | Integer (>= 0) | `50` | `100` |
| **Description**| No | String | Auto-generated summary | `Brass heavy-duty glass-to-wall hinge` |

### Valid Caption Examples:
- **Full 7-Part**:
  `Shower Hinge 90 | SH-90-CP | Shower Hinges | CP | 1250 | 50 | Heavy duty brass 90 deg glass hinge`
- **6-Part (Omit Description)**:
  `Patch Fitting Top | PF-701-SS | Patch Fittings | SS | 850 | 100`
- **5-Part (Omit Stock & Description)**:
  `Floor Spring 1000 | FS-1000 | Floor Springs | Satin | 3400`
- **Minimal (Name & Price)**:
  `Spider Fitting 4-Way | 2400`

---

## 6. Testing Without Meta Credentials (Mock Mode)

Glassofy includes built-in mock mode to test the complete ingestion flow locally without a Meta account or ngrok tunnel.

### Option A: From Admin UI (Recommended)
1. Open the Admin Panel at `http://localhost:3000/admin/whatsapp-inbox`.
2. Click the **Simulate Message (Mock)** button in the top right.
3. Keep the whitelisted mobile number (`919876543210`) or add your own in `/admin/whatsapp-whitelist`.
4. Enter or adjust the caption and click **Ingest Mock Message**.
5. The message appears instantly in the inbox as `DRAFT CREATED`.
6. Inspect the thumbnail and specs, then click **Publish to Store** to push it live!

### Option B: Via cURL / HTTP
```bash
curl -X POST http://localhost:5000/api/whatsapp/mock \
  -H "Content-Type: application/json" \
  -d '{
    "from": "919876543210",
    "senderName": "Rohan Sharma (Lead Fabricator)",
    "caption": "Shower Hinge 90 | SH-90-CP | Shower Hinges | CP | 1250 | 50 | Heavy brass 90 deg glass-to-wall hinge",
    "messageType": "image"
  }'
```

---

## 7. Security & Admin Operations

### Whitelist Management (`/admin/whatsapp-whitelist`)
- Only senders registered in the Whitelist can create catalogue drafts.
- Non-whitelisted senders receive an automated response explaining they are not authorized.
- Admins can pause or delete phone numbers at any time with full audit logging.

### WhatsApp Inbox (`/admin/whatsapp-inbox`)
- **Status Badges**:
  - `DRAFT_CREATED`: Ready for review and publishing.
  - `PUBLISHED`: Made live in store; direct link to storefront page available.
  - `REJECTED`: Rejected submission with archived product.
  - `FAILED`: Malformed caption or non-image message.
  - `IGNORED`: Submission from non-whitelisted sender.
- **One-Click Publishing**: Instantly sets `Product.status = 'PUBLISHED'` and `isPublished = true`.
- **Product Editor Link**: Open any draft directly in the full admin product editor to adjust variants, bulk tiers, or SEO metadata.
