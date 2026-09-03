/**
 * Matches GET/PUT /api/notification-preferences/[userId] exactly — read
 * directly from web's prisma schema NotificationPreferences model and
 * components/notifications/NotificationPreferencesManager.tsx. 4 channels ×
 * 7 categories (25 individual toggles total) + 4 global master switches,
 * identical for every role — web doesn't filter categories by role.
 */
export type NotificationChannel = 'email' | 'sms' | 'push' | 'inApp';

export type ChannelToggles = Record<NotificationChannel, boolean>;

export const NOTIFICATION_CATEGORIES = [
  {
    key: 'ordersTransactions',
    label: 'Orders & Transactions',
    items: ['orderUpdates', 'paymentConfirmations', 'orderStatusChanges', 'deliveryUpdates'] as const,
  },
  {
    key: 'communication',
    label: 'Communication',
    items: ['newMessages', 'messageReplies', 'mentions'] as const,
  },
  {
    key: 'socialActivity',
    label: 'Social Activity',
    items: ['newFollowers', 'likes', 'comments', 'shares'] as const,
  },
  {
    key: 'professional',
    label: 'Professional (Designer/Tailor)',
    items: ['quoteRequests', 'appointmentReminders', 'appointmentChanges', 'reviewsReceived'] as const,
  },
  {
    key: 'favoritesInterests',
    label: 'Favorites & Interests',
    items: ['favoriteUpdates', 'priceDrops', 'backInStock'] as const,
  },
  {
    key: 'marketing',
    label: 'Marketing & Promotions',
    items: ['promotions', 'newsletter', 'recommendations', 'weeklyDigest'] as const,
  },
  {
    key: 'security',
    label: 'Security & Account',
    items: ['securityAlerts', 'loginAlerts', 'accountChanges', 'privacyUpdates'] as const,
  },
] as const;

export type NotificationCategoryKey =
  (typeof NOTIFICATION_CATEGORIES)[number]['items'][number];

export type NotificationPreferences = {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailDigestFrequency?: 'instant' | 'daily' | 'weekly' | 'never';
  pushQuietHoursStart?: number | null;
  pushQuietHoursEnd?: number | null;
  timezone?: string;
} & Record<NotificationCategoryKey, ChannelToggles>;
