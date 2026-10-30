import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

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

/**
 * Safely retrieves or automatically generates a persistent high-entropy cryptographic secret.
 * In production or cloud deployments (Render/Railway), if the user hasn't explicitly supplied
 * an environment variable, this prevents startup crashes by generating a secure, non-predictable
 * 256-bit CSPRNG secret and storing it in server/data/.
 */
function getOrGeneratePersistentSecret(envKey: string, secretFilename: string, byteLength: number = 32): string {
  const envVal = process.env[envKey];
  if (envVal && envVal.trim().length >= 32) {
    return envVal.trim();
  }

  // In non-production without envVal, use development fallback
  if (!isProd && !envVal) {
    return envKey === 'JWT_SECRET' ? 'learnlens_dev_jwt_secret_2026' : 'DEV_FACULTY_SECRET_ONLY_2026';
  }

  // In production (or when envVal is empty/invalid), auto-generate high-entropy random secret and persist
  const secretPath = path.resolve(dataDir, secretFilename);
  try {
    if (fs.existsSync(secretPath)) {
      const stored = fs.readFileSync(secretPath, 'utf8').trim();
      if (stored.length >= 32) {
        return stored;
      }
    }
    const generated = crypto.randomBytes(byteLength).toString('hex');
    fs.writeFileSync(secretPath, generated, { encoding: 'utf8' });
    console.info(`[Security Auto-Config]: Generated persistent high-entropy ${envKey} (${generated.length} chars) stored at ${secretFilename}`);
    return generated;
  } catch (e) {
    return crypto.randomBytes(byteLength).toString('hex');
  }
}

// Configure allowed frontend origins
const defaultProdOrigins = [
  'http://localhost:5001',
  'https://localhost:5001',
  'http://localhost:5173',
  'https://localhost:5173',
  'https://learning-web-w71q.onrender.com'
];
if (process.env.RENDER_EXTERNAL_URL) {
  defaultProdOrigins.push(process.env.RENDER_EXTERNAL_URL);
}
if (process.env.RENDER_EXTERNAL_HOSTNAME) {
  defaultProdOrigins.push(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
}

const rawCorsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';
const corsOrigins = isProd
  ? (rawCorsOrigin ? rawCorsOrigin.split(',').map(s => s.trim()).filter(Boolean) : defaultProdOrigins)
  : (rawCorsOrigin ? rawCorsOrigin.split(',').map(s => s.trim()).filter(Boolean) : '*');

export const config: AppConfig = {
  env: (process.env.NODE_ENV as any) || 'development',
  port: Number(process.env.PORT) || 5001,
  corsOrigins,
  jwtSecret: getOrGeneratePersistentSecret('JWT_SECRET', '.jwt_secret', 32),
  maxUploadSizeMb: 25,
  maxUploadSizeBytes: 25 * 1024 * 1024, // 25 MB limit
  rateLimitWindowMs: 15 * 60 * 1000,     // 15 minutes
  maxRequestsPerWindow: 300,             // 300 req per 15 min per IP
  aiRateLimitWindowMs: 60 * 1000,        // 1 minute
  maxAiRequestsPerMinute: 20,            // Max 20 AI generation requests per minute
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  facultyInviteKey: getOrGeneratePersistentSecret('LECTURER_INVITE_KEY', '.faculty_key', 32),
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
