import type { User } from './user';

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Signup only offers individual/designer/tailor — matches web's own signup
 * page (app/auth/signup/page.tsx), which never exposes 'admin' as a
 * selectable account type even though the API itself doesn't reject it.
 */
export interface SignupPayload {
  email: string;
  password: string;
  displayName: string;
  role: 'individual' | 'designer' | 'tailor';
  profileData?: { bio?: string };
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
  refreshToken: string;
}
