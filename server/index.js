const app = require('./src/app');
const { PORT, NODE_ENV } = require('./src/config/env');
const connectDB = require('./src/config/db');

// Safeguard against unhandled errors terminating process on serverless
process.on('uncaughtException', (err) => {
  console.error('[Process Uncaught Exception]:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process Unhandled Rejection]:', reason);
});

// Start HTTP listener only when run directly in development or standalone server
if (require.main === module) {
  connectDB().catch((err) => console.warn('[DB Boot Warning]', err.message));
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
