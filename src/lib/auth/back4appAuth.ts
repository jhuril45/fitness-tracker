import { ErrorCode, ParseError, request, setSessionToken } from '../back4app';
import { deleteSession, getSession, setSession } from './sessionStore';
import { AuthError, type AuthService, type User } from './types';

// Accounts are Back4App (Parse) users: the email doubles as the username and
// Back4App stores the password hash. The device only keeps the session token.

const SESSION_KEY = 'fitness-tracker.session-token';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

type UserResponse = { objectId: string; name?: string; email?: string; username: string; sessionToken?: string };

function toUser(row: UserResponse): User {
  return { id: row.objectId, name: row.name ?? '', email: row.email ?? row.username };
}

async function startSession(token: string): Promise<void> {
  setSessionToken(token);
  await setSession(SESSION_KEY, token);
}

async function endSession(): Promise<void> {
  setSessionToken(null);
  await deleteSession(SESSION_KEY);
}

/** Turns server errors into messages the forms can show. */
function friendly(e: unknown, fallback: string): Error {
  if (!(e instanceof ParseError)) return e instanceof Error ? e : new AuthError(fallback);
  switch (e.code) {
    case ErrorCode.OBJECT_NOT_FOUND:
      // Same message for unknown email and wrong password, so the form doesn't
      // reveal which emails have accounts.
      return new AuthError('Incorrect email or password.');
    case ErrorCode.USERNAME_TAKEN:
    case ErrorCode.EMAIL_TAKEN:
      return new AuthError('An account with this email already exists.');
    case ErrorCode.INVALID_EMAIL:
      return new AuthError('Please enter a valid email.');
    default:
      return new AuthError(e.message || fallback);
  }
}

export function createBack4AppAuth(): AuthService {
  return {
    async register({ name, email, password }) {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanName) throw new AuthError('Please enter your name.');
      if (!EMAIL_PATTERN.test(cleanEmail)) throw new AuthError('Please enter a valid email.');
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new AuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      try {
        const created = await request<{ objectId: string; sessionToken: string }>('POST', '/users', {
          username: cleanEmail,
          email: cleanEmail,
          password,
          name: cleanName,
        });
        await startSession(created.sessionToken);
        return { id: created.objectId, name: cleanName, email: cleanEmail };
      } catch (e) {
        throw friendly(e, 'Could not create your account.');
      }
    },

    async login({ email, password }) {
      try {
        const row = await request<UserResponse>('POST', '/login', {
          username: email.trim().toLowerCase(),
          password,
        });
        await startSession(row.sessionToken!);
        return toUser(row);
      } catch (e) {
        throw friendly(e, 'Could not sign in.');
      }
    },

    async logout() {
      // Revoke the token on the server, but sign out locally even if that fails.
      await request('POST', '/logout').catch(() => {});
      await endSession();
    },

    async restoreSession() {
      const token = await getSession(SESSION_KEY);
      if (!token) return null;
      setSessionToken(token);
      try {
        return toUser(await request<UserResponse>('GET', '/users/me'));
      } catch (e) {
        if (e instanceof ParseError && e.code === ErrorCode.INVALID_SESSION_TOKEN) {
          await endSession();
          return null;
        }
        throw e;
      }
    },
  };
}
