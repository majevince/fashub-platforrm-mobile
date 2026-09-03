/** Matches app/api/notifications/[userId]/route.ts exactly. */
export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actorId?: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  relatedId?: string | null;
  relatedType?: string | null;
  link?: string | null;
  createdAt: string;
}
