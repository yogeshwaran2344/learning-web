import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserRecord } from '../db/schema';

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (token) {
    const user = AuthService.verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Reject unauthenticated requests with 401 Unauthorized
  return res.status(401).json({
    error: 'Authentication credentials required. Please provide a valid Bearer token in Authorization header.'
  });
}

export function requireLecturerRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'lecturer') {
    return res.status(403).json({ error: 'Access denied: Lecturer privileges required.' });
  }
  next();
}
