export type User = {
  /** Back4App (Parse) user objectId. */
  id: string;
  name: string;
  email: string;
};

/**
 * Everything the app needs from an auth provider. The app only talks to this
 * interface, so the Back4App implementation (`back4appAuth.ts`) can be swapped
 * for another backend without touching screens.
 */
export interface AuthService {
  register(input: { name: string; email: string; password: string }): Promise<User>;
  login(input: { email: string; password: string }): Promise<User>;
  logout(): Promise<void>;
  /** The signed-in user restored from the previous session, if any. */
  restoreSession(): Promise<User | null>;
}

export class AuthError extends Error {}
