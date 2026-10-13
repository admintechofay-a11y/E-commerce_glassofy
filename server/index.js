let app;

try {
  app = require('./bundle.js');
} catch (bundleErr) {
  console.warn('[Server Boot Bundle Fallback]:', bundleErr.message);
  app = require('./src/app');
}

// Start HTTP listener only when run directly as a script
if (require.main === module) {
  const { PORT, NODE_ENV } = require('./src/config/env');
  const port = process.env.PORT || PORT || 5000;
  app.listen(port, () => {
    console.log(`[Glassofy Server] Express running on port ${port} (${NODE_ENV})`);
  });
}

// Universal export for Vercel Express service loader
module.exports = app;
module.exports.default = app;
if (typeof app === 'function') {
  app.default = app;
}
