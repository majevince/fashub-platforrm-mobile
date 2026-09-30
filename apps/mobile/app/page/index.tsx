import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { useMyPages } from '../../hooks/useMyPages';
import { LoadingState } from '../../components/LoadingState';

const isProfessional = (role?: string) => role === 'designer' || role === 'tailor';

function PageRow({ name, handle, tier, onPress }: { name: string; handle: string; tier: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.paper, borderRadius: 12, borderWidth: 1, borderColor: colors.line, marginBottom: 8 }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gold }}>{name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{name}</Text>
        <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 1 }}>@{handle}{tier !== 'standard' ? ` · ${tier === 'business_pro' ? 'Business' : 'Creator Pro'}` : ''}</Text>
      </View>
      <ChevronRight size={16} color={colors.inkSoft} />
    </Pressable>
  );
}

/**
 * The drawer's "Pages" entry opens here: Pages you admin, Pages you follow,
 * and — for designer/tailor accounts only, per the confirmed decision —
 * "Create a Page". Search/filter (the full PageDiscovery screen from the
 * original spec) is deferred; this is the admin/follow list only.
 */
export default function PagesListScreen() {
  const { colors, spacing, typeScale } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { pages, followedPages, loading } = useMyPages(true);

  const canCreate = isProfessional(user?.role);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Pages</Text>
      </View>

      {loading ? (
        <LoadingState label="Loading Pages…" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
          {canCreate ? (
            <Pressable
              onPress={() => router.push('/page/create')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, marginBottom: spacing.lg }}
            >
              <Plus size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Create a Page</Text>
            </Pressable>
          ) : null}

          {pages.length > 0 ? (
            <>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft, letterSpacing: 0.4, marginBottom: 8 }}>YOU MANAGE</Text>
              {pages.map((p) => (
                <PageRow key={p.id} name={p.name} handle={p.handle} tier={p.tier} onPress={() => router.push(`/page/${p.handle}`)} />
              ))}
              <View style={{ height: spacing.md }} />
            </>
          ) : null}

          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft, letterSpacing: 0.4, marginBottom: 8 }}>FOLLOWING</Text>
          {followedPages.length > 0 ? (
            followedPages.map((p) => (
              <PageRow key={p.id} name={p.name} handle={p.handle} tier={p.tier} onPress={() => router.push(`/page/${p.handle}`)} />
            ))
          ) : (
            <Text style={{ fontSize: 13, color: colors.inkSoft }}>You're not following any Pages yet.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
