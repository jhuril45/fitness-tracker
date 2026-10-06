export type User = {
  id: number;
  name: string;
  email: string;
};

/**
 * Everything the app needs from an auth provider. The app only talks to this
 * interface, so the on-device implementation (`localAuth.ts`) can be swapped
 * for a hosted backend such as Supabase or Firebase without touching screens.
 */
export interface AuthService {
  register(input: { name: string; email: string; password: string }): Promise<User>;
  login(input: { email: string; password: string }): Promise<User>;
  logout(): Promise<void>;
  /** The signed-in user restored from the previous session, if any. */
  restoreSession(): Promise<User | null>;
}

export class AuthError extends Error {}
