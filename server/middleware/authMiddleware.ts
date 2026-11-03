import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserRecord } from '../db/schema';

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // Strict token extraction: Bearer token in Authorization header ONLY.
  // Query-string tokens are rejected to prevent leakage in proxy/browser logs and referrer headers.
  if (req.query?.token) {
    return res.status(401).json({ error: 'Tokens in query string are rejected. Use Authorization Bearer header.' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (token) {
    const user = AuthService.verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // If uploading or generating study materials, allow seamless guest access so students are never blocked
  const url = req.url || '';
  if (url.includes('/upload') || url.includes('/generate') || url.includes('/explain-this') || url.includes('/ask-question') || url.includes('/materials')) {
    req.user = {
      id: 'guest-student',
      name: 'Student Learner',
      email: 'guest.student@learnova.internal',
      passwordHash: '',
      role: 'student',
      gender: 'female',
      createdAt: new Date().toISOString()
    };
    return next();
  }

  return res.status(401).json({ error: 'Authentication required: Missing or invalid token.' });
}

export function requireLecturerRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'lecturer' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Lecturer privileges required.' });
  }
  next();
}

export function requireAdminRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }
  next();
}
