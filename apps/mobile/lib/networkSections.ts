import type { NetworkProfile, NetworkSort } from '@fashub/types';

/** Ported 1:1 from app/network/page.tsx's haversine (lines 82-92) — km, same formula/precision. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Ported 1:1 from app/network/page.tsx's `sortBy==='recommended'` scoring (lines ~550-568). */
export function recommendedScore(p: NetworkProfile, distanceKm: number | null): number {
  return p.rating * 10 + Math.log1p(p.followerCount) * 2 - Math.log1p(distanceKm ?? 9999) * 0.5;
}

export function sortProfiles(list: NetworkProfile[], sortBy: NetworkSort, distances: Map<string, number>): NetworkProfile[] {
  const withDist = (p: NetworkProfile) => distances.get(p.id) ?? 9999;
  const copy = [...list];
  switch (sortBy) {
    case 'nearest':
      return copy.sort((a, b) => withDist(a) - withDist(b));
    case 'top-rated':
      return copy.sort((a, b) => b.rating - a.rating);
    case 'most-followed':
      return copy.sort((a, b) => b.followerCount - a.followerCount);
    case 'newest':
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'recommended':
    default:
      return copy.sort((a, b) => recommendedScore(b, distances.get(b.id) ?? null) - recommendedScore(a, distances.get(a.id) ?? null));
  }
}

const WEDDING_RE = /wedding|bridal|bride|gown/i;

export type NetworkSection = { key: string; title: string; icon: 'pin' | 'star' | 'heart' | 'trending' | 'sparkle'; profiles: NetworkProfile[] };

/**
 * All 5 sections are client-side slices of one array on web — confirmed no
 * separate section endpoints exist. Ported 1:1 (lines 577-615): each takes
 * the first 12 after its own filter/sort, from `discoverProfiles` (everyone
 * the current user doesn't already follow).
 */
export function buildSections(discoverProfiles: NetworkProfile[], currentUser: { city?: string | null; country?: string | null }, distances: Map<string, number>): NetworkSection[] {
  const sections: NetworkSection[] = [];

  const nearby = currentUser.city
    ? discoverProfiles.filter((p) => p.city?.toLowerCase() === currentUser.city?.toLowerCase())
    : [];
  const nearbyFallback = nearby.length > 0 ? nearby : currentUser.country ? discoverProfiles.filter((p) => p.country === currentUser.country) : [];
  const nearbyFinal = (nearbyFallback.length > 0 ? nearbyFallback : discoverProfiles.filter((p) => (distances.get(p.id) ?? 9999) < 100))
    .sort((a, b) => (distances.get(a.id) ?? 9999) - (distances.get(b.id) ?? 9999))
    .slice(0, 12);
  if (nearbyFinal.length > 0) {
    sections.push({ key: 'nearby', title: currentUser.city ? `People in ${currentUser.city}` : 'People Near You', icon: 'pin', profiles: nearbyFinal });
  }

  const topRated = discoverProfiles.filter((p) => p.rating >= 4).sort((a, b) => b.rating - a.rating).slice(0, 12);
  if (topRated.length > 0) sections.push({ key: 'top-rated', title: 'Top Rated Professionals', icon: 'star', profiles: topRated });

  const wedding = discoverProfiles.filter((p) => WEDDING_RE.test(p.specialties.join(' ')) || WEDDING_RE.test(p.bio ?? '')).slice(0, 12);
  if (wedding.length > 0) sections.push({ key: 'wedding', title: 'Wedding Specialists', icon: 'heart', profiles: wedding });

  const trending = [...discoverProfiles].sort((a, b) => b.followerCount - a.followerCount).slice(0, 12);
  if (trending.length > 0) sections.push({ key: 'trending', title: 'Trending in Fashion', icon: 'trending', profiles: trending });

  const newest = [...discoverProfiles].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);
  if (newest.length > 0) sections.push({ key: 'newest', title: 'New on FaSHub', icon: 'sparkle', profiles: newest });

  return sections;
}
