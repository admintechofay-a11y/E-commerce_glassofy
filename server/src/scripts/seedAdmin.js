const mongoose = require('mongoose');
const {
  MONGO_URI,
  ADMIN_NAME,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_MOBILE,
} = require('../config/env');
const { User, WhatsappWhitelist } = require('../models');

const seedAdmin = async () => {
  try {
    console.log('[Seed Admin] Connecting to database...');
    await mongoose.connect(MONGO_URI);

    const email = ADMIN_EMAIL.toLowerCase().trim();
    let admin = await User.findOne({ email }).select('+password');

    if (admin) {
      console.log(`[Seed Admin] Admin user '${email}' already exists. Ensuring ADMIN role...`);
      admin.role = 'ADMIN';
      admin.isActive = true;
      admin.fullName = ADMIN_NAME;
      admin.mobile = ADMIN_MOBILE;
      if (ADMIN_PASSWORD) {
        admin.password = ADMIN_PASSWORD;
      }
      await admin.save();
      console.log('[Seed Admin] Admin user updated successfully.');
    } else {
      console.log(`[Seed Admin] Creating new Admin user: '${email}'...`);
      admin = await User.create({
        fullName: ADMIN_NAME,
        email,
        mobile: ADMIN_MOBILE,
        password: ADMIN_PASSWORD,
        role: 'ADMIN',
        isActive: true,
        businessName: 'Glassofy Corporate',
        address: {
          line1: 'Corporate Headquarters',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      });
      console.log(`[Seed Admin] Admin user created with ID: ${admin._id}`);
    }

    // Ensure default test/mock WhatsApp sender is whitelisted
    const defaultMobile = '919876543210';
    let whitelistEntry = await WhatsappWhitelist.findOne({ mobile: defaultMobile });
    if (!whitelistEntry) {
      console.log(`[Seed Admin] Whitelisting default WhatsApp contact: ${defaultMobile}...`);
      await WhatsappWhitelist.create({
        mobile: defaultMobile,
        name: 'Rohan Sharma (Lead Fabricator)',
        label: 'Lead Fabricator',
        businessName: 'Sharma Glass & Architectural Hardware',
        approvedBy: admin._id,
        isActive: true,
      });
      console.log('[Seed Admin] Default WhatsApp contact whitelisted successfully.');
    } else {
      whitelistEntry.isActive = true;
      whitelistEntry.approvedBy = admin._id;
      await whitelistEntry.save();
      console.log(`[Seed Admin] WhatsApp contact ${defaultMobile} verified active.`);
    }

    console.log('==============================================');
    console.log('  GLASSOFY ADMIN CREDENTIALS');
    console.log('==============================================');
    console.log(`  Email    : ${admin.email}`);
    console.log(`  Role     : ${admin.role}`);
    console.log(`  Full Name: ${admin.fullName}`);
    console.log(`  WhatsApp : ${defaultMobile} (Whitelisted)`);
    console.log('==============================================');

    await mongoose.disconnect();
    console.log('[Seed Admin] Database disconnected. Seeding completed.');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Admin Error] Failed to seed admin: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
