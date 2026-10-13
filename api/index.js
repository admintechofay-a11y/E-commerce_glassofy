let app = null;
let initError = null;

try {
  app = require('../server/src/app');
} catch (err) {
  initError = err;
  console.error('[Vercel Serverless Boot Error]:', err);
}

const handler = (req, res) => {
  // Diagnostic fallback if server/src/app failed to load
  if ((req.url === '/api/ping' || req.url === '/ping') && initError) {
    return res.status(500).json({
      status: 'error',
      message: 'Express app failed to boot on Vercel',
      error: initError.message,
      stack: initError.stack,
    });
  }

  if (initError || !app) {
    console.error('[Vercel Serverless Invocation Boot Error]:', initError);
    return res.status(500).json({
      success: false,
      error: 'Backend Server Initialization Failed',
      message: initError ? initError.message : 'Application could not be loaded',
    });
  }

  return app(req, res);
};

module.exports = handler;
module.exports.default = handler;
