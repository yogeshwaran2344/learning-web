import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserRecord } from '../db/schema';

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = AuthService.verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Fallback: Default demo student account if unauthenticated
  req.user = {
    id: 'usr-student-1',
    email: 'alex.rivera@university.edu',
    name: 'Alex Rivera',
    role: 'student',
    createdAt: '2026-10-01T10:00:00Z'
  };

  next();
}

export function requireLecturerRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'lecturer') {
    return res.status(403).json({ error: 'Access denied: Lecturer privileges required.' });
  }
  next();
}
