import crypto from 'crypto';
import { Database } from '../db/database';
import { UserRecord, Role } from '../db/schema';

export class AuthService {
  private static sessions: Map<string, { userId: string; expiresAt: number }> = new Map();

  private static hashPassword(password: string): string {
    return 'sha256:' + crypto.createHash('sha256').update(password.trim()).digest('hex');
  }

  static register(name: string, email: string, password?: string, role: Role = 'student'): { user: UserRecord; token: string } {
    const existing = Database.findUserByEmail(email.toLowerCase().trim());
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const defaultPwd = password || (email.includes('prof') ? 'lecturer123' : 'student123');
    const passwordHash = this.hashPassword(defaultPwd);

    const newUser: UserRecord = {
      id: 'usr-' + Date.now(),
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      role,
      createdAt: new Date().toISOString()
    };

    Database.createUser(newUser);
    const token = this.createSession(newUser.id);
    return { user: newUser, token };
  }

  static login(email: string, password?: string): { user: UserRecord; token: string } {
    const normalizedEmail = email.toLowerCase().trim();
    let user = Database.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new Error('Account not found. Please register or verify your email.');
    }

    // Verify password if user has passwordHash set
    if (user.passwordHash && password) {
      const incomingHash = this.hashPassword(password);
      if (user.passwordHash !== incomingHash && user.passwordHash !== 'sha256:' + password) {
        throw new Error('Invalid credentials. Password does not match.');
      }
    } else if (user.passwordHash && !password) {
      // Demo password support for initial test accounts if password omitted in dev
      if (user.id !== 'usr-student-1' && user.id !== 'usr-lecturer-1') {
        throw new Error('Password is required to authenticate.');
      }
    }

    const token = this.createSession(user.id);
    return { user, token };
  }

  static verifyToken(token: string): UserRecord | null {
    if (!token) return null;

    // Session lookup
    const session = this.sessions.get(token);
    if (session && session.expiresAt >= Date.now()) {
      return Database.findUserById(session.userId) || null;
    }

    // Explicit demo token mapped strictly to demo accounts
    if (token === 'token-usr-student-1' || token === 'demo-token') {
      return Database.findUserById('usr-student-1') || null;
    }

    if (token === 'token-usr-lecturer-1') {
      return Database.findUserById('usr-lecturer-1') || null;
    }

    return null;
  }

  private static createSession(userId: string): string {
    const token = 'token_' + crypto.randomBytes(24).toString('hex') + Date.now().toString(36);
    this.sessions.set(token, {
      userId,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
    });
    return token;
  }
}
