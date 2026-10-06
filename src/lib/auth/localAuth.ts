import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';

import { AuthError, type AuthService, type User } from './types';

// Accounts live in the on-device SQLite database. Passwords are never stored:
// only a random per-user salt and an iterated, salted SHA-256 hash.
//
// This keeps accounts private to the phone they were created on. To sync across
// devices, implement `AuthService` against a real backend and pass it to
// `AuthProvider` instead.

const SESSION_KEY = 'fitness-tracker.session.user-id';
const HASH_ROUNDS = 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  let hash = `${salt}:${password}`;
  for (let i = 0; i < HASH_ROUNDS; i++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${hash}`);
  }
  return hash;
}

/** Compares two hex strings without exiting early on the first mismatch. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toUser(row: Pick<UserRow, 'id' | 'name' | 'email'>): User {
  return { id: row.id, name: row.name, email: row.email };
}

export function createLocalAuth(db: SQLiteDatabase): AuthService {
  return {
    async register({ name, email, password }) {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanName) throw new AuthError('Please enter your name.');
      if (!EMAIL_PATTERN.test(cleanEmail)) throw new AuthError('Please enter a valid email.');
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new AuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }

      const existing = await db.getFirstAsync('SELECT id FROM users WHERE email = ?', cleanEmail);
      if (existing) throw new AuthError('An account with this email already exists.');

      const salt = toHex(Crypto.getRandomBytes(16));
      const hash = await hashPassword(password, salt);
      const result = await db.runAsync(
        'INSERT INTO users (name, email, password_hash, password_salt) VALUES (?, ?, ?, ?)',
        cleanName,
        cleanEmail,
        hash,
        salt,
      );
      const user = { id: result.lastInsertRowId, name: cleanName, email: cleanEmail };
      await SecureStore.setItemAsync(SESSION_KEY, String(user.id));
      return user;
    },

    async login({ email, password }) {
      const row = await db.getFirstAsync<UserRow>(
        'SELECT * FROM users WHERE email = ?',
        email.trim().toLowerCase(),
      );
      // Same message for unknown email and wrong password, so the form doesn't
      // reveal which emails have accounts.
      const invalid = new AuthError('Incorrect email or password.');
      if (!row) throw invalid;
      const hash = await hashPassword(password, row.password_salt);
      if (!safeEqual(hash, row.password_hash)) throw invalid;
      await SecureStore.setItemAsync(SESSION_KEY, String(row.id));
      return toUser(row);
    },

    async logout() {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    },

    async restoreSession() {
      const stored = await SecureStore.getItemAsync(SESSION_KEY);
      if (!stored) return null;
      const row = await db.getFirstAsync<UserRow>(
        'SELECT id, name, email FROM users WHERE id = ?',
        Number(stored),
      );
      if (!row) {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        return null;
      }
      return toUser(row);
    },
  };
}
