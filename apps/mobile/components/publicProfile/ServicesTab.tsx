import React from 'react';
import { View, Text } from 'react-native';
import { Clock, Wrench } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { ProfessionalProfileDetail } from '@fashub/types';
import { EmptyNotice } from './PortfolioTab';

const SERVICE_LABELS: Record<string, string> = {
  customDesign: 'Custom Design',
  alterations: 'Alterations',
  consulting: 'Design Consulting',
  onlineOrders: 'Online Orders',
  inPersonConsultation: 'In-Person Consultation',
  customTailoring: 'Custom Tailoring',
  repairs: 'Repairs',
  urgentService: 'Urgent Service',
  pickupDelivery: 'Pickup & Delivery',
};

/**
 * Matches web's dedicated "Services" tab (designer/tailor profile pages) —
 * a read-only display of the same boolean service flags Settings' Services
 * screen edits, plus a pricing summary (price range, minimum order,
 * currency, lead/turnaround time). Web has no form inputs on this tab
 * either — editing only happens in Settings, matched here exactly rather
 * than adding inline editing that would diverge from web's real behavior.
 */
export function ServicesTab({ professionalDetail }: { professionalDetail: ProfessionalProfileDetail | null | undefined }) {
  const { colors, typeScale, spacing, radius } = useTheme();

  if (!professionalDetail) return <EmptyNotice icon={Wrench} title="No Services Yet" message="This professional hasn't listed any services." />;

  const activeServices = Object.keys(SERVICE_LABELS).filter((key) => (professionalDetail as unknown as Record<string, unknown>)[key] === true);
  const customServices = professionalDetail.customServices ?? [];
  const leadOrTurnaround = professionalDetail.leadTime ?? professionalDetail.turnaroundTime;
  const hasPricing = !!(professionalDetail.priceRange || professionalDetail.minimumOrder || leadOrTurnaround);

  if (activeServices.length === 0 && customServices.length === 0 && !hasPricing) {
    return <EmptyNotice icon={Wrench} title="No Services Yet" message="This professional hasn't listed any services." />;
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ backgroundColor: colors.ivory, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md, gap: spacing.sm }}>
        <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft }}>Available Services</Text>
        {activeServices.length > 0 || customServices.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {activeServices.map((key) => (
              <View key={key} style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ink }}>{SERVICE_LABELS[key]}</Text>
              </View>
            ))}
            {customServices.map((item) => (
              <View key={item} style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ink }}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 12, fontWeight: '400', color: colors.inkSoft, fontStyle: 'italic' }}>No services listed yet.</Text>
        )}
      </View>

      {hasPricing ? (
        <View style={{ backgroundColor: colors.ivory, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md, gap: 8 }}>
          <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft }}>Pricing Information</Text>
          {professionalDetail.priceRange ? (
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, textTransform: 'capitalize' }}>{professionalDetail.priceRange}</Text>
          ) : null}
          {professionalDetail.minimumOrder ? (
            <Text style={{ fontSize: 12.5, fontWeight: '400', color: colors.inkSoft }}>
              Minimum order: {professionalDetail.currency ?? '$'}{professionalDetail.minimumOrder}
            </Text>
          ) : null}
          {leadOrTurnaround ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Clock size={13} color={colors.inkSoft} />
              <Text style={{ fontSize: 12.5, fontWeight: '400', color: colors.inkSoft }}>{leadOrTurnaround}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
