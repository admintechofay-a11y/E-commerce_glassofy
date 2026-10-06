const mongoose = require('mongoose');
const { Product, Category } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const asyncWrapper = require('../middleware/asyncWrapper');

/**
 * @desc    Get all published products with filtering, search, sorting & pagination
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = asyncWrapper(async (req, res) => {
  const {
    search,
    category,
    finish,
    size,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 12,
  } = req.query;

  // Base query: ONLY published products
  const query = {
    status: 'PUBLISHED',
    isPublished: true,
    isActive: true,
  };

  // 1. Text / Keyword Search
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { title: searchRegex },
      { code: searchRegex },
      { description: searchRegex },
      { 'variants.sku': searchRegex },
      { tags: searchRegex },
    ];
  }

  // 2. Category Filter (by slug or ObjectId)
  if (category && category !== 'all') {
    if (mongoose.Types.ObjectId.isValid(category)) {
      query.category = category;
    } else {
      const foundCategory = await Category.findOne({ slug: category });
      if (foundCategory) {
        query.category = foundCategory._id;
      } else {
        // If non-existent category queried, return empty set
        query.category = new mongoose.Types.ObjectId();
      }
    }
  }

  // 3. Finish Filter
  if (finish && finish !== 'all') {
    const finishList = Array.isArray(finish) ? finish : finish.split(',');
    query.finish = { $in: finishList.map((f) => new RegExp(`^${f.trim()}$`, 'i')) };
  }

  // 4. Variant Size Filter
  if (size && size !== 'all') {
    const sizeList = Array.isArray(size) ? size : size.split(',');
    query['variants.size'] = { $in: sizeList.map((s) => new RegExp(s.trim(), 'i')) };
  }

  // 5. Price Range Filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.basePrice = {};
    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
      query.basePrice.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
      query.basePrice.$lte = Number(maxPrice);
    }
  }

  // 6. Sorting
  let sortOption = { isFeatured: -1, page: 1, displayOrder: 1, createdAt: 1 };
  if (sort === 'price_asc') {
    sortOption = { basePrice: 1 };
  } else if (sort === 'price_desc') {
    sortOption = { basePrice: -1 };
  } else if (sort === 'newest') {
    sortOption = { createdAt: -1 };
  } else if (sort === 'name_asc') {
    sortOption = { name: 1 };
  } else if (sort === 'name_desc') {
    sortOption = { name: -1 };
  }

  // 7. Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(query),
  ]);

  // Compute available filter options across published catalog for UI sidebar
  const [finishes, rawSizes, priceStats] = await Promise.all([
    Product.distinct('finish', { status: 'PUBLISHED', isPublished: true }),
    Product.distinct('variants.size', { status: 'PUBLISHED', isPublished: true }),
    Product.aggregate([
      { $match: { status: 'PUBLISHED', isPublished: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$basePrice' },
          maxPrice: { $max: '$basePrice' },
        },
      },
    ]),
  ]);

  const cleanFinishes = finishes
    .filter((f) => f && typeof f === 'string' && !/^\d/.test(f.trim()) && f.trim().length <= 25)
    .map((f) => f.trim().toUpperCase())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  const cleanSizes = rawSizes.filter(Boolean).sort();
  const minAvailablePrice = priceStats[0]?.minPrice || 0;
  const maxAvailablePrice = priceStats[0]?.maxPrice || 10000;

  return sendSuccess(res, 'Products retrieved successfully.', {
    products,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
    availableFilters: {
      finishes: cleanFinishes,
      sizes: cleanSizes,
      priceRange: {
        min: minAvailablePrice,
        max: maxAvailablePrice,
      },
    },
  });
});

/**
 * @desc    Get featured published products
 * @route   GET /api/products/featured
 * @access  Public
 */
const getFeaturedProducts = asyncWrapper(async (req, res) => {
  const limit = Math.min(24, parseInt(req.query.limit, 10) || 8);

  const featured = await Product.find({
    status: 'PUBLISHED',
    isPublished: true,
    isActive: true,
    isFeatured: true,
  })
    .populate('category', 'name slug')
    .sort({ page: 1, displayOrder: 1, createdAt: 1 })
    .limit(limit)
    .lean();

  return sendSuccess(res, 'Featured products retrieved successfully.', featured);
});

/**
 * @desc    Get single published product by slug
 * @route   GET /api/products/:slug
 * @access  Public
 */
const getProductBySlug = asyncWrapper(async (req, res) => {
  const { slug } = req.params;

  let query = {
    slug,
    status: 'PUBLISHED',
    isPublished: true,
    isActive: true,
  };

  // Fallback to _id if valid ObjectId and slug lookup misses
  let product = await Product.findOne(query).populate('category', 'name slug description');

  if (!product && mongoose.Types.ObjectId.isValid(slug)) {
    product = await Product.findOne({
      _id: slug,
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
    }).populate('category', 'name slug description');
  }

  if (!product) {
    return sendError(res, 'Product not found or is currently unavailable.', null, 404);
  }

  // Fetch 4 related products in the same category
  const relatedProducts = await Product.find({
    category: product.category._id,
    _id: { $ne: product._id },
    status: 'PUBLISHED',
    isPublished: true,
    isActive: true,
  })
    .populate('category', 'name slug')
    .limit(4)
    .lean();

  return sendSuccess(res, 'Product retrieved successfully.', {
    product,
    relatedProducts,
  });
});

module.exports = {
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
};
