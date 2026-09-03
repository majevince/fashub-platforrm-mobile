/**
 * api-client stays platform-agnostic — it doesn't know about
 * expo-secure-store or any other storage mechanism. The app registers
 * callbacks here at startup (see apps/mobile/context/AuthContext.tsx) so
 * request() can attach the current access token to outgoing requests and
 * react when one is rejected as expired/invalid, without api-client
 * depending on how or where that token is actually stored.
 */
let getToken: (() => Promise<string | null>) | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthTokenProvider(fn: () => Promise<string | null>) {
  getToken = fn;
}

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function getCurrentToken(): Promise<string | null> {
  return getToken ? getToken() : null;
}

export function notifyUnauthorized() {
  onUnauthorized?.();
}
