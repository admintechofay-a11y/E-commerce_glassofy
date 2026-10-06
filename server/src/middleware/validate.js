const { ZodError } = require('zod');
const { sendError } = require('../utils/response');

/**
 * Validates request body, query, or params using a Zod schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Assign sanitized/parsed values back
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.slice(1).join('.') || err.path.join('.'),
        message: err.message,
      }));

      return sendError(res, 'Validation failed', formattedErrors, 422);
    }
    next(error);
  }
};

validate.validate = validate;
module.exports = validate;
