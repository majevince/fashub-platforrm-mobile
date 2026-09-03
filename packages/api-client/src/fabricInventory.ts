import { apiGet, apiPost, apiPatch, apiDelete } from './http';
import type { FabricInventoryItem, CreateFabricPayload, UpdateFabricPayload } from '@fashub/types';

/** Matches GET /api/fabric-inventory/global exactly — the cross-tenant catalog every designer/tailor sees. */
export function getGlobalFabrics(opts: { q?: string; inStock?: boolean; ownerId?: string } = {}): Promise<{ fabrics: FabricInventoryItem[] }> {
  const params = new URLSearchParams();
  if (opts.q) params.set('q', opts.q);
  if (opts.inStock !== undefined) params.set('inStock', String(opts.inStock));
  if (opts.ownerId) params.set('ownerId', opts.ownerId);
  const qs = params.toString();
  return apiGet(`/api/fabric-inventory/global${qs ? `?${qs}` : ''}`);
}

/** Matches GET /api/fabric-inventory?userId= exactly — the caller's own fabrics only. */
export function getMyFabrics(
  userId: string,
  opts: { q?: string; type?: string; color?: string; pattern?: string; usage?: string; season?: string; inStock?: boolean } = {}
): Promise<{ fabrics: FabricInventoryItem[] }> {
  const params = new URLSearchParams({ userId });
  if (opts.q) params.set('q', opts.q);
  if (opts.type) params.set('type', opts.type);
  if (opts.color) params.set('color', opts.color);
  if (opts.pattern) params.set('pattern', opts.pattern);
  if (opts.usage) params.set('usage', opts.usage);
  if (opts.season) params.set('season', opts.season);
  if (opts.inStock !== undefined) params.set('inStock', String(opts.inStock));
  return apiGet(`/api/fabric-inventory?${params.toString()}`);
}

/** Matches GET /api/fabric-inventory/[id] exactly. */
export function getFabric(id: string): Promise<{ fabric: FabricInventoryItem }> {
  return apiGet(`/api/fabric-inventory/${id}`);
}

/** Matches POST /api/fabric-inventory exactly. */
export function createFabric(payload: CreateFabricPayload): Promise<{ fabric: FabricInventoryItem }> {
  return apiPost('/api/fabric-inventory', payload);
}

/** Matches PATCH /api/fabric-inventory/[id] exactly — owner-only, enforced server-side. */
export function updateFabric(id: string, payload: UpdateFabricPayload): Promise<{ fabric: FabricInventoryItem }> {
  return apiPatch(`/api/fabric-inventory/${id}`, payload);
}

/** Matches DELETE /api/fabric-inventory/[id]?userId= exactly — owner-only, enforced server-side. */
export function deleteFabric(id: string, userId: string): Promise<{ success: boolean }> {
  return apiDelete(`/api/fabric-inventory/${id}?userId=${userId}`);
}
