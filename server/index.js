const app = require('./src/app');
const { PORT, NODE_ENV } = require('./src/config/env');
const connectDB = require('./src/config/db');

// Support both standalone process (npm start) and Vercel Express service loader
if (require.main === module) {
  connectDB().catch((err) => console.warn('[DB Boot Warning]', err.message));
  const port = process.env.PORT || PORT || 5000;
  app.listen(port, () => {
    console.log(`[Glassofy Server] Express running on port ${port} (${NODE_ENV})`);
  });
}

module.exports = app;
