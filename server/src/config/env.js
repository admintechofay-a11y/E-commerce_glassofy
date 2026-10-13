const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isLocalhost = (uri) =>
  !uri || uri.includes('localhost') || uri.includes('127.0.0.1');

const atlasFallback =
  'mongodb+srv://admintechofay_db_user:ADmin2026tech@cluster0.7dvyd9j.mongodb.net/glassofy?retryWrites=true&w=majority&appName=Cluster0';

const isProductionOrVercel =
  process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

let resolvedMongoUri = process.env.MONGO_URI;

if (
  !resolvedMongoUri ||
  resolvedMongoUri.includes('<') ||
  resolvedMongoUri.includes('xxxxx') ||
  (isProductionOrVercel && isLocalhost(resolvedMongoUri))
) {
  resolvedMongoUri = atlasFallback;
}

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'https://e-commerceglassofy.vercel.app',
  MONGO_URI: resolvedMongoUri,
  JWT_SECRET:
    process.env.JWT_SECRET || 'glassofy_dev_jwt_secret_key_minimum_32_characters_long_2026',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '1d',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'glassofy_dev_refresh_secret_key_minimum_32_chars_2026',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Glassofy Admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@glassofy.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecurePassword123!',
  ADMIN_MOBILE: process.env.ADMIN_MOBILE || '9876543210',

  // WhatsApp Meta Cloud API Configuration
  WHATSAPP_VERIFY_TOKEN:
    process.env.WHATSAPP_VERIFY_TOKEN || 'glassofy_wa_verify_token_secure_2026',
  WHATSAPP_APP_SECRET:
    process.env.WHATSAPP_APP_SECRET || 'glassofy_wa_app_secret_dev_32char_key',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  WHATSAPP_MOCK:
    process.env.WHATSAPP_MOCK === 'true' ||
    process.env.NODE_ENV === 'test' ||
    !process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_NOTIFY_EMAIL:
    process.env.WHATSAPP_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || 'admin@glassofy.com',
};
