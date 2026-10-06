import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { setInvalidSessionHandler } from '../back4app';
import { createBack4AppAuth } from './back4appAuth';
import type { AuthService, User } from './types';

type AuthState = {
  user: User | null;
  /** True until the previous session has been restored on launch. */
  isLoading: boolean;
  register: AuthService['register'];
  login: AuthService['login'];
  requestPasswordReset: AuthService['requestPasswordReset'];
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  service,
}: {
  children: React.ReactNode;
  /** Override to use a hosted backend instead of on-device accounts. */
  service?: AuthService;
}) {
  const auth = useMemo(() => service ?? createBack4AppAuth(), [service]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    auth
      .restoreSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [auth]);

  // If the server revokes the session mid-use, drop back to the sign-in screen.
  useEffect(() => {
    setInvalidSessionHandler(() => {
      auth.logout().catch(() => {});
      setUser(null);
    });
    return () => setInvalidSessionHandler(null);
  }, [auth]);

  const register = useCallback<AuthService['register']>(
    async (input) => {
      const created = await auth.register(input);
      setUser(created);
      return created;
    },
    [auth],
  );

  const login = useCallback<AuthService['login']>(
    async (input) => {
      const signedIn = await auth.login(input);
      setUser(signedIn);
      return signedIn;
    },
    [auth],
  );

  const requestPasswordReset = useCallback<AuthService['requestPasswordReset']>(
    (email) => auth.requestPasswordReset(email),
    [auth],
  );

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, [auth]);

  const value = useMemo(
    () => ({ user, isLoading, register, login, requestPasswordReset, logout }),
    [user, isLoading, register, login, requestPasswordReset, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** The signed-in user. Only call from screens behind the auth guard. */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('No signed-in user');
  return user;
}
