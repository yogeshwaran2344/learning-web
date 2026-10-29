import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const standardLimits = new Map<string, RateLimitRecord>();
const aiLimits = new Map<string, RateLimitRecord>();

// Clean up expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of standardLimits.entries()) {
    if (now > record.resetTime) standardLimits.delete(key);
  }
  for (const [key, record] of aiLimits.entries()) {
    if (now > record.resetTime) aiLimits.delete(key);
  }
}, 5 * 60 * 1000);

function getClientIdentifier(req: Request): string {
  // Support reverse proxy headers (X-Forwarded-For, CF-Connecting-IP)
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Standard API Rate Limiter (Protects all general endpoints)
 */
export function standardRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIdentifier(req);
  const now = Date.now();
  let record = standardLimits.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + config.rateLimitWindowMs };
    standardLimits.set(ip, record);
    res.setHeader('X-RateLimit-Limit', config.maxRequestsPerWindow);
    res.setHeader('X-RateLimit-Remaining', config.maxRequestsPerWindow - 1);
    return next();
  }

  record.count++;
  res.setHeader('X-RateLimit-Limit', config.maxRequestsPerWindow);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequestsPerWindow - record.count));

  if (record.count > config.maxRequestsPerWindow) {
    return res.status(429).json({
      error: 'Too Many Requests: Rate limit exceeded. Please wait before making further requests.',
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  next();
}

/**
 * Strict AI Request Rate Limiter (Protects expensive model generation requests)
 */
export function aiRequestRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIdentifier(req);
  const now = Date.now();
  let record = aiLimits.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + config.aiRateLimitWindowMs };
    aiLimits.set(ip, record);
    return next();
  }

  record.count++;
  if (record.count > config.maxAiRequestsPerMinute) {
    return res.status(429).json({
      error: 'Generation Limit Reached: Too many learning material generation requests. Please wait a minute before generating again.',
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  next();
}
