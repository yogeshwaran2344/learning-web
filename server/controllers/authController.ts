import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuthService } from '../services/authService';

export class AuthController {
  static register(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, password, role, lecturerInviteKey } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: 'Name and email are required.' });
      }
      if (!password || typeof password !== 'string' || password.trim().length < 10) {
        return res.status(400).json({ error: 'Password must be at least 10 characters long and contain uppercase, lowercase, and numbers/symbols.' });
      }
      const result = AuthService.register(name, email, password, role, lecturerInviteKey);
      const { passwordHash, ...safeUser } = result.user;
      res.status(201).json({ user: safeUser, token: result.token });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      const result = AuthService.login(email, password);
      const { passwordHash, ...safeUser } = result.user;
      res.json({ user: safeUser, token: result.token });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const { passwordHash, ...safeUser } = req.user;
    res.json({ user: safeUser });
  }
}
