import { API_BASE_URL } from './config';

export type HealthStatus = {
  status: string;
  timestamp: string;
};

/**
 * Hits the web app's real /api/health route — a minimal, data-free proof
 * that the mobile container can actually reach the fashub app container
 * over the Docker network, ahead of any screen being wired to real content.
 */
export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json() as Promise<HealthStatus>;
}
