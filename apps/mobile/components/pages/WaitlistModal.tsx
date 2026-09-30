import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { violetColors as V } from '@fashub/design-tokens';
import { joinPageBookingWaitlist, ApiError } from '@fashub/api-client';

/**
 * The "Join waitlist" CTA's real capture — POST .../bookings/waitlist.
 * Deliberately just a data capture, not an automated "notify when a slot
 * opens" flow (that doesn't exist yet — separate, unbuilt follow-up scope).
 * Mirrors fashub web's components/pages/WaitlistModal.tsx.
 */
export function WaitlistModal({ visible, pageHandle, pageName, onClose }: { visible: boolean; pageHandle: string; pageName: string; onClose: () => void }) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await joinPageBookingWaitlist(pageHandle, { name, email, phone: phone || undefined, notes: notes || undefined });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not join the waitlist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName(''); setEmail(''); setPhone(''); setNotes(''); setError(''); setDone(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,15,20,0.55)' }}>
        <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>Join waitlist</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <X size={20} color={colors.inkSoft} />
            </Pressable>
          </View>

          <ScrollView style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {done ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg, gap: 10 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: V.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={22} color={V.green} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>You're on the list</Text>
                <Text style={{ fontSize: 12.5, color: colors.inkSoft, textAlign: 'center' }}>
                  {pageName} is fully booked this week — reach out directly if you'd like to be notified as soon as something opens up.
                </Text>
                <Pressable onPress={handleClose} style={{ marginTop: 4, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginBottom: 14 }}>
                  {pageName} is fully booked this week. Leave your info and they'll know you're interested.
                </Text>
                {error ? (
                  <View style={{ backgroundColor: V.pinkSoft, borderRadius: 10, padding: 10, marginBottom: 12 }}>
                    <Text style={{ fontSize: 12.5, color: V.pink }}>{error}</Text>
                  </View>
                ) : null}
                <View style={{ gap: 10 }}>
                  <TextInput placeholder="Full name" value={name} onChangeText={setName} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
                  <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
                  <TextInput placeholder="Phone (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
                  <TextInput placeholder="Anything specific you're looking for? (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={2} style={[inputStyle(colors), { height: 64, textAlignVertical: 'top' }]} placeholderTextColor={colors.inkSoft} />
                </View>
                <Pressable disabled={submitting} onPress={submit} style={{ marginTop: 16, backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 13, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{submitting ? 'Joining…' : 'Join waitlist'}</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function inputStyle(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
  } as const;
}
