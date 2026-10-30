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
const corsOrigins = isProd
  ? (rawCorsOrigin ? rawCorsOrigin.split(',').map(s => s.trim()).filter(Boolean) : [])
  : (rawCorsOrigin ? rawCorsOrigin.split(',').map(s => s.trim()).filter(Boolean) : '*');

export const config: AppConfig = {
  env: (process.env.NODE_ENV as any) || 'development',
  port: Number(process.env.PORT) || 5001,
  corsOrigins,
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'learnlens_dev_jwt_secret_2026'),
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
    // 1. Mandatory Strong JWT Secret in Production (Halts startup if missing or weak)
    if (!config.jwtSecret || config.jwtSecret === 'CRITICAL_PROD_SECRET_OVERRIDE_REQUIRED' || config.jwtSecret === 'learnlens_dev_jwt_secret_2026' || config.jwtSecret.length < 32) {
      throw new Error('FATAL CONFIGURATION ERROR: Production requires a secure, high-entropy JWT_SECRET of at least 32 characters. Server startup halted.');
    }

    // 2. Mandatory Explicit CORS Allowlist in Production (Halts startup if wildcard or unconfigured)
    if (!Array.isArray(config.corsOrigins) || config.corsOrigins.length === 0 || config.corsOrigins.includes('*')) {
      throw new Error('FATAL CONFIGURATION ERROR: Production requires an explicitly configured CORS_ORIGIN or FRONTEND_URL allowlist. Wildcard "*" is strictly forbidden in production. Server startup halted.');
    }

    // 3. Mandatory High-Entropy Faculty Key in Production
    if (!config.facultyInviteKey || config.facultyInviteKey === 'FACULTY_VERIFIED_KEY_2026' || config.facultyInviteKey === 'DEV_FACULTY_SECRET_ONLY_2026' || config.facultyInviteKey.length < 32) {
      throw new Error('FATAL CONFIGURATION ERROR: LECTURER_INVITE_KEY must be set to a strong high-entropy secret in production (minimum 32 characters). Server startup halted.');
    }

    if (!config.geminiApiKey && !config.openaiApiKey) {
      console.info('[Config Notice]: External LLM API key not set; high-fidelity deterministic generation engine active.');
    }
  }
}

if (isProd) {
  validateProductionConfig();
}
