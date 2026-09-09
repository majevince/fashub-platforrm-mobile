import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { X, MessageCircle, FileText, CalendarClock, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { createInquiry, trackProjectEngagement, resolveMediaUrl, type CreateInquiryPayload } from '@fashub/api-client';

export type InquiryType = 'message' | 'quote' | 'consultation';

export interface InquiryCreator {
  userId: string;
  displayName: string;
  avatar?: string | null;
  isPro: boolean;
  isVerified?: boolean;
  role: 'designer' | 'tailor';
  city?: string | null;
  rating?: number | null;
  projectCount?: number | null;
}

export interface InquiryProjectRef {
  id: string;
  title: string;
  coverImage?: string | null;
  category?: string | null;
}

// 1:1 port of web's INQUIRY_TYPES (components/portfolio/InquiryModal.tsx) —
// all three of web's "Message owner" / "Request a quote" / "Schedule
// consult" buttons open this exact same composer, just pre-selecting a
// different tab here; there is no separate multi-step flow on web to
// reproduce for quote/consult, this single form already matches it exactly.
const TYPES: { id: InquiryType; label: string; cta: string; description: string; Icon: typeof MessageCircle }[] = [
  { id: 'message', label: 'General', cta: 'Send Message', description: 'Start a professional conversation about this project or services.', Icon: MessageCircle },
  { id: 'quote', label: 'Quote', cta: 'Request Quote', description: 'Receive a detailed estimate tailored to your project scope.', Icon: FileText },
  { id: 'consultation', label: 'Consult', cta: 'Schedule Consultation', description: 'Book a focused call to discuss requirements, timelines, and pricing.', Icon: CalendarClock },
];

const TIMELINES = ['Within 1 week', '1–2 weeks', '2–4 weeks', '1–2 months', '2–3 months', '3–6 months', '6+ months', 'Flexible / No rush'];

// USD-only subset of web's buildBudgetRanges('inquiry') tiers
// (lib/currency.ts) — web additionally detects and offers the user's local
// currency; porting that multi-currency picker is out of scope for wiring
// these actions up to function, flagged here as a deliberate simplification
// rather than a silent omission. The tier boundaries themselves are real,
// not invented.
const BUDGETS = ['Under $100', '$100 – $250', '$250 – $500', '$500 – $1,000', '$1,000 – $2,500', '$2,500 – $5,000', '$5,000 – $10,000', '$10,000+', 'To be discussed'];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
        borderColor: active ? colors.gold : colors.line,
        backgroundColor: active ? colors.gold : 'transparent',
        marginRight: 8, marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: active ? '#fff' : colors.inkSoft }}>{label}</Text>
    </Pressable>
  );
}

export function InquiryComposer({
  visible, creator, project, currentUserId, defaultType, onClose,
}: {
  visible: boolean;
  creator: InquiryCreator;
  project?: InquiryProjectRef | null;
  currentUserId: string;
  defaultType: InquiryType;
  onClose: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const [type, setType] = useState<InquiryType>(defaultType);
  const [message, setMessage] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ conversationId: string } | null>(null);

  // Reset to a clean form each time the sheet is (re)opened for a possibly
  // different type/project — mirrors web's fresh-mount-per-open behavior.
  React.useEffect(() => {
    if (visible) {
      setType(defaultType);
      setMessage('');
      setBudget('');
      setTimeline('');
      setError('');
      setSuccess(null);
    }
  }, [visible, defaultType]);

  const needsExtra = type === 'quote' || type === 'consultation';
  const messageValid = message.trim().length >= 20;
  const typeConfig = TYPES.find((t) => t.id === type)!;
  const avatarUri = resolveMediaUrl(creator.avatar ?? undefined);
  const coverUri = resolveMediaUrl(project?.coverImage ?? undefined);

  const handleSubmit = async () => {
    if (!messageValid) {
      setError('Please provide a detailed message (at least 20 characters).');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: CreateInquiryPayload = {
        senderId: currentUserId,
        creatorUserId: creator.userId,
        projectId: project?.id ?? null,
        projectTitle: project?.title ?? null,
        projectCoverImage: project?.coverImage ?? null,
        creatorName: creator.displayName,
        creatorAvatar: creator.avatar ?? null,
        creatorRole: creator.role,
        creatorIsPro: creator.isPro,
        creatorIsVerified: creator.isVerified ?? false,
        inquiryType: type,
        message: message.trim(),
        budget: budget || null,
        timeline: timeline || null,
      };
      const res = await createInquiry(payload);
      setSuccess({ conversationId: res.conversationId });
      if (project?.id) {
        trackProjectEngagement(project.id, 'project_inquiry_sent', currentUserId, { inquiryType: type });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,18,16,0.55)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ maxHeight: '92%' }}>
          <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '100%' }}>

            {success ? (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                  <CheckCircle2 size={32} color="#10B981" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>
                  {type === 'quote' ? 'Quote Request Sent' : type === 'consultation' ? 'Consultation Requested' : 'Message Sent'}
                </Text>
                <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', marginBottom: spacing.lg }}>
                  Delivered to {creator.displayName}. You'll be notified when they reply.
                </Text>
                <Pressable
                  onPress={() => { onClose(); router.push(`/messages/${success.conversationId}`); }}
                  style={{ width: '100%', backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: 10 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>View Conversation</Text>
                </Pressable>
                <Pressable onPress={onClose} style={{ width: '100%', paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: colors.inkSoft, fontWeight: '600', fontSize: 13 }}>Continue Browsing</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>
                    {type === 'quote' ? 'Request a Quote' : type === 'consultation' ? 'Schedule Consultation' : `Contact ${creator.role === 'designer' ? 'Designer' : 'Tailor'}`}
                  </Text>
                  <Pressable onPress={onClose} hitSlop={8} style={{ padding: 4 }}>
                    <X size={20} color={colors.inkSoft} />
                  </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xs, gap: spacing.md }} keyboardShouldPersistTaps="handled">
                  {/* Creator card */}
                  <View style={{ flexDirection: 'row', gap: 10, padding: 12, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line }}>
                    <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                      {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{creator.displayName.charAt(0).toUpperCase()}</Text>}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{creator.displayName}</Text>
                        {creator.isPro ? (
                          <View style={{ backgroundColor: colors.gold, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>PRO</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 1, textTransform: 'capitalize' }}>
                        {creator.role}{creator.city ? ` · ${creator.city}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Project reference */}
                  {project ? (
                    <View style={{ flexDirection: 'row', gap: 10, padding: 10, backgroundColor: '#F2EBFC', borderRadius: radius.md, borderWidth: 1, borderColor: '#E4D6F7' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.ivoryDeep, overflow: 'hidden' }}>
                        {coverUri ? <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                      </View>
                      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.4 }}>Regarding project</Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{project.title}</Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Type selector */}
                  <View>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Inquiry Type</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {TYPES.map((t) => {
                        const active = type === t.id;
                        return (
                          <Pressable
                            key={t.id}
                            onPress={() => { setType(t.id); setError(''); }}
                            style={{
                              flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12, borderRadius: radius.md,
                              borderWidth: 1.5, borderColor: active ? colors.gold : colors.line,
                              backgroundColor: active ? '#F2EBFC' : colors.paper,
                            }}
                          >
                            <t.Icon size={17} color={active ? colors.gold : colors.inkSoft} />
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: active ? colors.gold : colors.inkSoft }}>{t.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 6, lineHeight: 15 }}>{typeConfig.description}</Text>
                  </View>

                  {/* Message */}
                  <View>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                      {type === 'quote' ? 'Project Brief' : type === 'consultation' ? 'What would you like to discuss?' : 'Your Message'}
                    </Text>
                    <TextInput
                      value={message}
                      onChangeText={(v) => { setMessage(v); if (error) setError(''); }}
                      placeholder={
                        type === 'quote'
                          ? 'Describe the project you need a quote for — garment type, quantity, materials…'
                          : type === 'consultation'
                          ? "Briefly describe what you'd like to discuss…"
                          : `Introduce yourself and describe what you're looking for…`
                      }
                      placeholderTextColor={colors.inkSoft}
                      multiline
                      numberOfLines={5}
                      style={{
                        minHeight: 110, borderWidth: 1, borderColor: error ? '#F87171' : colors.line, borderRadius: radius.md,
                        padding: 12, fontSize: 13, color: colors.ink, textAlignVertical: 'top',
                      }}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: error ? '#EF4444' : colors.inkSoft }}>{error || 'Minimum 20 characters'}</Text>
                      <Text style={{ fontSize: 11, color: colors.inkSoft }}>{message.length}/2,000</Text>
                    </View>
                  </View>

                  {/* Budget & timeline (quote/consultation only) */}
                  {needsExtra ? (
                    <>
                      <View>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Budget Range (recommended)</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {BUDGETS.map((b) => <Chip key={b} label={b} active={budget === b} onPress={() => setBudget(budget === b ? '' : b)} />)}
                        </View>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Project Timeline (optional)</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {TIMELINES.map((t) => <Chip key={t} label={t} active={timeline === t} onPress={() => setTimeline(timeline === t ? '' : t)} />)}
                        </View>
                      </View>
                    </>
                  ) : null}
                </ScrollView>

                <View style={{ padding: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line }}>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting || !message.trim()}
                    style={{
                      backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
                      opacity: submitting || !message.trim() ? 0.5 : 1,
                    }}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>{typeConfig.cta}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
