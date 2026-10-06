/**
 * In-Memory API Response Cache for Catalogue Routes
 * Automatically caches JSON responses for specified TTL.
 * Exposes invalidateCatalogCache() for invalidating when products or categories mutate.
 */

const cacheStore = new Map();

/**
 * Cache middleware generator
 * @param {number} ttlSeconds - Cache duration in seconds (default: 300 = 5 minutes)
 */
const cacheMiddleware = (ttlSeconds = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Bypass in test environment unless specifically testing caching
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-cache']) {
      return next();
    }

    // Generate unique cache key from base URL and query parameters
    const cacheKey = `${req.baseUrl || ''}${req.path}?${JSON.stringify(req.query || {})}`;
    const cachedEntry = cacheStore.get(cacheKey);

    if (cachedEntry) {
      const now = Date.now();
      if (now < cachedEntry.expiresAt) {
        // Cache Hit
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `public, max-age=${Math.round((cachedEntry.expiresAt - now) / 1000)}`);
        return res.status(200).json(cachedEntry.data);
      }
      // Expired entry
      cacheStore.delete(cacheKey);
    }

    // Cache Miss - intercept res.json
    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Only cache successful 200 responses
      if (res.statusCode === 200 && body && body.success) {
        cacheStore.set(cacheKey, {
          data: body,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate all catalogue related cache entries
 * Call whenever products, categories, or WhatsApp draft items are created/updated/deleted.
 */
const invalidateCatalogCache = () => {
  cacheStore.clear();
};

/**
 * Get current cache statistics (useful for health checks & debugging)
 */
const getCacheStats = () => {
  return {
    cachedEntries: cacheStore.size,
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCatalogCache,
  getCacheStats,
};
