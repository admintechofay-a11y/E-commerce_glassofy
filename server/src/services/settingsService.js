const Settings = require('../models/Settings');

const DEFAULT_SETTINGS = {
  stackingMode: 'best-of',
  gstRate: 0.18,
  freeShippingThreshold: 5000,
  flatShippingRate: 250,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_glassofy_mock',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_glassofy_mock',
};

/**
 * Get system pricing and store settings
 * @returns {Promise<Object>}
 */
const getPricingSettings = async () => {
  try {
    const settingDoc = await Settings.findOne({ key: 'pricing_settings' });
    if (settingDoc && settingDoc.value) {
      return { ...DEFAULT_SETTINGS, ...settingDoc.value };
    }
  } catch (err) {
    console.error('Error fetching pricing settings, using defaults:', err.message);
  }
  return { ...DEFAULT_SETTINGS };
};

module.exports = {
  DEFAULT_SETTINGS,
  getPricingSettings,
};
