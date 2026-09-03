import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { findOrCreateConversation } from '@fashub/api-client';
import { useAuth } from '../../context/AuthContext';
import { MatchCard } from '../../components/professionals/MatchCard';
import { getSelectedMatch } from '../../lib/selectedMatchStore';

/**
 * Full match detail — pushed full-screen route, same navigation pattern as
 * app/project/[id].tsx (root-level route, back-chevron header, no modal).
 * Reproduces the full MatchCard 1:1 (rank, avatar, badges, description,
 * stat row, complete "why this match", all tags, rating, price, turnaround,
 * View Profile + Message) — the same component the Top Pick hero on the
 * discovery screen uses, matching web's own reuse of one card component
 * for both contexts.
 */
export default function ProfessionalDetailScreen() {
  const { id, rank } = useLocalSearchParams<{ id: string; rank?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const pro = getSelectedMatch();

  const handleMessage = async () => {
    if (!user || !pro) return;
    try {
      const { conversation } = await findOrCreateConversation(user.id, pro.id);
      router.push(`/messages/${conversation.id}`);
    } catch {
      // Non-fatal — user can retry.
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: V.canvas }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={V.ink} />
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: '700', color: V.ink }}>Professional</Text>
      </View>

      {!pro || !id ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: V.inkSoft, textAlign: 'center' }}>
            This match's details aren't available anymore.
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: V.primary }}>Go back and search again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <MatchCard
            pro={pro}
            rank={rank ? parseInt(rank, 10) : undefined}
            onViewProfile={() => router.push(`/profile/${pro.id}`)}
            onMessage={handleMessage}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
