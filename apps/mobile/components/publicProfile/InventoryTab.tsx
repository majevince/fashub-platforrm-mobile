import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Shirt } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getMyFabrics, resolveMediaUrl } from '@fashub/api-client';
import type { FabricInventoryItem } from '@fashub/types';
import { LoadingState } from '../../components/LoadingState';
import { EmptyNotice } from './PortfolioTab';

/** Read-only — matches web's profile-page Inventory tab (a view surface, distinct from the owner-only /inventory management screen already built). */
export function InventoryTab({ userId }: { userId: string }) {
  const { colors, radius } = useTheme();
  const [fabrics, setFabrics] = useState<FabricInventoryItem[] | null>(null);

  useEffect(() => {
    getMyFabrics(userId)
      .then((res) => setFabrics(res.fabrics))
      .catch(() => setFabrics([]));
  }, [userId]);

  if (fabrics === null) return <LoadingState />;
  if (fabrics.length === 0) return <EmptyNotice icon={Shirt} title="No Inventory Yet" message="This user hasn't listed any fabrics." />;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {fabrics.map((f) => {
        const cover = f.colorVariants[0]?.photos?.[0] ?? f.images[0];
        return (
          <View key={f.id} style={{ width: '47%', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' }}>
            <View style={{ height: 90, backgroundColor: f.colorVariants[0]?.hex ?? colors.ivoryDeep }}>
              {cover ? <Image source={{ uri: resolveMediaUrl(cover) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
            </View>
            <View style={{ padding: 9, gap: 3 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.gold }}>
                {f.sellingPricePerUnit ? `$${f.sellingPricePerUnit.toFixed(2)}` : '—'} <Text style={{ color: colors.inkSoft }}>/{f.unit}</Text>
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
