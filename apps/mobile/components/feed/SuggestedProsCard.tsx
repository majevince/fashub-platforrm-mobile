import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { followUser, resolveMediaUrl } from '@fashub/api-client';
import type { SuggestedCreator } from '@fashub/types';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';

type Props = {
  creators: SuggestedCreator[];
  total: number;
};

export function SuggestedProsCard({ creators, total }: Props) {
  const { spacing } = useTheme();

  if (creators.length === 0) return null;

  return (
    <View style={{ backgroundColor: V.ink, marginHorizontal: spacing.lg, marginVertical: spacing.xs, borderRadius: 16, padding: 16, paddingBottom: 14, overflow: 'hidden' }}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(109,40,217,0.35)', 'rgba(109,40,217,0)']}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.4, y: 0.6 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140 }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontWeight: '600', fontSize: 15, color: '#fff' }}>✦ Who to Follow</Text>
        <Text style={{ fontSize: 9.5, fontWeight: '500', color: V.primarySoft, textTransform: 'uppercase' }}>See all {total}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {creators.map((creator) => (
          <ProChip key={creator.userId} creator={creator} />
        ))}
      </ScrollView>
    </View>
  );
}

function ProChip({ creator }: { creator: SuggestedCreator }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const avatarUri = resolveMediaUrl(creator.avatar);

  const handleFollow = async () => {
    if (!user || following) return;
    setFollowing(true);
    try {
      await followUser(creator.userId, user.id);
    } catch {
      setFollowing(false);
    }
  };

  return (
    <View style={{ width: 126, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: 12, paddingVertical: 12, alignItems: 'center' }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: V.primarySoft, marginBottom: 8, overflow: 'hidden', backgroundColor: V.inkSoft }}>
        {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2, maxWidth: '100%' }}>
        <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#fff', flexShrink: 1 }} numberOfLines={1}>
          {creator.displayName}
        </Text>
        {isVerified({ subscriptionTier: creator.subscriptionTier, verified: creator.isVerified }) ? <VerifiedBadge size="sm" /> : null}
      </View>
      <Text style={{ fontSize: 8.5, fontWeight: '500', color: V.primarySoft, textTransform: 'uppercase', marginBottom: 8 }} numberOfLines={1}>
        {creator.role}
        {creator.city ? ` · ${creator.city}` : ''}
      </Text>
      <Pressable
        onPress={handleFollow}
        style={{ backgroundColor: following ? 'transparent' : V.primary, borderWidth: following ? 1 : 0, borderColor: V.primary, borderRadius: 20, paddingVertical: 6, width: '100%', alignItems: 'center' }}
      >
        <Text style={{ fontSize: 10.5, fontWeight: '600', color: following ? V.primarySoft : '#fff' }}>
          {following ? 'Following' : '+ Follow'}
        </Text>
      </Pressable>
    </View>
  );
}
