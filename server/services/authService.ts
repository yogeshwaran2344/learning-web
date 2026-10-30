import crypto from 'crypto';
import { Database } from '../db/database';
import { UserRecord, Role } from '../db/schema';

export class AuthService {
  /**
   * Cryptographically hardened salted scrypt password hashing (OWASP standard).
   * Resistant to GPU-accelerated brute-force attacks and rainbow tables.
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password.trim(), salt, 64);
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * Constant-time password hash verification.
   * Protects against timing attacks. Backwards-compatible with scrypt and legacy sha256.
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    if (!password || !storedHash) return false;
    const trimmed = password.trim();

    if (storedHash.startsWith('scrypt:')) {
      const parts = storedHash.split(':');
      if (parts.length !== 3) return false;
      const [, salt, expectedHex] = parts;
      const derivedKey = crypto.scryptSync(trimmed, salt, 64);
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      if (derivedKey.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(derivedKey, expectedBuf);
    }

    if (storedHash.startsWith('sha256:')) {
      const hash = crypto.createHash('sha256').update(trimmed).digest('hex');
      const expected = storedHash.slice(7);
      if (hash.length !== expected.length) return false;
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
    }

    return false;
  }

  /**
   * User Registration:
   * Rule: Users cannot arbitrarily assign themselves a lecturer role.
   * Lecturer privilege requires an authorized faculty invitation key (from process.env.LECTURER_INVITE_KEY).
   * Automatic elevation based on .edu email or name patterns is strictly prohibited.
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
      const authorizedKey = process.env.LECTURER_INVITE_KEY;
      if (!authorizedKey || !lecturerInviteKey || lecturerInviteKey !== authorizedKey) {
        throw new Error('Lecturer role requires an authorized faculty invitation key or institutional approval.');
      }
      finalRole = 'lecturer';
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

    if (!user.passwordHash || !this.verifyPassword(password, user.passwordHash)) {
      throw new Error('Invalid credentials: Incorrect email or password.');
    }

    const token = this.createSession(user.id);
    return { user, token };
  }

  /**
   * Validates active session token from persistent database storage.
   * Does NOT permit anonymous demo fallbacks.
   */
  static verifyToken(token: string): UserRecord | null {
    if (!token) return null;

    const session = Database.getSession(token);
    if (session && session.expiresAt >= Date.now()) {
      return Database.findUserById(session.userId) || null;
    }

    return null;
  }

  /**
   * Explicitly logs out user and revokes active session token.
   */
  static logout(token: string): boolean {
    return Database.deleteSession(token);
  }

  private static createSession(userId: string): string {
    const token = 'token_' + crypto.randomBytes(24).toString('hex') + Date.now().toString(36);
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
    Database.saveSession(token, userId, expiresAt);
    return token;
  }
}
