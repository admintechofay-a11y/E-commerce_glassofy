const express = require('express');
const { Product, Category } = require('../models');
const { CLIENT_URL } = require('../config/env');
const asyncWrapper = require('../middleware/asyncWrapper');

const router = express.Router();

/**
 * @desc    Generate dynamic sitemap.xml for SEO indexing
 * @route   GET /sitemap.xml
 * @access  Public
 */
router.get(
  '/sitemap.xml',
  asyncWrapper(async (req, res) => {
    const baseUrl = (CLIENT_URL || 'https://glassofy.com').replace(/\/$/, '');

    // Fetch all active categories and published products
    const [categories, products] = await Promise.all([
      Category.find({ isActive: true }).select('slug updatedAt').lean(),
      Product.find({ status: 'PUBLISHED', isPublished: true, isActive: true })
        .select('slug updatedAt')
        .lean(),
    ]);

    const staticRoutes = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
      { loc: `${baseUrl}/products`, priority: '0.9', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
      { loc: `${baseUrl}/cart`, priority: '0.3', changefreq: 'monthly', lastmod: new Date().toISOString().split('T')[0] },
    ];

    const categoryRoutes = categories.map((cat) => ({
      loc: `${baseUrl}/products?category=${encodeURIComponent(cat.slug)}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: cat.updatedAt ? new Date(cat.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    }));

    const productRoutes = products.map((prod) => ({
      loc: `${baseUrl}/products/${encodeURIComponent(prod.slug)}`,
      priority: '0.7',
      changefreq: 'weekly',
      lastmod: prod.updatedAt ? new Date(prod.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    }));

    const allUrls = [...staticRoutes, ...categoryRoutes, ...productRoutes];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const urlObj of allUrls) {
      xml += `  <url>\n`;
      xml += `    <loc>${urlObj.loc}</loc>\n`;
      xml += `    <lastmod>${urlObj.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${urlObj.changefreq}</changefreq>\n`;
      xml += `    <priority>${urlObj.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache sitemap for 1 hour
    return res.status(200).send(xml);
  })
);

/**
 * @desc    Serve robots.txt for search engine crawlers
 * @route   GET /robots.txt
 * @access  Public
 */
router.get('/robots.txt', (req, res) => {
  const baseUrl = (CLIENT_URL || 'https://glassofy.com').replace(/\/$/, '');

  const robots = [
    '# Glassofy Architectural Hardware Robots Policy',
    'User-agent: *',
    'Allow: /',
    'Allow: /products',
    'Allow: /products/*',
    'Allow: /images/*',
    'Allow: /api/images/*',
    'Disallow: /admin',
    'Disallow: /admin/*',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /orders',
    'Disallow: /orders/*',
    'Disallow: /profile',
    'Disallow: /reset-password',
    'Disallow: /api/*',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join('\n');

  res.header('Content-Type', 'text/plain');
  res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  return res.status(200).send(robots);
});

module.exports = router;
