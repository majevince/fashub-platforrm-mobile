/**
 * Matches the wire shape of what /api/auth/* and /api/users/* actually
 * return (JSON, so createdAt/updatedAt are ISO strings, not Date) — not the
 * full web User interface (types/client.ts), which carries dozens of
 * role-specific profile fields not needed for auth. Extend this as later
 * screens (Profile, etc.) need more of what the API actually sends.
 */
export type UserRole = 'individual' | 'designer' | 'tailor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  avatar?: string | null;
  coverPhoto?: string | null;
  bio?: string | null;
  phone?: string | null;
  businessName?: string | null;
  createdAt: string;
  updatedAt: string;
}
