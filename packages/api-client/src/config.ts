/**
 * EXPO_PUBLIC_* env vars are inlined into the JS bundle at build time by
 * Expo's babel preset — set via the mobile container's `environment:` block
 * in docker-compose.yml (EXPO_PUBLIC_API_URL=http://app:3000, resolving the
 * fashub web app's container by its Docker-network service name). Falls
 * back to localhost:3000 for running outside Docker against a local `npm
 * run dev` on the web repo.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
