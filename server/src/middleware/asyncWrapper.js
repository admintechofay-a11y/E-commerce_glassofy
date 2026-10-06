/**
 * Wraps asynchronous route handlers to forward errors to the centralized error handler
 */
const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncWrapper;
