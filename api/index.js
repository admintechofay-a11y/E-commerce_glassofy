let app;
let initError = null;

try {
  app = require('../server/src/app');
} catch (err) {
  initError = err;
  console.error('[API Init Error]:', err);
}

module.exports = (req, res) => {
  if (initError || !app) {
    return res.status(500).json({
      success: false,
      error: 'API initialization failed',
      message: initError ? initError.message : 'App not initialized',
      stack: initError ? initError.stack : null,
    });
  }
  return app(req, res);
};
