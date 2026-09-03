/**
 * Ported 1:1 from web's app/chat/page.tsx (formatRelativeTime, formatDayLabel,
 * isSameDay, getDayBucket, getInquiryPreviewType) and lib/chat/onlineStatus.ts
 * (formatLastSeen, ONLINE_THRESHOLD) — same thresholds, same copy.
 */
export const ONLINE_THRESHOLD = 15000;

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatLastSeen(lastActive: string | null): string {
  if (!lastActive) return 'Offline';
  const diff = Date.now() - new Date(lastActive).getTime();
  if (diff < ONLINE_THRESHOLD) return 'Online';
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function formatDayLabel(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function getDayBucket(date: string | Date): 'Today' | 'Yesterday' | 'This week' | 'Earlier' {
  const now = new Date();
  const d = new Date(date);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDay.getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  return 'Earlier';
}

export function getInquiryPreviewType(lastMessage?: string | null): string | null {
  if (!lastMessage) return null;
  if (lastMessage.startsWith('Quote Request:')) return 'Quote Request';
  if (lastMessage.startsWith('Consultation Request:')) return 'Consultation';
  if (lastMessage.startsWith('Project Inquiry:')) return 'Project Inquiry';
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function formatMessageTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
