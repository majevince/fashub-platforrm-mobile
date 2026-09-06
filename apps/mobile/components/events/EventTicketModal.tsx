import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { X } from 'lucide-react-native';
import { API_BASE_URL } from '@fashub/api-client';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Matches web's QRCodeModal usage on the event detail page exactly: there
 * is no real ticket/purchase entity on the Event model (confirmed in
 * Step 0) — this QR just encodes the event's own web URL as a scannable
 * proof-of-attendance, the same thing web's QR encodes.
 */
export function EventTicketModal({ visible, eventId, eventTitle, onClose }: { visible: boolean; eventId: string; eventTitle: string; onClose: () => void }) {
  const { colors, radius } = useTheme();
  const url = `${API_BASE_URL}/events/${eventId}`;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(27,21,35,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.paper, borderRadius: radius.lg + 4, padding: 24, alignItems: 'center', gap: 16, width: '100%', maxWidth: 320 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>My Ticket</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.inkSoft} />
            </Pressable>
          </View>
          <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkSoft, textAlign: 'center' }} numberOfLines={2}>{eventTitle}</Text>
          <View style={{ padding: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md }}>
            <QRCode value={url} size={180} color={colors.ink} backgroundColor={colors.paper} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>Show this at check-in as proof you're attending.</Text>
        </View>
      </View>
    </Modal>
  );
}
