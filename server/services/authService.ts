import { Database } from '../db/database';
import { UserRecord, Role } from '../db/schema';

export class AuthService {
  private static sessions: Map<string, { userId: string; expiresAt: number }> = new Map();

  static register(name: string, email: string, role: Role = 'student'): { user: UserRecord; token: string } {
    const existing = Database.findUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const newUser: UserRecord = {
      id: 'usr-' + Date.now(),
      email,
      name,
      role,
      createdAt: new Date().toISOString()
    };

    Database.createUser(newUser);
    const token = this.createSession(newUser.id);
    return { user: newUser, token };
  }

  static login(email: string, role?: Role): { user: UserRecord; token: string } {
    let user = Database.findUserByEmail(email);
    if (!user) {
      // Auto-create demo account for quick sign-in
      user = Database.createUser({
        id: 'usr-' + Date.now(),
        email,
        name: email.split('@')[0],
        role: role || (email.includes('prof') ? 'lecturer' : 'student'),
        createdAt: new Date().toISOString()
      });
    }

    const token = this.createSession(user.id);
    return { user, token };
  }

  static verifyToken(token: string): UserRecord | null {
    const session = this.sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    return Database.findUserById(session.userId) || null;
  }

  private static createSession(userId: string): string {
    const token = 'token_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    this.sessions.set(token, {
      userId,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
    });
    return token;
  }
}
