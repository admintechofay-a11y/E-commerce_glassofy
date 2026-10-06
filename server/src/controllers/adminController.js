const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  Product,
  Category,
  Order,
  User,
  Cart,
  DiscountRule,
  Coupon,
  Settings,
  AuditLog,
} = require('../models');
const { logAudit } = require('../utils/auditLogger');
const { getPricingSettings } = require('../services/settingsService');
const { invalidateCatalogCache } = require('../middleware/cache');

const UPLOADS_DIR = path.join(__dirname, '../../public/images/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const uploadAdminImage = async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({
      success: false,
      message: 'imageBase64 and mimeType (image/jpeg, image/png, image/webp) are required',
    });
  }

  const ext = ALLOWED_IMAGE_TYPES[mimeType.toLowerCase()];
  if (!ext) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    });
  }

  // Remove data URI prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    return res.status(400).json({
      success: false,
      message: `File size exceeds 5MB limit (received ${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`,
    });
  }

  const filename = `upload_${crypto.randomBytes(12).toString('hex')}_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  const relativeUrl = `/images/uploads/${filename}`;
  return res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      url: relativeUrl,
      sizeBytes: buffer.length,
      mimeType,
    },
  });
};

// ==========================================
// 1. DASHBOARD
// ==========================================
const getDashboardMetrics = async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalOrders,
    recentOrders,
    totalUsers,
    totalProducts,
    allOrders,
    lowStockProducts,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.find().sort({ createdAt: -1 }).limit(8).populate('user', 'fullName email mobile'),
    User.countDocuments(),
    Product.countDocuments({ status: 'PUBLISHED' }),
    Order.find({
      createdAt: { $gte: thirtyDaysAgo },
      paymentStatus: { $in: ['PAID', 'PENDING'] },
      orderStatus: { $ne: 'CANCELLED' },
    }).select('total createdAt items paymentStatus orderStatus'),
    Product.find({
      'variants.stock': { $lt: 15 },
      status: 'PUBLISHED',
    }).select('name code variants images finish').limit(10),
  ]);

  // Calculate revenue & 30-day timeline
  let totalRevenue = 0;
  const dailyMap = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { date: key, revenue: 0, orders: 0 };
  }

  const productSalesMap = {};

  for (const o of allOrders) {
    if (o.paymentStatus === 'PAID' || o.orderStatus === 'CONFIRMED' || o.orderStatus === 'DELIVERED') {
      totalRevenue += o.total || 0;
    }
    const dayKey = new Date(o.createdAt).toISOString().split('T')[0];
    if (dailyMap[dayKey]) {
      dailyMap[dayKey].revenue += o.total || 0;
      dailyMap[dayKey].orders += 1;
    }
    // Track top products
    for (const item of o.items || []) {
      const pKey = item.title || 'Product';
      if (!productSalesMap[pKey]) {
        productSalesMap[pKey] = { title: pKey, code: item.code, count: 0, revenue: 0 };
      }
      productSalesMap[pKey].count += item.quantity || 1;
      productSalesMap[pKey].revenue += item.subtotal || 0;
    }
  }

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const salesTimeline = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalRevenue: Math.round((totalRevenue + Number.EPSILON) * 100) / 100,
        totalOrders,
        totalUsers,
        totalProducts,
        lowStockCount: lowStockProducts.length,
      },
      salesTimeline,
      topProducts,
      recentOrders,
      lowStockProducts,
    },
  });
};

// ==========================================
// 2. PRODUCTS (CRUD, BULK, CSV IMPORT/EXPORT)
// ==========================================
const getAdminProducts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { code: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  if (req.query.status && req.query.status !== 'ALL') {
    query.status = req.query.status;
  }

  if (req.query.category && req.query.category !== 'ALL') {
    query.category = req.query.category;
  }

  if (req.query.finish && req.query.finish !== 'ALL') {
    query.finish = req.query.finish;
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  });
};

const getAdminProductById = async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  return res.status(200).json({ success: true, data: { product } });
};

const createAdminProduct = async (req, res) => {
  const {
    name,
    title,
    slug,
    code,
    description,
    category,
    finish,
    basePrice,
    baseMrp,
    variants = [],
    bulkPricing = [],
    images = [],
    tags = [],
    status = 'PUBLISHED',
    isFeatured = false,
    metaTitle = '',
    metaDescription = '',
    specifications = {},
  } = req.body;

  const generatedSlug = slug
    ? slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
    : (name || title || 'prod').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now().toString().slice(-4);

  const product = new Product({
    name,
    title: title || name,
    slug: generatedSlug,
    code: code || `GLAS-${Date.now().toString().slice(-5)}`,
    description,
    category,
    finish,
    basePrice: Number(basePrice) || 0,
    baseMrp: Number(baseMrp) || Number(basePrice) || 0,
    variants,
    bulkPricing: (bulkPricing || []).map((bp) => ({
      minQty: bp.minQty ?? bp.minQuantity ?? 1,
      discountPercentage: Number(bp.discountPercentage) || 0,
      fixedPrice: Number(bp.fixedPrice) || 0,
    })),
    images,
    tags,
    status,
    isPublished: status === 'PUBLISHED',
    isFeatured: Boolean(isFeatured),
    isActive: true,
    metaTitle,
    metaDescription,
    specifications,
  });

  await product.save();

  await logAudit({
    user: req.user,
    action: 'CREATE',
    entity: 'PRODUCT',
    entityId: product._id,
    details: { name: product.name, code: product.code, status: product.status },
    req,
  });

  invalidateCatalogCache();

  return res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: { product },
  });
};

const updateAdminProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const prevSnapshot = { name: product.name, status: product.status, basePrice: product.basePrice };

  Object.assign(product, req.body);

  if (req.body.status) {
    product.isPublished = req.body.status === 'PUBLISHED';
  }

  await product.save();

  await logAudit({
    user: req.user,
    action: 'UPDATE',
    entity: 'PRODUCT',
    entityId: product._id,
    details: { before: prevSnapshot, after: { name: product.name, status: product.status, basePrice: product.basePrice } },
    req,
  });

  invalidateCatalogCache();

  return res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: { product },
  });
};

const deleteAdminProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  await Product.findByIdAndDelete(req.params.id);

  await logAudit({
    user: req.user,
    action: 'DELETE',
    entity: 'PRODUCT',
    entityId: req.params.id,
    details: { name: product.name, code: product.code },
    req,
  });

  invalidateCatalogCache();

  return res.status(200).json({
    success: true,
    message: 'Product deleted permanently',
  });
};

const bulkActionProducts = async (req, res) => {
  const rawIds = req.body.productIds || req.body.ids || [];
  const productIds = Array.isArray(rawIds) ? rawIds : [rawIds];
  const { action } = req.body;
  if (!productIds.length || !action) {
    return res.status(400).json({ success: false, message: 'Invalid product selection or action' });
  }

  let resultMessage = '';

  if (action === 'PUBLISH') {
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { status: 'PUBLISHED', isPublished: true } }
    );
    resultMessage = `${productIds.length} products published`;
  } else if (action === 'DRAFT') {
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { status: 'DRAFT', isPublished: false } }
    );
    resultMessage = `${productIds.length} products moved to draft`;
  } else if (action === 'DELETE') {
    await Product.deleteMany({ _id: { $in: productIds } });
    resultMessage = `${productIds.length} products deleted permanently`;
  } else {
    return res.status(400).json({ success: false, message: 'Unsupported bulk action' });
  }

  await logAudit({
    user: req.user,
    action: `BULK_${action}`,
    entity: 'PRODUCT',
    details: { count: productIds.length, productIds },
    req,
  });

  invalidateCatalogCache();

  return res.status(200).json({
    success: true,
    message: resultMessage,
  });
};

const exportProductsCsv = async (req, res) => {
  const products = await Product.find().populate('category', 'name').sort({ code: 1 });

  const headers = ['Code', 'Name', 'Category', 'Finish', 'BasePrice', 'BaseMRP', 'Status', 'Stock', 'Tags'];
  const rows = products.map((p) => {
    const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
    return [
      `"${p.code || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.category?.name || ''}"`,
      `"${p.finish || ''}"`,
      p.basePrice,
      p.baseMrp,
      p.status,
      totalStock,
      `"${(p.tags || []).join(';')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="glassofy-products.csv"');
  return res.status(200).send(csvContent);
};

const importProductsCsv = async (req, res) => {
  const { csvData, dryRun = false } = req.body;
  if (!csvData) {
    return res.status(400).json({ success: false, message: 'CSV data string is required' });
  }

  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    return res.status(400).json({ success: false, message: 'CSV contains no rows' });
  }

  const headerLine = lines[0].split(',').map((h) => h.replace(/["\r]/g, '').trim());
  const rows = lines.slice(1);

  const report = {
    totalRows: rows.length,
    validRows: 0,
    errors: [],
    imported: 0,
  };

  const defaultCategory = await Category.findOne();

  for (let idx = 0; idx < rows.length; idx++) {
    const line = rows[idx].trim();
    if (!line) continue;

    // Simple CSV parser for quoted fields
    const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const cleanCols = cols.map((c) => c.replace(/^"|"$/g, '').trim());

    const code = cleanCols[0];
    const name = cleanCols[1];
    const price = parseFloat(cleanCols[4]) || 0;

    if (!code || !name) {
      report.errors.push({ row: idx + 2, message: 'Missing Code or Name' });
      continue;
    }

    if (price <= 0) {
      report.errors.push({ row: idx + 2, message: `Invalid price for ${code}` });
      continue;
    }

    report.validRows++;

    if (!dryRun) {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') + '-' + code.toLowerCase();
      await Product.findOneAndUpdate(
        { code },
        {
          $set: {
            code,
            name,
            title: name,
            slug,
            basePrice: price,
            baseMrp: Math.round(price * 1.3),
            finish: cleanCols[3] || 'SS 304',
            category: defaultCategory?._id,
            status: cleanCols[6] || 'PUBLISHED',
            isPublished: (cleanCols[6] || 'PUBLISHED') === 'PUBLISHED',
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
      report.imported++;
    }
  }

  if (!dryRun && report.imported > 0) {
    await logAudit({
      user: req.user,
      action: 'CSV_IMPORT',
      entity: 'PRODUCT',
      details: { totalRows: report.totalRows, imported: report.imported, errors: report.errors.length },
      req,
    });
    invalidateCatalogCache();
  }

  return res.status(200).json({
    success: true,
    message: dryRun ? 'CSV validation completed' : `Imported ${report.imported} products`,
    data: { report },
  });
};

// ==========================================
// 3. CATEGORIES CRUD
// ==========================================
const getAdminCategories = async (req, res) => {
  const categories = await Category.find().sort({ displayOrder: 1, name: 1 });
  const populated = await Promise.all(
    categories.map(async (cat) => {
      const count = await Product.countDocuments({ category: cat._id });
      return { ...cat.toObject(), productCount: count };
    })
  );
  return res.status(200).json({ success: true, data: { categories: populated } });
};

const createAdminCategory = async (req, res) => {
  const { name, slug, description, image, displayOrder = 0, isActive = true } = req.body;

  const generatedSlug = slug
    ? slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
    : (name || 'cat').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

  const category = new Category({
    name,
    slug: generatedSlug,
    description,
    image,
    displayOrder: Number(displayOrder) || 0,
    isActive: Boolean(isActive),
  });

  await category.save();

  await logAudit({
    user: req.user,
    action: 'CREATE',
    entity: 'CATEGORY',
    entityId: category._id,
    details: { name: category.name, slug: category.slug },
    req,
  });

  invalidateCatalogCache();

  return res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: { category },
  });
};

const updateAdminCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  Object.assign(category, req.body);
  await category.save();

  await logAudit({
    user: req.user,
    action: 'UPDATE',
    entity: 'CATEGORY',
    entityId: category._id,
    details: { name: category.name },
    req,
  });

  invalidateCatalogCache();

  return res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: { category },
  });
};

const deleteAdminCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  await Category.findByIdAndDelete(req.params.id);

  await logAudit({
    user: req.user,
    action: 'DELETE',
    entity: 'CATEGORY',
    entityId: req.params.id,
    details: { name: category.name },
    req,
  });

  invalidateCatalogCache();

  return res.status(200).json({ success: true, message: 'Category deleted' });
};

// ==========================================
// 4. ORDERS MANAGEMENT
// ==========================================
const getAdminOrders = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.status && req.query.status !== 'ALL') {
    query.orderStatus = req.query.status;
  }

  if (req.query.paymentStatus && req.query.paymentStatus !== 'ALL') {
    query.paymentStatus = req.query.paymentStatus;
  }

  if (req.query.search) {
    query.$or = [
      { orderNumber: { $regex: req.query.search, $options: 'i' } },
      { 'shippingAddress.fullName': { $regex: req.query.search, $options: 'i' } },
      { 'shippingAddress.phone': { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'fullName email mobile businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  });
};

const getAdminOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'fullName email mobile businessName gstNumber');
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  return res.status(200).json({ success: true, data: { order } });
};

const updateAdminOrderStatus = async (req, res) => {
  const { status, note = '', trackingNumber = '' } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const oldStatus = order.orderStatus;
  order.orderStatus = status;

  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

  order.statusHistory.push({
    status,
    note: note || `Status updated from ${oldStatus} to ${status} by Admin`,
    timestamp: new Date(),
    updatedBy: req.user._id,
  });

  await order.save();

  await logAudit({
    user: req.user,
    action: 'STATUS_CHANGE',
    entity: 'ORDER',
    entityId: order._id,
    details: { orderNumber: order.orderNumber, from: oldStatus, to: status, note },
    req,
  });

  return res.status(200).json({
    success: true,
    message: `Order status updated to ${status}`,
    data: { order },
  });
};

const refundOrCancelAdminOrder = async (req, res) => {
  const { reason = 'Refunded / Cancelled by Admin', action = 'CANCEL' } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Restore inventory stock if order was active
  if (['CONFIRMED', 'PACKED', 'SHIPPED'].includes(order.orderStatus)) {
    for (const item of order.items) {
      const prod = await Product.findById(item.product);
      if (prod && item.variantId && prod.variants?.length > 0) {
        const v = prod.variants.id(item.variantId);
        if (v) {
          v.stock += item.quantity;
        }
        await prod.save();
      }
    }
  }

  order.orderStatus = 'CANCELLED';
  if (action === 'REFUND' || action === 'CANCEL_AND_REFUND') {
    order.paymentStatus = 'REFUNDED';
  }
  order.cancelReason = reason;
  order.cancelledAt = new Date();
  order.statusHistory.push({
    status: 'CANCELLED',
    note: `Order ${action === 'REFUND' ? 'Refunded and Cancelled' : 'Cancelled'} by Admin: ${reason}`,
    timestamp: new Date(),
    updatedBy: req.user._id,
  });

  await order.save();

  await logAudit({
    user: req.user,
    action: action.includes('REFUND') ? 'CANCEL_REFUND' : 'CANCEL',
    entity: 'ORDER',
    entityId: order._id,
    details: { orderNumber: order.orderNumber, reason, action },
    req,
  });

  return res.status(200).json({
    success: true,
    message: `Order ${order.orderNumber} ${action === 'REFUND' ? 'refunded and cancelled' : 'cancelled'}. Stock restored.`,
    data: { order },
  });
};

// ==========================================
// 5. USERS MANAGEMENT
// ==========================================
const getAdminUsers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.search) {
    query.$or = [
      { fullName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { mobile: { $regex: req.query.search, $options: 'i' } },
      { businessName: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  if (req.query.role && req.query.role !== 'ALL') {
    query.role = req.query.role;
  }

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password'),
    User.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  });
};

const getAdminUserDetail = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const [orders, cart] = await Promise.all([
    Order.find({ user: user._id }).sort({ createdAt: -1 }),
    Cart.findOne({ user: user._id }).populate('items.product', 'name code basePrice images'),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      user,
      orders,
      cart: cart || { items: [] },
    },
  });
};

const toggleAdminUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (req.body.isActive !== undefined) {
    user.isActive = Boolean(req.body.isActive);
  } else {
    user.isActive = !user.isActive;
  }
  await user.save();

  await logAudit({
    user: req.user,
    action: user.isActive ? 'UNBLOCK_USER' : 'BLOCK_USER',
    entity: 'USER',
    entityId: user._id,
    details: { email: user.email, isActive: user.isActive },
    req,
  });

  return res.status(200).json({
    success: true,
    message: `User account ${user.isActive ? 'activated' : 'blocked'} successfully`,
    data: { user },
  });
};

const changeAdminUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['USER', 'ADMIN'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  await logAudit({
    user: req.user,
    action: 'CHANGE_ROLE',
    entity: 'USER',
    entityId: user._id,
    details: { email: user.email, from: oldRole, to: role },
    req,
  });

  return res.status(200).json({
    success: true,
    message: `User role changed to ${role}`,
    data: { user },
  });
};

const generatePasswordResetLink = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hr
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  await logAudit({
    user: req.user,
    action: 'RESET_PASSWORD_LINK',
    entity: 'USER',
    entityId: user._id,
    details: { email: user.email },
    req,
  });

  return res.status(200).json({
    success: true,
    message: 'Password reset link generated',
    data: { resetUrl, resetToken },
  });
};

// ==========================================
// 6. DISCOUNTS (RULES, COUPONS, STACKING)
// ==========================================
const getAdminDiscounts = async (req, res) => {
  const [rules, coupons, settings] = await Promise.all([
    DiscountRule.find().sort({ priority: -1 }),
    Coupon.find().sort({ createdAt: -1 }),
    getPricingSettings(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      rules,
      coupons,
      stackingMode: settings.stackingMode || 'best-of',
    },
  });
};

const createOrUpdateDiscountRule = async (req, res) => {
  const id = req.params.id || req.body._id || req.body.id;
  const { name, discountPercentage, discountAmount, priority, isActive } = req.body;
  const ruleType = req.body.ruleType || req.body.type || 'CART_TOTAL';
  const conditions = { ...(req.body.conditions || {}) };
  if (req.body.minCartAmount !== undefined && conditions.minAmount === undefined) {
    conditions.minAmount = Number(req.body.minCartAmount);
    conditions.minCartTotal = Number(req.body.minCartAmount);
  }
  if (req.body.minCartTotal !== undefined && conditions.minCartTotal === undefined) {
    conditions.minCartTotal = Number(req.body.minCartTotal);
    conditions.minAmount = Number(req.body.minCartTotal);
  }

  let rule;
  let action = 'UPDATE';

  if (id) {
    rule = await DiscountRule.findById(id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    Object.assign(rule, req.body, { ruleType, conditions });
  } else {
    action = 'CREATE';
    rule = new DiscountRule({
      name,
      ruleType,
      conditions,
      discountPercentage: Number(discountPercentage) || 0,
      discountAmount: Number(discountAmount) || 0,
      priority: Number(priority) || 0,
      isActive: isActive !== false,
    });
  }

  await rule.save();

  await logAudit({
    user: req.user,
    action,
    entity: 'DISCOUNT_RULE',
    entityId: rule._id,
    details: { name: rule.name, ruleType: rule.ruleType, percentage: rule.discountPercentage },
    req,
  });

  return res.status(200).json({
    success: true,
    message: `Discount rule ${action === 'CREATE' ? 'created' : 'updated'}`,
    data: { rule },
  });
};

const deleteDiscountRule = async (req, res) => {
  const rule = await DiscountRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

  await DiscountRule.findByIdAndDelete(req.params.id);

  await logAudit({
    user: req.user,
    action: 'DELETE',
    entity: 'DISCOUNT_RULE',
    entityId: req.params.id,
    details: { name: rule.name },
    req,
  });

  return res.status(200).json({ success: true, message: 'Rule deleted' });
};

const createOrUpdateCoupon = async (req, res) => {
  const { id } = req.params;
  const {
    code,
    description,
    discountType,
    discountAmount,
    minOrderAmount,
    maxDiscountAmount,
    endDate,
    usageLimit,
    perUserLimit,
    isActive,
  } = req.body;

  let coupon;
  let action = 'UPDATE';

  if (id) {
    coupon = await Coupon.findById(id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    Object.assign(coupon, req.body);
  } else {
    action = 'CREATE';
    coupon = new Coupon({
      code: code.toUpperCase().trim(),
      description,
      discountType,
      discountAmount: Number(discountAmount) || 0,
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      endDate: new Date(endDate),
      usageLimit: Number(usageLimit) || 0,
      perUserLimit: Number(perUserLimit) || 0,
      isActive: isActive !== false,
    });
  }

  await coupon.save();

  await logAudit({
    user: req.user,
    action,
    entity: 'COUPON',
    entityId: coupon._id,
    details: { code: coupon.code, discountAmount: coupon.discountAmount },
    req,
  });

  return res.status(200).json({
    success: true,
    message: `Coupon ${coupon.code} ${action === 'CREATE' ? 'created' : 'updated'}`,
    data: { coupon },
  });
};

const deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

  await Coupon.findByIdAndDelete(req.params.id);

  await logAudit({
    user: req.user,
    action: 'DELETE',
    entity: 'COUPON',
    entityId: req.params.id,
    details: { code: coupon.code },
    req,
  });

  return res.status(200).json({ success: true, message: 'Coupon deleted' });
};

const updateStackingMode = async (req, res) => {
  const { stackingMode } = req.body;
  if (!['best-of', 'stack'].includes(stackingMode)) {
    return res.status(400).json({ success: false, message: 'Invalid stacking mode' });
  }

  const setting = await Settings.findOne({ key: 'pricing_settings' });
  const val = setting?.value || {};
  val.stackingMode = stackingMode;

  await Settings.findOneAndUpdate(
    { key: 'pricing_settings' },
    { $set: { value: val, key: 'pricing_settings' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await logAudit({
    user: req.user,
    action: 'UPDATE_STACKING_MODE',
    entity: 'SETTINGS',
    details: { stackingMode },
    req,
  });

  return res.status(200).json({
    success: true,
    message: `Stacking mode set to "${stackingMode}"`,
    data: { stackingMode },
  });
};

// ==========================================
// 7. SETTINGS
// ==========================================
const getAdminSettings = async (req, res) => {
  const settingsDoc = await Settings.find();
  const pricing = await getPricingSettings();

  return res.status(200).json({
    success: true,
    data: {
      pricing,
      allSettings: settingsDoc,
    },
  });
};

const updateAdminSettings = async (req, res) => {
  const { pricingSettings, storeDetails, emailTemplates } = req.body;

  if (pricingSettings) {
    const current = await Settings.findOne({ key: 'pricing_settings' });
    const updated = { ...(current?.value || {}), ...pricingSettings };
    await Settings.findOneAndUpdate(
      { key: 'pricing_settings' },
      { $set: { value: updated, key: 'pricing_settings' } },
      { upsert: true }
    );
  }

  if (storeDetails) {
    await Settings.findOneAndUpdate(
      { key: 'store_details' },
      { $set: { value: storeDetails, key: 'store_details' } },
      { upsert: true }
    );
  }

  if (emailTemplates) {
    await Settings.findOneAndUpdate(
      { key: 'email_templates' },
      { $set: { value: emailTemplates, key: 'email_templates' } },
      { upsert: true }
    );
  }

  await logAudit({
    user: req.user,
    action: 'UPDATE',
    entity: 'SETTINGS',
    details: { updatedKeys: Object.keys(req.body) },
    req,
  });

  return res.status(200).json({
    success: true,
    message: 'System settings saved successfully',
    data: { pricing: await getPricingSettings() },
  });
};

// ==========================================
// 8. AUDIT LOGS
// ==========================================
const getAdminAuditLogs = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.entity && req.query.entity !== 'ALL') {
    query.entity = req.query.entity.toUpperCase();
  }

  if (req.query.action && req.query.action !== 'ALL') {
    query.action = { $regex: req.query.action, $options: 'i' };
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('user', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  });
};

module.exports = {
  getDashboardMetrics,
  getAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  bulkActionProducts,
  exportProductsCsv,
  importProductsCsv,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  refundOrCancelAdminOrder,
  getAdminUsers,
  getAdminUserDetail,
  toggleAdminUserStatus,
  changeAdminUserRole,
  generatePasswordResetLink,
  getAdminDiscounts,
  createOrUpdateDiscountRule,
  deleteDiscountRule,
  createOrUpdateCoupon,
  deleteCoupon,
  updateStackingMode,
  getAdminSettings,
  updateAdminSettings,
  getAdminAuditLogs,
  uploadAdminImage,
};
