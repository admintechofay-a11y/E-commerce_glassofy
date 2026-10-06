const { NODE_ENV } = require('../config/env');
const { sendError } = require('../utils/response');

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;
  let statusCode = err.statusCode || 500;

  // Log in non-test environments
  if (NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id: ${err.value}`;
    return sendError(res, message, null, 404);
  }

  // Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    const message = `An account or record with this ${field} ('${val}') already exists.`;
    return sendError(res, message, [{ field, message }], 409);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const formattedErrors = Object.values(err.errors || {}).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    return sendError(res, 'Database validation error', formattedErrors, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid security token. Please log in again.', null, 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Session expired. Please log in again.', null, 401);
  }

  // Fallback internal error
  const responseData = {
    success: false,
    message: error.message || 'Internal Server Error',
  };

  if (NODE_ENV === 'development') {
    responseData.stack = err.stack;
  }

  return res.status(statusCode).json(responseData);
};

module.exports = errorHandler;
