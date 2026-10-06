const app = require('./app');
const connectDB = require('./config/db');
const { PORT, NODE_ENV } = require('./config/env');

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Start HTTP Listener
    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`  GLASSOFY BACKEND SERVER RUNNING`);
      console.log(`  Environment : ${NODE_ENV}`);
      console.log(`  Port        : ${PORT}`);
      console.log(`  API Base    : http://localhost:${PORT}/api`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log('====================================================');
    });

    // 3. Graceful Shutdown Handlers
    const handleShutdown = (signal) => {
      console.log(`[Server] ${signal} signal received. Closing HTTP server gracefully...`);
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error('[Fatal Error] Unhandled Promise Rejection:', err.message);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error(`[Fatal Error] Could not start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
