import type { MatchedProfessional, Badge } from '@fashub/types';
import { BADGE_PRIORITY } from '@fashub/types';

// Matches web's CurrencySelector currency list (app/search/page.tsx) — symbol lookup for price formatting.
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', NGN: '₦', GBP: '£', EUR: '€', INR: '₹', AED: 'د.إ', KES: 'KSh', JPY: '¥', KRW: '₩', ZAR: 'R',
};

const TIER_SYMBOLS: Record<MatchedProfessional['priceRange'], string> = {
  budget: '$', moderate: '$$', premium: '$$$', luxury: '$$$$',
};

/** Matches web's PriceDisplay component exactly — converted range if available, else tier symbols. */
export function formatPrice(pro: MatchedProfessional): string {
  if (pro.convertedPriceMin != null && pro.convertedPriceMax != null) {
    const symbol = CURRENCY_SYMBOLS[pro.displayCurrency ?? 'USD'] ?? '$';
    return `${symbol}${Math.round(pro.convertedPriceMin).toLocaleString()} – ${symbol}${Math.round(pro.convertedPriceMax).toLocaleString()}`;
  }
  return TIER_SYMBOLS[pro.priceRange] ?? '$';
}

/** Matches web's "starting" price on the recommended-carousel's smaller card. */
export function formatStartingPrice(pro: MatchedProfessional): string {
  if (pro.convertedPriceMin != null) {
    const symbol = CURRENCY_SYMBOLS[pro.displayCurrency ?? 'USD'] ?? '$';
    return `${symbol}${Math.round(pro.convertedPriceMin).toLocaleString()} starting`;
  }
  return `${TIER_SYMBOLS[pro.priceRange] ?? '$'} starting`;
}

export function formatLocation(pro: MatchedProfessional): string {
  const parts = [pro.location.city, pro.location.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Location unknown';
}

/** Matches web's badgePriority ordering + .slice(0, max) truncation (MatchResultCard.tsx). */
export function visibleBadges(badges: Badge[], max: number): Badge[] {
  const present = new Set(badges);
  return BADGE_PRIORITY.filter((b) => present.has(b)).slice(0, max);
}

/** Matches web's specialties.slice(0, 5) + "+N" overflow (MatchResultCard.tsx). */
export function visibleTags(specialties: string[], max = 5): { shown: string[]; overflow: number } {
  return { shown: specialties.slice(0, max), overflow: Math.max(0, specialties.length - max) };
}
