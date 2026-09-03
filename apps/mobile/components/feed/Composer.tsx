import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl } from '@fashub/api-client';

type Props = {
  onPress: () => void;
};

export function Composer({ onPress }: Props) {
  const { spacing } = useTheme();
  const { user } = useAuth();
  const avatarUri = resolveMediaUrl(user?.avatar);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: V.surface,
        borderWidth: 1,
        borderColor: V.line,
        borderRadius: 14,
        padding: 10,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: V.inkSoft, overflow: 'hidden' }}>
        {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
      </View>
      <Text style={{ fontSize: 13, fontWeight: '400', color: V.inkFaint, flex: 1 }}>Share your latest design…</Text>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Plus size={15} color="#fff" />
      </View>
    </Pressable>
  );
}
