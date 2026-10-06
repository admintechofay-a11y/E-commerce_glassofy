const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/categoryController');
const { cacheMiddleware } = require('../middleware/cache');

// Cache categories for 5 minutes (300s)
router.get('/', cacheMiddleware(300), getCategories);

module.exports = router;
