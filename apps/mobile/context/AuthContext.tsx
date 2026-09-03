import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { secureStorage } from '../lib/secureStorage';
import { login as apiLogin, signup as apiSignup, setAuthTokenProvider, setUnauthorizedHandler } from '@fashub/api-client';
import type { User, LoginPayload, SignupPayload } from '@fashub/types';

const TOKEN_KEY = 'fashub_access_token';
const REFRESH_TOKEN_KEY = 'fashub_refresh_token';
const USER_KEY = 'fashub_user';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
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

  const signup = useCallback(
    async (payload: SignupPayload) => {
      const res = await apiSignup(payload);
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

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export async function getAccessToken(): Promise<string | null> {
  return secureStorage.getItemAsync(TOKEN_KEY);
}
