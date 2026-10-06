const { Category, Product } = require('../models');
const { sendSuccess } = require('../utils/response');
const asyncWrapper = require('../middleware/asyncWrapper');

/**
 * @desc    Get all active categories with product counts
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = asyncWrapper(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });

  // Compute published product counts for each category
  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat) => {
      const productCount = await Product.countDocuments({
        category: cat._id,
        status: 'PUBLISHED',
        isPublished: true,
        isActive: true,
      });
      return {
        ...cat.toObject(),
        productCount,
      };
    })
  );

  return sendSuccess(res, 'Categories retrieved successfully.', categoriesWithCounts);
});

module.exports = {
  getCategories,
};
