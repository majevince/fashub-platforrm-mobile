import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check, Minus } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { usePage } from '../../../../hooks/usePage';
import {
  hasPagePermission,
  getPagePermissions,
  ALL_PAGE_PERMISSIONS,
  PAGE_PERMISSION_LABEL,
  PAGE_ROLE_LABEL,
  type PageAdminRole,
} from '@fashub/types';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';

// Column/tab order — most-privileged first, matching PAGE_ROLE_LABEL's roles.
const ROLES: PageAdminRole[] = ['super_admin', 'admin', 'editor', 'moderator', 'analyst'];

/**
 * Settings > Roles and permissions (mobile). Read-only view of the same
 * platform-wide matrix web's app/page/[handle]/manage/roles/page.tsx
 * renders — iterates the real ALL_PAGE_PERMISSIONS / getPagePermissions
 * exports from @fashub/types rather than hand-transcribing values, so it
 * always reflects lib/pages/permissions.ts's MATRIX if it's ever edited.
 *
 * A 5-column x 12-row table doesn't fit a phone width legibly, so instead of
 * a horizontally-scrolling grid this uses a role-picker: segmented tabs for
 * the 5 roles, and a vertical list of the 12 permission rows with an on/off
 * indicator for whichever role is selected.
 */
export default function RolesAndPermissionsScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { colors, spacing, typeScale } = useTheme();
  const router = useRouter();
  const { page, viewer, loading, error, reload } = usePage(handle);
  const [selectedRole, setSelectedRole] = useState<PageAdminRole>('super_admin');

  if (loading && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState label="Loading…" />
      </SafeAreaView>
    );
  }

  if (error || !page || !viewer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message={error ?? 'Page not found'} onRetry={reload} />
      </SafeAreaView>
    );
  }

  if (!hasPagePermission(viewer.role, 'canViewRolesMatrix')) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message="You don't have permission to view this." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  const permissions = getPagePermissions(selectedRole);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
          Roles and permissions
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 }}>
          This reflects the platform-wide role definitions for every Page — it isn&apos;t something you can edit per-Page.
          Ownership transfer and custom per-Page permission overrides aren&apos;t part of this build.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ROLES.map((role) => {
            const active = role === selectedRole;
            return (
              <Pressable
                key={role}
                onPress={() => setSelectedRole(role)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? colors.gold : colors.paper,
                  borderWidth: 1,
                  borderColor: active ? colors.gold : colors.line,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#fff' : colors.ink }}>
                  {PAGE_ROLE_LABEL[role]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
          {ALL_PAGE_PERMISSIONS.map((permission, i) => {
            const granted = permissions[permission];
            return (
              <View
                key={permission}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderBottomWidth: i === ALL_PAGE_PERMISSIONS.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                }}
              >
                <Text style={{ flex: 1, fontSize: 13.5, color: colors.ink }}>{PAGE_PERMISSION_LABEL[permission]}</Text>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: granted ? colors.ivoryDeep : colors.ivory,
                  }}
                >
                  {granted ? (
                    <Check size={14} color={colors.gold} />
                  ) : (
                    <Minus size={14} color={colors.inkSoft} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
