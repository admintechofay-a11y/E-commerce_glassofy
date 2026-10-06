const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGO_URI } = require('../config/env');
const { User, Category, Product, Coupon, DiscountRule, Settings } = require('../models');

// Helper to create URL-friendly slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const CATEGORIES_DATA = [
  {
    name: 'Shower Hinges & Enclosures',
    slug: 'shower-hinges',
    description:
      'Heavy-duty solid brass 90°, 180°, and 135° shower enclosure hinges with synthetic gaskets.',
    image: '/images/page_005_prod_01_Brass-D_Bracke.jpg',
    displayOrder: 1,
  },
  {
    name: 'Brackets & Clamps',
    slug: 'brackets-and-clamps',
    description:
      'Precision CNC-machined architectural F-brackets, D-brackets, and partition glass clamps.',
    image: '/images/page_005_prod_02_Brass-U_Bracke.jpg',
    displayOrder: 2,
  },
  {
    name: 'Bullet Studs & Floor Pivots',
    slug: 'bullet-studs-and-pivots',
    description:
      'Solid brass and SS 304 bullet glass studs, standoff pins, and floor-mounted pivot bearings.',
    image: '/images/page_012_prod_01_Bullet_Stud.jpg',
    displayOrder: 3,
  },
  {
    name: 'Sliding & Folding Systems',
    slug: 'sliding-systems',
    description:
      'Heavy duty architectural sliding glass door rollers, folding partition kits, and bottom guides.',
    image: '/images/page_020_prod_01_Sliding_Kit.jpg',
    displayOrder: 4,
  },
  {
    name: 'Spider Fittings & Canopies',
    slug: 'spider-fittings',
    description:
      'Point-fixed architectural glass spiders, articulated routels, and structural canopy fittings.',
    image: '/images/page_015_prod_01_Spider_Fit.jpg',
    displayOrder: 5,
  },
  {
    name: 'Locks & Architectural Handles',
    slug: 'locks-and-handles',
    description:
      'Glass door patch locks, strike boxes, digital access locks, and premium brass pull handles.',
    image: '/images/page_008_prod_01_Patch_Lock.jpg',
    displayOrder: 6,
  },
  {
    name: 'Architectural Hardware & Fittings',
    slug: 'architectural-fittings',
    description:
      'General architectural glass connectors, fasteners, seals, and bespoke hardware accessories.',
    image: '/images/page_006_prod_01_Glass_Connec.jpg',
    displayOrder: 7,
  },
];

const DEMO_USERS = [
  // 2 Admins
  {
    fullName: 'Glassofy Super Admin',
    email: 'admin@glassofy.com',
    mobile: '9876543210',
    role: 'ADMIN',
    businessName: 'Glassofy Hardware HQ',
    gstNumber: '07AAAAA0000A1Z5',
    address: {
      line1: 'Sector 62, Phase II',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
    },
  },
  {
    fullName: 'Operations Admin',
    email: 'ops@glassofy.com',
    mobile: '9876543211',
    role: 'ADMIN',
    businessName: 'Glassofy Operations & Logistics',
    gstNumber: '07AAAAA0000A1Z5',
    address: {
      line1: 'Okhla Industrial Area Phase I',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110020',
    },
  },
  // 10 B2B Commercial & Trade Clients
  {
    fullName: 'Rajesh Mehta',
    email: 'rajesh@mehtainteriors.in',
    mobile: '9811223344',
    role: 'USER',
    businessName: 'Mehta Luxury Interiors LLP',
    gstNumber: '27AABCM1234A1Z1',
    address: {
      line1: '14 Lower Parel Tech Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400013',
    },
  },
  {
    fullName: 'Ananya Deshmukh',
    email: 'ananya@studiovista.com',
    mobile: '9822334455',
    role: 'USER',
    businessName: 'Studio Vista Architects',
    gstNumber: '29AABCS5678B1Z2',
    address: {
      line1: '82 Indiranagar 100ft Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
    },
  },
  {
    fullName: 'Vikram Singhania',
    email: 'vikram@glazetech.in',
    mobile: '9833445566',
    role: 'USER',
    businessName: 'GlazeTech Facade Engineering',
    gstNumber: '06AABCG9101C1Z3',
    address: {
      line1: 'Udyog Vihar Phase 4',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122016',
    },
  },
  {
    fullName: 'Kavita Nair',
    email: 'kavita@urbanspaces.co',
    mobile: '9844556677',
    role: 'USER',
    businessName: 'Urban Spaces Interior Design',
    gstNumber: '32AABCU2345D1Z4',
    address: { line1: 'MG Road Marine Drive', city: 'Kochi', state: 'Kerala', pincode: '682011' },
  },
  {
    fullName: 'Arun Patel',
    email: 'arun@patelglazing.com',
    mobile: '9855667788',
    role: 'USER',
    businessName: 'Patel Glass & Hardware Mart',
    gstNumber: '24AABCP6789E1Z5',
    address: {
      line1: 'SG Highway Titanium City',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
    },
  },
  {
    fullName: 'Sunita Rao',
    email: 'sunita@apexbuildcon.in',
    mobile: '9866778899',
    role: 'USER',
    businessName: 'Apex Buildcon Projects',
    gstNumber: '36AABCA0123F1Z6',
    address: {
      line1: 'Banjara Hills Road No 12',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500034',
    },
  },
  {
    fullName: 'Manish Verma',
    email: 'manish@vermahardware.com',
    mobile: '9877889900',
    role: 'USER',
    businessName: 'Verma Brothers Architectural Hardware',
    gstNumber: '09AABCV4567G1Z7',
    address: {
      line1: 'Civil Lines Near Court',
      city: 'Kanpur',
      state: 'Uttar Pradesh',
      pincode: '208001',
    },
  },
  {
    fullName: 'Pooja Bhatt',
    email: 'pooja@zenithdesigns.in',
    mobile: '9888990011',
    role: 'USER',
    businessName: 'Zenith Design Studio',
    gstNumber: '19AABCZ8901H1Z8',
    address: {
      line1: 'Salt Lake Sector 5',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700091',
    },
  },
  {
    fullName: 'Deepak Chopra',
    email: 'deepak@spectrumfacades.com',
    mobile: '9899001122',
    role: 'USER',
    businessName: 'Spectrum Glass Facades',
    gstNumber: '08AABCS2345I1Z9',
    address: {
      line1: 'Tonk Road Industrial Area',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302015',
    },
  },
  {
    fullName: 'Sneha Kulkarni',
    email: 'sneha@kulkarniarchitects.com',
    mobile: '9812345678',
    role: 'USER',
    businessName: 'Kulkarni & Associates Architecture',
    gstNumber: '27AABCK6789J1ZA',
    address: {
      line1: 'Prabhat Road Deccan Gymkhana',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411004',
    },
  },
  // 8 Retail / Individual Customers
  {
    fullName: 'Aditya Roy',
    email: 'aditya.roy@gmail.com',
    mobile: '9823456789',
    role: 'USER',
    businessName: '',
    gstNumber: '',
    address: {
      line1: 'Flat 402, Skyline Towers',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
    },
  },
  {
    fullName: 'Neha Bansal',
    email: 'neha.bansal@gmail.com',
    mobile: '9834567890',
    role: 'USER',
    businessName: '',
    gstNumber: '',
    address: {
      line1: 'House 14, Greater Kailash 1',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110048',
    },
  },
  {
    fullName: 'Rohan Joshi',
    email: 'rohan.j@yahoo.com',
    mobile: '9845678901',
    role: 'USER',
    businessName: '',
    gstNumber: '',
    address: {
      line1: 'Villa 7, Palm Meadows',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560066',
    },
  },
  {
    fullName: 'Priyanka Sen',
    email: 'priyanka.sen@outlook.com',
    mobile: '9856789012',
    role: 'USER',
    businessName: '',
    gstNumber: '',
    address: {
      line1: '28 Southern Avenue',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700029',
    },
  },
  {
    fullName: 'Karthik Raja',
    email: 'karthik.raja@gmail.com',
    mobile: '9867890123',
    role: 'USER',
    businessName: '',
    gstNumber: '',
    address: {
      line1: '12 Boat Club Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600028',
    },
  },
  {
    fullName: 'Shweta Goyal',
    email: 'shweta.goyal@hotmail.com',
    mobile: '9878901234',
    role: 'USER',
    businessName: '',
    gstNumber: '',
    address: { line1: 'Sector 9-D', city: 'Chandigarh', state: 'Punjab', pincode: '160009' },
  },
  {
    fullName: 'Varun Bhatia',
    email: 'varun.bhatia@gmail.com',
    mobile: '9889012345',
    role: 'USER',
    businessName: '',
    gstNumber: '',
    address: { line1: 'Alkapuri Society', city: 'Vadodara', state: 'Gujarat', pincode: '390007' },
  },
  {
    fullName: 'Tanvi Kapoor',
    email: 'tanvi.kapoor@gmail.com',
    mobile: '9890123456',
    role: 'USER',
    businessName: '',
    gstNumber: '',
    address: {
      line1: 'Jubilee Hills Check Post',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500033',
    },
  },
];

const assignCategorySlug = (itemText = '') => {
  const text = itemText.toLowerCase();
  if (/shower|hinge|cubicle/i.test(text)) return 'shower-hinges';
  if (/bracket|clamp|clip|connector/i.test(text)) return 'brackets-and-clamps';
  if (/stud|standoff|pivot|floor|closer/i.test(text)) return 'bullet-studs-and-pivots';
  if (/sliding|roller|folding|track/i.test(text)) return 'sliding-systems';
  if (/spider|canopy|routel|railing/i.test(text)) return 'spider-fittings';
  if (/lock|handle|pull|patch|lever/i.test(text)) return 'locks-and-handles';
  return 'architectural-fittings';
};

const cleanItemTitle = (rawItem = '') => {
  return rawItem
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parsePriceFromString = (mrpStr) => {
  if (!mrpStr) return 250;
  const match = mrpStr.toString().match(/\b(\d{2,6})\b/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 250;
};

const seedDatabase = async () => {
  try {
    console.log('--- Starting Glassofy Idempotent Database Seed ---');
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Database connection established.');

    // 1. Seed Categories (Idempotent upsert)
    console.log('[Seed] Upserting Categories...');
    const categoryMap = {}; // slug -> ObjectId
    for (const catData of CATEGORIES_DATA) {
      const category = await Category.findOneAndUpdate(
        { slug: catData.slug },
        { $set: catData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      categoryMap[catData.slug] = category._id;
    }
    console.log(`[Seed] Seeded ${Object.keys(categoryMap).length} categories.`);

    // 2. Seed 20 Demo Users (Idempotent upsert)
    console.log('[Seed] Upserting 20 Demo Users...');
    const hashedPassword = await bcrypt.hash('GlassofyDemo2026!', 10);
    let usersCount = 0;
    for (const userData of DEMO_USERS) {
      await User.findOneAndUpdate(
        { email: userData.email.toLowerCase() },
        {
          $set: {
            ...userData,
            email: userData.email.toLowerCase(),
            password: hashedPassword,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      usersCount++;
    }
    console.log(
      `[Seed] Successfully seeded ${usersCount} demo users (Default password: GlassofyDemo2026!).`
    );

    // 3. Read products.json and Seed Products
    const productsJsonPath = path.resolve(__dirname, '../../data/products.json');
    if (!fs.existsSync(productsJsonPath)) {
      console.error(`[Seed Error] File not found: ${productsJsonPath}`);
      process.exit(1);
    }

    const rawProducts = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
    console.log(`[Seed] Found ${rawProducts.length} raw catalogue entries in ${productsJsonPath}.`);

    let seededProducts = 0;
    const seenSlugs = new Set();

    // Clean up all existing products for fresh catalogue sync
    console.log('[Seed] Clearing old product catalogue records...');
    await Product.deleteMany({});

    for (let i = 0; i < rawProducts.length; i++) {
      const raw = rawProducts[i];
      const pageNum = raw.page || 5;

      // Filter out cover pages, Table of Contents, and fragmented OCR noise
      if (
        pageNum <= 4 ||
        (raw.page === 30 && !raw.code) ||
        !raw.item ||
        raw.item.trim().length < 3 ||
        raw.item === 'PRODUCT' ||
        raw.item === 'Exclusive Hardware Products' ||
        raw.item === 'INDEX' ||
        raw.item.includes('FLOORSPRING&DOORCLOSER') ||
        raw.item.includes('CURTAINFITTING') ||
        raw.item.includes('ROUTELS') ||
        raw.item.includes('FINPLATESANDSPICEPLATES')
      ) {
        continue;
      }

      const itemTitle = cleanItemTitle(raw.item || `Architectural Fitting ${i + 1}`);

      // Generate consistent unique code and slug
      const code = raw.code ? raw.code.trim() : `GLAS-${raw.id || `P${i + 1}`}`;
      let baseSlug = slugify(`${itemTitle}-${code}`);
      if (seenSlugs.has(baseSlug)) {
        baseSlug = `${baseSlug}-${i + 1}`;
      }
      seenSlugs.add(baseSlug);

      const categorySlug = assignCategorySlug(raw.item);
      const categoryId = categoryMap[categorySlug] || categoryMap['architectural-fittings'];

      const finish = raw.finish ? raw.finish.trim().toUpperCase() : 'BRASS';

      // Parse price variants
      let variants = [];
      if (
        raw.price_variants &&
        Array.isArray(raw.price_variants) &&
        raw.price_variants.length > 0
      ) {
        variants = raw.price_variants.map((v, vIdx) => {
          const vPrice = v.price || parsePriceFromString(raw.mrp);
          return {
            sku: `${code}-${vIdx + 1}`,
            size: v.size || 'Standard',
            finish,
            price: vPrice,
            mrp: Math.round(vPrice * 1.3),
            stock: 100,
            bulkPricing: [
              { minQty: 10, discountPercentage: 5 },
              { minQty: 25, discountPercentage: 10 },
              { minQty: 50, discountPercentage: 15 },
            ],
            isActive: true,
          };
        });
      } else {
        const parsedPrice = parsePriceFromString(raw.mrp);
        variants = [
          {
            sku: `${code}-STD`,
            size: 'Standard',
            finish,
            price: parsedPrice,
            mrp: Math.round(parsedPrice * 1.3),
            stock: 100,
            bulkPricing: [
              { minQty: 10, discountPercentage: 5 },
              { minQty: 25, discountPercentage: 10 },
              { minQty: 50, discountPercentage: 15 },
            ],
            isActive: true,
          },
        ];
      }

      const minPrice = Math.min(...variants.map((v) => v.price));
      const minMrp = Math.min(...variants.map((v) => v.mrp));

      // Construct image paths
      const images = [];
      if (raw.photo) {
        images.push(`/${raw.photo}`);
      }

      // Curate featured flagship items with genuine, verified product photography
      const isFeatured =
        pageNum === 5 ||
        code === 'QFS-111' ||
        code === 'QD-300' ||
        code === 'QW-SF-220' ||
        code === 'QW-SF-224' ||
        itemTitle.toLowerCase().includes('bullet stud') ||
        itemTitle.toLowerCase().includes('solid glass stud');

      const productPayload = {
        name: itemTitle,
        title: itemTitle,
        slug: baseSlug,
        code,
        description: `Precision-engineered architectural grade ${itemTitle}. Designed for heavy-duty commercial installations and luxury residential architecture. Manufactured to exact tolerances with corrosion-resistant metallurgy.`,
        category: categoryId,
        finish,
        images,
        basePrice: minPrice,
        baseMrp: minMrp,
        variants,
        page: pageNum,
        displayOrder: i,
        bulkPricing: [
          { minQty: 10, discountPercentage: 5 },
          { minQty: 25, discountPercentage: 10 },
          { minQty: 50, discountPercentage: 15 },
        ],
        status: 'PUBLISHED',
        isPublished: true,
        isActive: true,
        isFeatured: Boolean(isFeatured),
        tags: [finish.toLowerCase(), categorySlug, 'architectural', 'heavy-duty', 'glass-fitting'],
        specifications: {
          Material: finish.includes('BRASS') ? 'Forged Brass' : 'SS 304 Stainless Steel',
          Finish: finish,
          'Glass Compatibility': '8mm / 10mm / 12mm Toughened Glass',
          Warranty: '5 Year Architectural Warranty',
          'Catalog Page': `Page ${pageNum}`,
        },
      };

      await Product.findOneAndUpdate(
        { code },
        { $set: productPayload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      seededProducts++;
    }

    console.log(`[Seed] Seeded ${seededProducts} architectural products with variants.`);

    // Seed System Pricing Settings
    await Settings.findOneAndUpdate(
      { key: 'pricing_settings' },
      {
        $set: {
          key: 'pricing_settings',
          value: {
            stackingMode: 'best-of',
            gstRate: 0.18,
            freeShippingThreshold: 5000,
            flatShippingRate: 250,
            razorpayKeyId: 'rzp_test_mock_glassofy',
            razorpayKeySecret: 'rzp_mock_secret',
          },
          description: 'Store pricing rules, GST, shipping rates, and stacking modes',
          category: 'PRICING',
          isPublic: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('[Seed] Seeded system pricing settings.');

    // Seed DiscountRules (Cart-Total Volume Tiers)
    const DISCOUNT_RULES = [
      {
        name: 'Volume Tier 1 (5% off orders ₹5,000+)',
        ruleType: 'CART_TOTAL',
        conditions: { minAmount: 5000 },
        discountPercentage: 5,
        priority: 1,
        isActive: true,
      },
      {
        name: 'Volume Tier 2 (10% off orders ₹15,000+)',
        ruleType: 'CART_TOTAL',
        conditions: { minAmount: 15000 },
        discountPercentage: 10,
        priority: 2,
        isActive: true,
      },
      {
        name: 'Volume Tier 3 (15% off orders ₹50,000+)',
        ruleType: 'CART_TOTAL',
        conditions: { minAmount: 50000 },
        discountPercentage: 15,
        priority: 3,
        isActive: true,
      },
    ];

    for (const rule of DISCOUNT_RULES) {
      await DiscountRule.findOneAndUpdate(
        { name: rule.name },
        { $set: rule },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`[Seed] Seeded ${DISCOUNT_RULES.length} cart volume discount rules.`);

    // Seed Coupons
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const COUPONS = [
      {
        code: 'WELCOME10',
        description: '10% discount on your first order above ₹1,000 (Max ₹1,000)',
        discountType: 'PERCENTAGE',
        discountAmount: 10,
        minOrderAmount: 1000,
        maxDiscountAmount: 1000,
        endDate: oneYearFromNow,
        usageLimit: 1000,
        perUserLimit: 1,
        isActive: true,
      },
      {
        code: 'FLAT500',
        description: 'Flat ₹500 off on orders above ₹3,000',
        discountType: 'FLAT',
        discountAmount: 500,
        minOrderAmount: 3000,
        endDate: oneYearFromNow,
        usageLimit: 500,
        perUserLimit: 2,
        isActive: true,
      },
      {
        code: 'ARCHITECT20',
        description: '20% discount on bulk architectural orders above ₹10,000',
        discountType: 'PERCENTAGE',
        discountAmount: 20,
        minOrderAmount: 10000,
        maxDiscountAmount: 5000,
        endDate: oneYearFromNow,
        usageLimit: 200,
        perUserLimit: 3,
        isActive: true,
      },
    ];

    for (const coup of COUPONS) {
      await Coupon.findOneAndUpdate(
        { code: coup.code },
        { $set: coup },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`[Seed] Seeded ${COUPONS.length} promotional coupons.`);

    console.log('--- Database Seeding Complete ---');

    await mongoose.disconnect();
    console.log('[Seed] Database disconnected.');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Fatal Error]: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
