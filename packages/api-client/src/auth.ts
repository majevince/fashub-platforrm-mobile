import { apiGet, apiPost } from './http';
import type { LoginPayload, SignupPayload, AuthResponse, AppleSsoUser } from '@fashub/types';

/** Matches app/api/auth/login/route.ts exactly: POST {email, password} -> {message, user, token, refreshToken}. */
export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/login', payload);
}

/** Matches app/api/auth/signup/route.ts: POST {email, password, displayName, role, profileData?} -> same AuthResponse shape, 201. */
export function signup(payload: SignupPayload): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/signup', payload);
}

/**
 * Matches app/api/auth/forgot-password/route.ts — always resolves with the
 * same generic message regardless of whether the account exists, by design
 * (prevents email enumeration). Only rejects on a real transport/rate-limit
 * failure.
 */
export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/api/auth/forgot-password', { email });
}

/** Matches the GET handler in app/api/auth/reset-password/route.ts — validates a token without consuming it. */
export function validateResetToken(token: string): Promise<{ valid: boolean }> {
  return apiGet<{ valid: boolean }>(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
}

/** Matches the POST handler in the same route — consumes the token and rotates the password. */
export function resetPassword(token: string, password: string, confirmPassword: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/api/auth/reset-password', { token, password, confirmPassword });
}

/**
 * Matches app/api/auth/sso/google/route.ts: POST {idToken} -> AuthResponse.
 * `idToken` is the raw Google-issued ID token from whichever native/JS
 * Google Sign-In flow ran on this platform — the backend verifies it
 * against Google's public keys, this call does no verification itself.
 */
export function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/sso/google', { idToken });
}

/**
 * Matches app/api/auth/sso/apple/route.ts: POST {identityToken, user?} ->
 * AuthResponse. `user` is only ever non-null on the very first authorization
 * for this app (Apple's own behavior, not something this SDK controls) —
 * pass through whatever expo-apple-authentication returned, unmodified.
 */
export function loginWithApple(identityToken: string, user?: AppleSsoUser): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/sso/apple', { identityToken, user });
}
