const express = require('express');
const router = express.Router();
const {
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
} = require('../controllers/productController');
const { cacheMiddleware } = require('../middleware/cache');

// Public catalog routes with caching
router.get('/', cacheMiddleware(120), getProducts); // 2 minutes
router.get('/featured', cacheMiddleware(300), getFeaturedProducts); // 5 minutes
router.get('/:slug', cacheMiddleware(180), getProductBySlug); // 3 minutes

module.exports = router;
