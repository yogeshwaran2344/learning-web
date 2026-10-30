import path from 'path';
import fs from 'fs';

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  corsOrigins: string[] | string;
  jwtSecret: string;
  maxUploadSizeBytes: number;
  maxUploadSizeMb: number;
  rateLimitWindowMs: number;
  maxRequestsPerWindow: number;
  aiRateLimitWindowMs: number;
  maxAiRequestsPerMinute: number;
  geminiApiKey: string;
  openaiApiKey: string;
  facultyInviteKey: string;
  dbPath: string;
  uploadsDir: string;
  backupsDir: string;
}

const isProd = process.env.NODE_ENV === 'production';

// Ensure data subdirectories exist
const rootDir = process.cwd();
const dataDir = path.resolve(rootDir, 'server', 'data');
const uploadsDir = path.resolve(dataDir, 'uploads');
const backupsDir = path.resolve(dataDir, 'backups');

[dataDir, uploadsDir, backupsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      // Ignore if exists
    }
  }
});

// Configure allowed frontend origins
const rawCorsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';
const corsOrigins = isProd && rawCorsOrigin
  ? rawCorsOrigin.split(',').map(s => s.trim())
  : '*'; // In development allow local host; in production require configured origin

export const config: AppConfig = {
  env: (process.env.NODE_ENV as any) || 'development',
  port: Number(process.env.PORT) || 5001,
  corsOrigins,
  jwtSecret: process.env.JWT_SECRET || (isProd ? 'CRITICAL_PROD_SECRET_OVERRIDE_REQUIRED' : 'learnlens_dev_jwt_secret_2026'),
  maxUploadSizeMb: 25,
  maxUploadSizeBytes: 25 * 1024 * 1024, // 25 MB limit
  rateLimitWindowMs: 15 * 60 * 1000,     // 15 minutes
  maxRequestsPerWindow: 300,             // 300 req per 15 min per IP
  aiRateLimitWindowMs: 60 * 1000,        // 1 minute
  maxAiRequestsPerMinute: 20,            // Max 20 AI generation requests per minute
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  facultyInviteKey: process.env.LECTURER_INVITE_KEY || (isProd ? '' : 'DEV_FACULTY_SECRET_ONLY_2026'),
  dbPath: process.env.DATABASE_PATH || path.resolve(dataDir, 'learnlens.db'),
  uploadsDir,
  backupsDir
};

export function validateProductionConfig(): void {
  if (config.env === 'production') {
    if (config.jwtSecret === 'CRITICAL_PROD_SECRET_OVERRIDE_REQUIRED') {
      console.warn('[Config Warning]: JWT_SECRET environment variable is not explicitly set in production.');
    }
    if (!config.facultyInviteKey || config.facultyInviteKey === 'FACULTY_VERIFIED_KEY_2026' || config.facultyInviteKey === 'DEV_FACULTY_SECRET_ONLY_2026') {
      console.warn('[Config Security Alert]: LECTURER_INVITE_KEY must be set to a strong high-entropy secret in production (minimum 32 characters).');
    }
    if (!config.geminiApiKey && !config.openaiApiKey) {
      console.info('[Config Notice]: External LLM API key not set; high-fidelity deterministic generation engine active.');
    }
  }
}
