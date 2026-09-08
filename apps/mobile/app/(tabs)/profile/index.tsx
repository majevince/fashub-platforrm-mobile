import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';

/**
 * Bottom-nav Profile tab now navigates straight to /profile/[userId] (see
 * the tabPress override in app/(tabs)/_layout.tsx) — this route never
 * mounts under normal use. Kept as a plain redirect, not deleted, because
 * Tabs.Screen("profile") still needs a real route file to register the
 * tab; this is the safety net for anything that lands here directly
 * (deep link, back navigation) instead of via the intercepted tab press.
 * "My Profile" and "Sign out" — the only two items this screen used to
 * show — are now covered by that same direct navigation and by Sign out's
 * relocation to the drawer footer (components/nav/AppDrawer.tsx).
 */
export default function ProfileTabRedirect() {
  const { user } = useAuth();
  if (!user) return null;
  return <Redirect href={`/profile/${user.id}`} />;
}
