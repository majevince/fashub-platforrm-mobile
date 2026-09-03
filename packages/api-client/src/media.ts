import { API_BASE_URL } from './config';

/**
 * API responses return media as relative paths (e.g. "/api/media/profiles/x.webp",
 * "/uploads/covers/y.webp") — confirmed against a real login response, not
 * assumed. Native <Image>/expo-image need absolute URLs, so every relative
 * path from the API needs to go through this before rendering.
 */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
