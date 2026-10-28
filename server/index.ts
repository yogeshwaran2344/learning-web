import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { apiRouter } from './routes/apiRoutes';
import { Database } from './db/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Database
Database.init();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'LearnLens AI Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

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
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[LearnLens Backend] Server running at http://localhost:${PORT}`);
  console.log(`[LearnLens Backend] Health probe: http://localhost:${PORT}/api/health`);
});
