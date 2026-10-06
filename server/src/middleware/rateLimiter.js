const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response');

// Strict rate limiter for auth endpoints (15 minutes, 50 requests in prod, skipped for localhost testing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV === 'test' ||
    (process.env.NODE_ENV !== 'production' &&
      (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || req.hostname === 'localhost')),
  handler: (req, res) => {
    return sendError(
      res,
      'Too many login/registration attempts from this IP. Please try again after 15 minutes.',
      null,
      429
    );
  },
});

// General API rate limiter (15 minutes, 2000 requests in production, skipped for localhost in development and test)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV === 'test' ||
    (process.env.NODE_ENV !== 'production' &&
      (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || req.hostname === 'localhost')),
  handler: (req, res) => {
    return sendError(res, 'Too many requests sent from this IP. Please slow down.', null, 429);
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
};
