let app;
let bootError = null;

try {
  app = require('./src/app');
} catch (err) {
  bootError = err;
  console.error('[Glassofy Server Boot Error]:', err);
}

// Resilient request handler for Vercel Express service
const handler = (req, res) => {
  if (bootError || !app) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_BOOT_ERROR',
      message: bootError ? bootError.message : 'Application failed to initialize',
      stack: bootError ? bootError.stack : null,
    });
  }
  try {
    return app(req, res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_RUNTIME_ERROR',
      message: err.message,
      stack: err.stack,
    });
  }
};

// Start standalone HTTP listener if executed directly
if (require.main === module && app) {
  const { PORT, NODE_ENV } = require('./src/config/env');
  const connectDB = require('./src/config/db');
  connectDB().catch((err) => console.warn('[DB Boot Warning]', err.message));
  const port = process.env.PORT || PORT || 5000;
  app.listen(port, () => {
    console.log(`[Glassofy Server] Express running on port ${port} (${NODE_ENV})`);
  });
}

module.exports = app || handler;
