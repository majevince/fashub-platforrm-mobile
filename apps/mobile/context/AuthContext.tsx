import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { secureStorage } from '../lib/secureStorage';
import {
  login as apiLogin,
  signup as apiSignup,
  loginWithGoogle as apiLoginWithGoogle,
  loginWithApple as apiLoginWithApple,
  setAuthTokenProvider,
  setUnauthorizedHandler,
} from '@fashub/api-client';
import type { User, LoginPayload, SignupPayload, AppleSsoUser } from '@fashub/types';

const TOKEN_KEY = 'fashub_access_token';
const REFRESH_TOKEN_KEY = 'fashub_refresh_token';
const USER_KEY = 'fashub_user';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, appleUser?: AppleSsoUser) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedUser = await secureStorage.getItemAsync(USER_KEY);
      if (!cancelled && storedUser) {
        setUser(JSON.parse(storedUser) as User);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = useCallback(async (nextUser: User, token: string, refreshToken: string) => {
    await secureStorage.setItemAsync(TOKEN_KEY, token);
    await secureStorage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    await secureStorage.setItemAsync(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await apiLogin(payload);
      await persistSession(res.user, res.token, res.refreshToken);
    },
    [persistSession]
  );

  // Matches web's real signup flow (app/auth/signup/page.tsx) exactly: the
  // signup endpoint does return a full auth response (token included, same
  // shape as login), but web deliberately never uses it to establish a
  // session — it redirects to the login screen instead, requiring the new
  // user to sign in with the credentials they just chose. Auto-logging in
  // here would silently diverge from that.
  const signup = useCallback(async (payload: SignupPayload) => {
    await apiSignup(payload);
  }, []);

  // Unlike password signup above, Google/Apple sign-in has no password to
  // send the person back to re-enter — a successful response establishes
  // the session immediately, same as login.
  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const res = await apiLoginWithGoogle(idToken);
      await persistSession(res.user, res.token, res.refreshToken);
    },
    [persistSession]
  );

  const loginWithApple = useCallback(
    async (identityToken: string, appleUser?: AppleSsoUser) => {
      const res = await apiLoginWithApple(identityToken, appleUser);
      await persistSession(res.user, res.token, res.refreshToken);
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    await secureStorage.deleteItemAsync(TOKEN_KEY);
    await secureStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
    await secureStorage.deleteItemAsync(USER_KEY);
    setUser(null);
  }, []);

  // Registered once: lets api-client attach the current token to outgoing
  // requests (getAccessToken) and clear the session when the server rejects
  // one as expired/invalid (logout) — without api-client knowing anything
  // about SecureStore. A 401 here means Stack.Protected in app/_layout.tsx
  // sees user become null and swaps to the (auth) group on its own; no
  // manual redirect needed.
  useEffect(() => {
    setAuthTokenProvider(getAccessToken);
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, loginWithApple, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export async function getAccessToken(): Promise<string | null> {
  return secureStorage.getItemAsync(TOKEN_KEY);
}
