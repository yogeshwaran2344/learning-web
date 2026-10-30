import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { apiRouter } from './routes/apiRoutes';
import { Database } from './db/database';
import { config, validateProductionConfig } from './config/environment';
import { standardRateLimiter } from './middleware/rateLimitMiddleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

// Validate production environment settings
validateProductionConfig();

const app = express();
const PORT = config.port;

// Initialize Database & WAL mode
Database.init();

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (config.env === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Production-ready CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: `${config.maxUploadSizeMb}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${config.maxUploadSizeMb}mb` }));

// Request Logging & Latency Monitor
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') && req.path !== '/api/health') {
      console.log(`[${req.method}] ${req.path} -> HTTP ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health & Deployment Probe
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'LearnLens AI Backend API',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

// Rate limiting on /api endpoints to protect against brute-force & expensive request hammering
app.use('/api', standardRateLimiter);

// API Routes
app.use('/api', apiRouter);

// Serve frontend static assets from 'dist'
app.use(express.static(distPath));

// Fallback to index.html for Single-Page Application (SPA) client routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>LearnLens AI</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2>LearnLens AI Backend API is Running!</h2>
          <p>Frontend static build was not found. Please run <code>npm run build</code>.</p>
          <p><a href="/api/health">Check API Health Status</a></p>
        </body>
      </html>
    `);
  }
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Unhandled Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Process-level uncaught exception handlers
process.on('uncaughtException', (err) => {
  console.error('[Fatal Error] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Fatal Error] Unhandled Promise Rejection:', reason);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[LearnLens Backend] Server running at http://0.0.0.0:${PORT} in ${config.env} mode`);
  console.log(`[LearnLens Backend] Health probe: http://0.0.0.0:${PORT}/api/health`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('[LearnLens Backend] SIGTERM signal received: closing HTTP server...');
  server.close(() => {
    console.log('[LearnLens Backend] HTTP server closed gracefully.');
  });
});
