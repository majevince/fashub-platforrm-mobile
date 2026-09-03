import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Images } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveMediaUrl } from '@fashub/api-client';
import type { ProfessionalProfileDetail, IndividualProfileDetail } from '@fashub/types';

export function PortfolioTab({ professionalDetail, showPortfolio }: { professionalDetail: ProfessionalProfileDetail | IndividualProfileDetail | null | undefined; showPortfolio: boolean }) {
  const { colors, typeScale, radius } = useTheme();

  if (!showPortfolio) {
    return <EmptyNotice icon={Images} title="Portfolio is Private" message="This user has chosen to keep their portfolio private." />;
  }

  const images = professionalDetail && 'portfolioImages' in professionalDetail ? [...(professionalDetail.featuredImages ?? []), ...(professionalDetail.portfolioImages ?? [])] : [];

  if (images.length === 0) {
    return <EmptyNotice icon={Images} title="No Portfolio Yet" message="This user hasn't added any portfolio items." />;
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {images.map((img, i) => (
        <Image key={i} source={{ uri: resolveMediaUrl(img) ?? undefined }} style={{ width: '31.5%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.ivoryDeep }} contentFit="cover" />
      ))}
    </View>
  );
}

export function EmptyNotice({ icon: Icon, title, message }: { icon: typeof Images; title: string; message: string }) {
  const { colors, typeScale } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 32 }}>
      <Icon size={28} color={colors.lineStrong} />
      <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{title}</Text>
      <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}
