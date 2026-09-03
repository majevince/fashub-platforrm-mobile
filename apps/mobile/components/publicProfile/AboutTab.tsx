import React from 'react';
import { View, Text } from 'react-native';
import { AtSign, Globe, Phone, Mail, Wallet } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { ProfileDetail, IndividualProfileDetail, ProfessionalProfileDetail } from '@fashub/types';

export function AboutTab({
  profile,
  professionalDetail,
  isOwner,
}: {
  profile: ProfileDetail;
  professionalDetail: ProfessionalProfileDetail | IndividualProfileDetail | null | undefined;
  isOwner: boolean;
}) {
  const { colors, typeScale } = useTheme();
  const detail = professionalDetail ?? profile.individualProfile ?? null;
  const showContact = profile.privacySettings?.showEmail !== false || profile.privacySettings?.showPhone !== false || isOwner;
  const tags = 'specialties' in (detail ?? {}) ? (detail as ProfessionalProfileDetail).specialties : (detail as IndividualProfileDetail | null)?.stylePreferences;
  const businessName = detail && 'businessName' in detail ? detail.businessName : null;
  const priceRange = detail && 'priceRange' in detail ? detail.priceRange : (detail as IndividualProfileDetail | null)?.preferredPriceRange;

  return (
    <View style={{ gap: 20 }}>
      {businessName ? (
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.gold }}>{businessName}</Text>
      ) : null}

      <View>
        <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft, marginBottom: 6 }}>ABOUT</Text>
        {detail?.bio ? <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{detail.bio}</Text> : <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, fontStyle: 'italic' }}>No bio yet.</Text>}
      </View>

      {tags && tags.length > 0 ? (
        <View>
          <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft, marginBottom: 6 }}>SPECIALTIES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((t) => (
              <View key={t} style={{ backgroundColor: '#F3EDFB', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '500', color: '#6D28D9' }}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {priceRange ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Wallet size={14} color={colors.inkSoft} />
          <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', color: colors.ink }}>{priceRange}</Text>
        </View>
      ) : null}

      <View>
        <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft, marginBottom: 6 }}>CONTACT & SOCIAL</Text>
        {showContact ? (
          <View style={{ gap: 8 }}>
            {profile.email ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Mail size={14} color={colors.inkSoft} />
                <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{profile.email}</Text>
              </View>
            ) : null}
            {detail?.phone ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Phone size={14} color={colors.inkSoft} />
                <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{detail.phone}</Text>
              </View>
            ) : null}
            {detail?.instagram ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AtSign size={14} color={colors.inkSoft} />
                <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{detail.instagram}</Text>
              </View>
            ) : null}
            {detail?.website ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Globe size={14} color={colors.inkSoft} />
                <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{detail.website}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, fontStyle: 'italic' }}>Contact information is private.</Text>
        )}
      </View>
    </View>
  );
}
