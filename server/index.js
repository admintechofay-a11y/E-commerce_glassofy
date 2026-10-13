const app = require('./src/app');

// Start standalone HTTP listener only when run directly as a script
if (require.main === module) {
  const { PORT, NODE_ENV } = require('./src/config/env');
  const connectDB = require('./src/config/db');
  connectDB().catch((err) => console.warn('[DB Boot Warning]', err.message));
  const port = process.env.PORT || PORT || 5000;
  app.listen(port, () => {
    console.log(`[Glassofy Server] Express running on port ${port} (${NODE_ENV})`);
  });
}

// Universal export compatible with both CommonJS and ESM bundlers on Vercel
module.exports = app;
module.exports.default = app;
if (typeof app === 'function') {
  app.default = app;
}
