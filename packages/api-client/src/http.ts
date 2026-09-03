import { API_BASE_URL } from './config';
import { getCurrentToken, notifyUnauthorized } from './session';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = await getCurrentToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> | undefined ?? {}),
  };

  // TEMPORARY — debugging the native login failure. Remove once confirmed fixed.
  if (process.env.NODE_ENV !== 'production') {
    console.log('[api-client] ->', init?.method ?? 'GET', url, 'body:', init?.body ?? null);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (err) {
    // fetch() throwing (vs. resolving with a non-2xx) means the request never
    // reached a server at all — DNS/connection failure, not an API error.
    if (process.env.NODE_ENV !== 'production') {
      console.log('[api-client] <- NETWORK ERROR for', url, err);
    }
    throw new ApiError(
      err instanceof Error ? `Network error: ${err.message}` : 'Network error',
      0
    );
  }

  const rawText = await response.text();
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[api-client] <-',
      response.status,
      url,
      'headers:',
      JSON.stringify(Object.fromEntries(response.headers.entries())),
      'body:',
      rawText
    );
  }

  let data: { error?: string } = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    // Non-JSON response body (e.g. an HTML error page from a proxy) — fall
    // through with an empty object so the status-based error message below
    // still fires instead of throwing here.
  }

  if (!response.ok) {
    // Only treat a 401 as "session expired" when this request actually
    // carried a token — login/signup also return 401 for plain wrong
    // credentials, which is a normal form error, not an expired session.
    if (response.status === 401 && token) {
      notifyUnauthorized();
    }
    const message = typeof data?.error === 'string' ? data.error : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}
