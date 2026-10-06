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

// Trust proxy for rate limiters behind Docker/Nginx
app.set('trust proxy', 1);

// 1. Security HTTP Headers with Content Security Policy (CSP)
app.use(
  helmet({
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
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
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

// 7. Comprehensive Health Check Endpoint
app.get('/api/health', (req, res) => {
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

// 8. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// SEO Routes (sitemap.xml and robots.txt)
app.use('/', seoRoutes);
app.use('/api', seoRoutes);

// 9. 404 Handler
app.use('*', (req, res) => {
  return sendError(res, `Cannot ${req.method} ${req.originalUrl}. Route not found.`, null, 404);
});

// 10. Centralized Error Handler Middleware
app.use(errorHandler);

module.exports = app;
