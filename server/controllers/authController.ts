import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuthService } from '../services/authService';

export class AuthController {
  static register(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, password, role } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: 'Name and email are required.' });
      }
      const result = AuthService.register(name, email, password, role);
      res.status(201).json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }
      const result = AuthService.login(email, password);
      res.json(result);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  static me(req: AuthenticatedRequest, res: Response) {
    res.json({ user: req.user });
  }
}
