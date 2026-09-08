import React from 'react';
import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

const SUPPORT_EMAIL = 'support@fashub.com';

// Reused verbatim from web's real FAQ (app/docs/page.tsx) rather than
// inventing new copy — no dedicated Help screen existed anywhere (mobile or
// web) before this, so this is the closest real source of truth for it.
const FAQ = [
  { q: 'How long does it take for a professional to respond?', a: 'Most professionals respond within a few hours. If you haven’t heard back within 48 hours, try another professional or contact support.' },
  { q: 'Can I cancel an order?', a: 'Yes, before the professional begins work. Once work is underway, cancellations are subject to the professional’s cancellation policy stated on their profile.' },
  { q: 'How are disputes handled?', a: 'Contact support through the order page. Our team reviews the order history, messages, and evidence before reaching a resolution, typically within 3–5 business days.' },
  { q: 'Can I delete my account?', a: 'Yes. Go to Settings → Account → Delete Account. This is permanent — all data including orders, messages, and portfolio items will be removed within 30 days.' },
];

export default function HelpSupportScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>Help & support</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Pressable
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.goldSoft + '2E', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={19} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>Contact support</Text>
            <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 1 }}>{SUPPORT_EMAIL}</Text>
          </View>
        </Pressable>

        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Frequently asked questions
          </Text>
          {FAQ.map(({ q, a }) => (
            <View key={q} style={{ gap: 4 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }}>{q}</Text>
              <Text style={{ fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 }}>{a}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
