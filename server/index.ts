import express from 'express';
import cors from 'cors';
import path from 'path';
import { apiRouter } from './routes/apiRoutes';
import { Database } from './db/database';

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
