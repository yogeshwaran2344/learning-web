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

  // Allow seamless guest access for student workflows (upload, learn, generate, verify) so students are never blocked by 401
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
