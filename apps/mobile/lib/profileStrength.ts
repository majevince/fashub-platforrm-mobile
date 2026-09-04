import type { ProfileDetail, ProfessionalProfileDetail } from '@fashub/types';

export interface ProfileStrengthField {
  label: string;
  done: boolean;
  weight: number;
}

/**
 * Ports web's calcCompletion() (components/profile/ProfileCompletionGauge.tsx)
 * field-for-field and weight-for-weight — designer/tailor only, computed
 * entirely client-side on web too (never returned pre-computed by an API),
 * so this mirrors that rather than inventing a different formula. Flagged
 * in the Dashboard rebuild report: this duplicates scoring logic across two
 * codebases and will silently drift if web's weights ever change without a
 * matching mobile edit — an API-computed score would be more robust, but
 * that's a backend change outside this ticket's scope.
 */
export function calcProfileStrength(
  profile: ProfileDetail,
  detail: ProfessionalProfileDetail | null | undefined,
  role: 'designer' | 'tailor'
): { percentage: number; fields: ProfileStrengthField[] } {
  const servicesConfigured =
    role === 'designer'
      ? !!(detail?.customDesign || detail?.alterations || detail?.consulting || detail?.onlineOrders || detail?.inPersonConsultation)
      : !!(detail?.alterations || detail?.repairs || detail?.customTailoring || detail?.urgentService || detail?.pickupDelivery);

  const fields: ProfileStrengthField[] = [
    { label: 'Profile photo', done: !!profile.avatar, weight: 10 },
    { label: 'Display name', done: !!profile.displayName?.trim(), weight: 5 },
    { label: 'Bio / About me', done: !!detail?.bio?.trim(), weight: 10 },
    { label: 'Phone number', done: !!detail?.phone?.trim(), weight: 10 },
    { label: 'Location', done: !!(detail?.city || detail?.country), weight: 10 },
    { label: 'Business name', done: !!detail?.businessName?.trim(), weight: 5 },
    { label: 'Specialties', done: !!detail?.specialties?.length, weight: 10 },
    { label: 'Years of experience', done: !!(detail?.yearsOfExperience && detail.yearsOfExperience > 0), weight: 5 },
    { label: 'Services', done: servicesConfigured, weight: 10 },
    { label: 'Pricing', done: !!detail?.priceRange, weight: 10 },
    { label: 'Portfolio images', done: !!detail?.portfolioImages?.length, weight: 10 },
    { label: 'Social media', done: !!(detail?.instagram || detail?.facebook || detail?.twitter || detail?.website), weight: 5 },
    { label: 'Cover photo', done: !!profile.coverPhoto, weight: 5 },
  ];

  const totalWeight = fields.reduce((s, f) => s + f.weight, 0);
  const earnedWeight = fields.reduce((s, f) => s + (f.done ? f.weight : 0), 0);
  const percentage = Math.round((earnedWeight / totalWeight) * 100);

  return { percentage, fields };
}

export function profileStrengthStatus(percentage: number): { label: string; color: 'green' | 'primary' | 'amber' | 'danger' } {
  if (percentage >= 85) return { label: 'Excellent', color: 'green' };
  if (percentage >= 65) return { label: 'Good', color: 'primary' };
  if (percentage >= 45) return { label: 'Fair', color: 'amber' };
  return { label: 'Incomplete', color: 'danger' };
}
