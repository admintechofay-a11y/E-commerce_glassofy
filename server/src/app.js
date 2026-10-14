const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const { CLIENT_URL, NODE_ENV } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { sendSuccess, sendError } = require('./utils/response');

const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const seoRoutes = require('./routes/seoRoutes');

const app = express();

// Trust all proxies for rate limiters behind Docker/Nginx/Vercel
app.set('trust proxy', true);

// Disable x-powered-by natively to prevent serverless function header manipulation errors
app.disable('x-powered-by');

// Fast Diagnostic Ping Endpoint (served before any middleware)
app.get(['/api/ping', '/ping'], (req, res) => {
  const mongoose = require('mongoose');
  const { MONGO_URI } = require('./config/env');
  return res.status(200).json({
    status: 'ok',
    message: 'Glassofy Express backend is responding.',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV,
      isVercel: Boolean(process.env.VERCEL),
      mongoConfigured: Boolean(MONGO_URI),
      dbReadyState: mongoose.connection.readyState,
    },
  });
});

// 1. Security HTTP Headers with Content Security Policy (CSP)
app.use(
  helmet({
    hidePoweredBy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://checkout.razorpay.com',
          'https://api.razorpay.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: [
          "'self'",
          CLIENT_URL,
          'http://localhost:5000',
          'http://localhost:3000',
          'http://127.0.0.1:5000',
          'http://127.0.0.1:3000',
          'https://api.razorpay.com',
          'https://lumberjack.razorpay.com',
        ].filter(Boolean),
        frameSrc: ["'self'", 'https://api.razorpay.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null,
      },
    },
  })
);

// 2. CORS Configuration
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (typeof origin === 'string' && (origin.endsWith('.vercel.app') || origin.includes('localhost')))
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Body Parsing Middleware (Captures raw body buffer for Meta Webhook HMAC validation)
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Cookie Parser
app.use(cookieParser());

// 5. Sanitize NoSQL injection attacks (exempt Meta WhatsApp webhook which requires dot notation e.g. hub.mode, hub.verify_token)
app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.includes('/api/whatsapp/webhook')) {
    return next();
  }
  return mongoSanitize()(req, res, next);
});

// 6. Global API Rate Limiter
if (NODE_ENV !== 'test') {
  app.use('/api', apiLimiter);
}

// 6.1 Database auto-connection for serverless runtimes (e.g. Vercel)
const mongoose = require('mongoose');
const connectDB = require('./config/db');
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1 && NODE_ENV !== 'test') {
    let timer = null;
    try {
      await Promise.race([
        connectDB(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Database connection timed out after 8000ms')), 8000);
        }),
      ]);
    } catch (err) {
      console.warn('[Serverless DB] Auto-connect error:', err.message);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  next();
});

// 7. Comprehensive Health Check Endpoint
app.get(['/api/health', '/health'], (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'DISCONNECTED',
    1: 'CONNECTED',
    2: 'CONNECTING',
    3: 'DISCONNECTING',
  };
  const isHealthy = dbState === 1 || NODE_ENV === 'test';

  const healthData = {
    status: isHealthy ? 'UP' : 'DEGRADED',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatusMap[dbState] || 'UNKNOWN',
      host: mongoose.connection.host || 'localhost',
      name: mongoose.connection.name || 'glassofy',
    },
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    version: '1.0.0',
  };

  if (!isHealthy) {
    return res.status(503).json({
      success: false,
      message: 'Glassofy API is running but database is not connected.',
      data: healthData,
    });
  }

  return sendSuccess(res, 'Glassofy Architectural API is healthy and operational.', healthData);
});

// Serve catalog photos with 7-day immutable caching
const imagesDir = path.join(__dirname, '../public/images');
const staticImageOptions = {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (/\.(webp|jpg|jpeg|png|svg|ico)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
};

// Auto-negotiate WebP and provide graceful fallbacks for responsive variants
const webpNegotiationMiddleware = (req, res, next) => {
  let subpath = req.path;
  const fullPath = path.join(imagesDir, subpath);

  // If a responsive variant (-300w or -600w) was requested but doesn't exist, fall back to base webp or original
  if (!fs.existsSync(fullPath) && /-(300w|600w)\.(webp|jpg|jpeg|png)$/i.test(subpath)) {
    const fallbackWebp = subpath.replace(/-(300w|600w)\.(webp|jpg|jpeg|png)$/i, '.webp');
    if (fs.existsSync(path.join(imagesDir, fallbackWebp))) {
      req.url = req.url.replace(/-(300w|600w)\.(webp|jpg|jpeg|png)$/i, '.webp');
      subpath = fallbackWebp;
    } else {
      const fallbackOrig = subpath.replace(/-(300w|600w)\.(webp|jpg|jpeg|png)$/i, '.jpg');
      if (fs.existsSync(path.join(imagesDir, fallbackOrig))) {
        req.url = req.url.replace(/-(300w|600w)\.(webp|jpg|jpeg|png)$/i, '.jpg');
        subpath = fallbackOrig;
      }
    }
  }

  // Auto-negotiate WebP for legacy jpg/png requests
  if (req.accepts && req.accepts('image/webp') && /\.(jpg|jpeg|png)$/i.test(subpath)) {
    const webpSubpath = subpath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const fullWebpPath = path.join(imagesDir, webpSubpath);
    if (fs.existsSync(fullWebpPath)) {
      req.url = req.url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
  }
  next();
};

app.use('/images', webpNegotiationMiddleware, express.static(imagesDir, staticImageOptions));
app.use('/api/images', webpNegotiationMiddleware, express.static(imagesDir, staticImageOptions));

// 8. API Routes - Mounted on both /api/* and root for universal serverless compatibility
const apiRoutesList = [
  ['/auth', authRoutes],
  ['/categories', categoryRoutes],
  ['/products', productRoutes],
  ['/cart', cartRoutes],
  ['/orders', orderRoutes],
  ['/admin', adminRoutes],
  ['/whatsapp', whatsappRoutes],
];

apiRoutesList.forEach(([routePath, router]) => {
  app.use(`/api${routePath}`, router);
  app.use(routePath, router);
});

// SEO Routes (sitemap.xml and robots.txt)
app.use(['/', '/api'], seoRoutes);

// 9. 404 Handler
app.use('*', (req, res) => {
  return sendError(res, `Cannot ${req.method} ${req.originalUrl}. Route not found.`, null, 404);
});

// 10. Centralized Error Handler Middleware
app.use(errorHandler);

module.exports = app;
