const express = require('express');
const app = express();

// Global process error guards so serverless worker doesn't hard-crash
process.on('uncaughtException', (err) => {
  console.error('[Diagnostic Server Uncaught Exception]:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Diagnostic Server Unhandled Rejection]:', reason);
});

// Diagnostic probe served instantly with zero external dependencies
app.get(['/ping', '/api/ping', '/probe', '/api/probe'], (req, res) => {
  return res.status(200).json({
    status: 'ok',
    message: 'MINIMAL_EXPRESS_WORKS',
    nodeVersion: process.version,
    platform: process.platform,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      isVercel: Boolean(process.env.VERCEL),
      port: process.env.PORT,
    },
    timestamp: new Date().toISOString(),
  });
});

let realApp = null;
let bootError = null;

const getRealApp = () => {
  if (realApp) return realApp;
  if (bootError) return null;
  try {
    realApp = require('./bundle.js');
    return realApp;
  } catch (e) {
    bootError = { message: e.message, stack: e.stack };
    console.error('[RealApp Boot Error]:', e);
    return null;
  }
};

// Delegate all other routes to full Glassofy app
app.use((req, res, next) => {
  const handler = getRealApp();
  if (handler) {
    return handler(req, res, next);
  }
  return res.status(500).json({
    success: false,
    error: 'Backend application failed to initialize',
    bootError,
  });
});

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`[Diagnostic Server] Listening on port ${port}`);
  });
}

// Universal export for Vercel Express service loader
module.exports = app;
module.exports.default = app;
if (typeof app === 'function') {
  module.exports.handler = app;
}
