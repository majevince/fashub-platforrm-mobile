/**
 * The single source of truth for what each Page admin role can do —
 * Settings tab ticket (2026-09-28). Both `Page` apps read from this exact
 * matrix so the Settings tab, Manage-admins Add-admin role dropdown, and
 * every gated sub-page agree with each other.
 *
 * MUST stay in sync with web's lib/pages/permissions.ts (fashub repo, a
 * separate deployment with no shared package boundary with this monorepo) —
 * this file is a deliberate byte-for-byte port of that matrix, not an
 * independent design. If this matrix changes, update both.
 *
 * Role meanings (5-role set migrated from the old 3-role
 * super_admin/content_admin/commerce_mgr set — see fashub's
 * prisma/migrations/20260928000000_page_settings_roles):
 * - super_admin: the Page's owner-equivalent. Everything, including
 *   Manage-admins and ownership transfer. Only one exists per Page
 *   in practice (assigned at Page creation), though the type allows more.
 * - admin: full operational control short of ownership transfer — can
 *   manage other admins' roles, edit Page info, moderate, post, everything
 *   in Settings.
 * - editor: content-focused — can post/create events as the Page and edit
 *   Page info, but can't manage admins, restrictions, following, or inbox
 *   settings.
 * - moderator: trust & safety-focused — can moderate content, manage the
 *   Inbox and Restricted members, but can't post as the Page or touch
 *   Page-level settings.
 * - analyst: read-only — Stats tab access only, nothing else.
 */
export type PageAdminRole = 'super_admin' | 'admin' | 'editor' | 'moderator' | 'analyst';

export const PAGE_ROLE_LABEL: Record<PageAdminRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  editor: 'Editor',
  moderator: 'Moderator',
  analyst: 'Analyst',
};

// Roles assignable through the Manage-admins "Add admin" flow. Super admin
// is deliberately excluded — ownership transfer needs its own, more
// guarded flow (the current Super admin explicitly stepping down), not a
// casual dropdown pick alongside Editor/Moderator/Analyst.
export const ASSIGNABLE_PAGE_ROLES: PageAdminRole[] = ['admin', 'editor', 'moderator', 'analyst'];

export type PagePermission =
  | 'canPost' // create posts/events attributed to the Page
  | 'canModerateContent' // hide/remove the Page's posts and comments on them
  | 'canManageInbox' // read/reply to the Page's Inbox conversations
  | 'canManageBookings' // view/approve/cancel bookings, the booking calendar
  | 'canViewStats' // see the Stats tab
  | 'canAccessSettingsTab' // see the Settings tab at all
  | 'canEditPageInfo' // Settings > Edit page info
  | 'canManageInboxSettings' // Settings > Page inbox settings
  | 'canManageRestrictions' // Settings > Restricted members
  | 'canManageFollowing' // Settings > Manage following
  | 'canManageAdmins' // Settings > Manage admins (add/remove/change roles)
  | 'canViewRolesMatrix' // Settings > Roles and permissions
  | 'canTransferOwnership'; // reassign super_admin — not built by this ticket, reserved

const MATRIX: Record<PageAdminRole, Record<PagePermission, boolean>> = {
  super_admin: {
    canPost: true,
    canModerateContent: true,
    canManageInbox: true,
    canManageBookings: true,
    canViewStats: true,
    canAccessSettingsTab: true,
    canEditPageInfo: true,
    canManageInboxSettings: true,
    canManageRestrictions: true,
    canManageFollowing: true,
    canManageAdmins: true,
    canViewRolesMatrix: true,
    canTransferOwnership: true,
  },
  admin: {
    canPost: true,
    canModerateContent: true,
    canManageInbox: true,
    canManageBookings: true,
    canViewStats: true,
    canAccessSettingsTab: true,
    canEditPageInfo: true,
    canManageInboxSettings: true,
    canManageRestrictions: true,
    canManageFollowing: true,
    canManageAdmins: true,
    canViewRolesMatrix: true,
    canTransferOwnership: false,
  },
  editor: {
    canPost: true,
    canModerateContent: false,
    canManageInbox: false,
    canManageBookings: false,
    canViewStats: true,
    canAccessSettingsTab: true,
    canEditPageInfo: true,
    canManageInboxSettings: false,
    canManageRestrictions: false,
    canManageFollowing: false,
    canManageAdmins: false,
    canViewRolesMatrix: false,
    canTransferOwnership: false,
  },
  moderator: {
    canPost: false,
    canModerateContent: true,
    canManageInbox: true,
    canManageBookings: true,
    canViewStats: true,
    // Sees the Settings tab (and hub) because it holds canManageRestrictions
    // below — but every OTHER row in the hub stays hidden for this role.
    canAccessSettingsTab: true,
    canEditPageInfo: false,
    canManageInboxSettings: false,
    canManageRestrictions: true,
    canManageFollowing: false,
    canManageAdmins: false,
    canViewRolesMatrix: false,
    canTransferOwnership: false,
  },
  analyst: {
    canPost: false,
    canModerateContent: false,
    canManageInbox: false,
    canManageBookings: false,
    canViewStats: true,
    canAccessSettingsTab: false,
    canEditPageInfo: false,
    canManageInboxSettings: false,
    canManageRestrictions: false,
    canManageFollowing: false,
    canManageAdmins: false,
    canViewRolesMatrix: false,
    canTransferOwnership: false,
  },
};

export function hasPagePermission(role: PageAdminRole | null | undefined, permission: PagePermission): boolean {
  if (!role) return false;
  return MATRIX[role]?.[permission] ?? false;
}

export function getPagePermissions(role: PageAdminRole | null | undefined): Record<PagePermission, boolean> {
  if (!role) {
    return {
      canPost: false, canModerateContent: false, canManageInbox: false, canManageBookings: false, canViewStats: false,
      canAccessSettingsTab: false, canEditPageInfo: false, canManageInboxSettings: false,
      canManageRestrictions: false, canManageFollowing: false, canManageAdmins: false,
      canViewRolesMatrix: false, canTransferOwnership: false,
    };
  }
  return MATRIX[role];
}

export const ALL_PAGE_PERMISSIONS: PagePermission[] = [
  'canPost', 'canModerateContent', 'canManageInbox', 'canManageBookings', 'canViewStats', 'canAccessSettingsTab',
  'canEditPageInfo', 'canManageInboxSettings', 'canManageRestrictions', 'canManageFollowing',
  'canManageAdmins', 'canViewRolesMatrix', 'canTransferOwnership',
];

export const PAGE_PERMISSION_LABEL: Record<PagePermission, string> = {
  canPost: 'Post & create events as the Page',
  canModerateContent: 'Moderate posts & comments',
  canManageInbox: 'Reply to Page messages',
  canManageBookings: 'Manage bookings',
  canViewStats: 'View Stats',
  canAccessSettingsTab: 'Access Settings tab',
  canEditPageInfo: 'Edit Page info',
  canManageInboxSettings: 'Manage inbox settings',
  canManageRestrictions: 'Manage restricted members',
  canManageFollowing: 'Manage following',
  canManageAdmins: 'Manage admins',
  canViewRolesMatrix: 'View roles & permissions',
  canTransferOwnership: 'Transfer ownership',
};
