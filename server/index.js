const app = require('./src/app');
const { PORT, NODE_ENV } = require('./src/config/env');
const connectDB = require('./src/config/db');

// Connect DB asynchronously without blocking HTTP listener startup
connectDB().catch((err) => console.warn('[DB Boot Warning]', err.message));

// Start HTTP server on process.env.PORT bound to 0.0.0.0 (required by Vercel Services container proxy)
const port = process.env.PORT || PORT || 5000;
let serverInstance = null;
try {
  serverInstance = app.listen(port, '0.0.0.0', () => {
    console.log(`[Glassofy Server] Express listening on 0.0.0.0:${port} (${NODE_ENV})`);
  });
} catch (err) {
  console.warn('[Server Listen Warning]', err.message);
}

// Universal export compatible with both CommonJS and ESM loaders on Vercel
module.exports = app;
module.exports.default = app;
if (typeof app === 'function') {
  app.default = app;
}
