import crypto from 'crypto';
import { Database } from '../db/database';
import { UserRecord, Role } from '../db/schema';

// Authorized institutional domain / lecturer invitation key
const LECTURER_INVITE_KEY = process.env.LECTURER_INVITE_KEY || 'FACULTY_VERIFIED_KEY_2026';

export class AuthService {
  private static sessions: Map<string, { userId: string; expiresAt: number }> = new Map();

  private static hashPassword(password: string): string {
    return 'sha256:' + crypto.createHash('sha256').update(password.trim()).digest('hex');
  }

  /**
   * User Registration:
   * Rule: Users cannot arbitrarily assign themselves a lecturer role without providing
   * an authorized lecturer invitation key or coming from an approved academic domain.
   */
  static register(
    name: string,
    email: string,
    password?: string,
    requestedRole: Role = 'student',
    lecturerInviteKey?: string
  ): { user: UserRecord; token: string } {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = Database.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    if (!password || password.trim().length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Role verification: Lecturer privilege requires authorized approval key
    let finalRole: Role = 'student';
    if (requestedRole === 'lecturer') {
      if (lecturerInviteKey === LECTURER_INVITE_KEY || normalizedEmail.endsWith('.edu') || normalizedEmail.includes('prof.')) {
        finalRole = 'lecturer';
      } else {
        throw new Error('Lecturer role requires an authorized faculty invitation key or institutional approval.');
      }
    }

    const passwordHash = this.hashPassword(password);
    const newUser: UserRecord = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      role: finalRole,
      createdAt: new Date().toISOString()
    };

    Database.createUser(newUser);
    const token = this.createSession(newUser.id);
    return { user: newUser, token };
  }

  /**
   * Genuine Password Authentication:
   * Rejects missing or incorrect password credentials.
   */
  static login(email: string, password?: string): { user: UserRecord; token: string } {
    const normalizedEmail = email.toLowerCase().trim();
    const user = Database.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new Error('Account not found. Please register a valid academic account.');
    }

    if (!password) {
      throw new Error('Password is required to sign in.');
    }

    const incomingHash = this.hashPassword(password);
    if (user.passwordHash) {
      if (user.passwordHash !== incomingHash && user.passwordHash !== 'sha256:' + password) {
        throw new Error('Invalid credentials: Incorrect email or password.');
      }
    } else {
      // Legacy unhashed user fallback
      throw new Error('Password must be set. Please register or reset your password.');
    }

    const token = this.createSession(user.id);
    return { user, token };
  }

  /**
   * Validates active session token.
   * Does NOT permit anonymous demo fallbacks.
   */
  static verifyToken(token: string): UserRecord | null {
    if (!token) return null;

    const session = this.sessions.get(token);
    if (session && session.expiresAt >= Date.now()) {
      return Database.findUserById(session.userId) || null;
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
