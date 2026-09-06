import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import QRCode from 'react-native-qrcode-svg';
import { X } from 'lucide-react-native';
import { API_BASE_URL, resolveMediaUrl } from '@fashub/api-client';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Ports web's community-page "QR Code" button — components/communities/
 * QRCodeModal with type="community". Encodes the community's own web URL
 * (an invite/share mechanism), same as the earlier Events "My Ticket" QR
 * (EventTicketModal) but for inviting people into a community rather than
 * proving attendance.
 */
export function CommunityQRModal({ visible, slug, name, coverPhoto, onClose }: { visible: boolean; slug: string; name: string; coverPhoto?: string | null; onClose: () => void }) {
  const { colors, radius } = useTheme();
  const url = `${API_BASE_URL}/communities/${slug}`;
  const coverUri = resolveMediaUrl(coverPhoto ?? null);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(27,21,35,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.paper, borderRadius: radius.lg + 4, padding: 24, alignItems: 'center', gap: 14, width: '100%', maxWidth: 320 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Community QR Code</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.inkSoft} />
            </Pressable>
          </View>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={{ width: '100%', height: 80, borderRadius: radius.md }} contentFit="cover" />
          ) : null}
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkSoft, textAlign: 'center' }} numberOfLines={2}>{name}</Text>
          <View style={{ padding: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md }}>
            <QRCode value={url} size={180} color={colors.ink} backgroundColor={colors.paper} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>Scan to open this community.</Text>
        </View>
      </View>
    </Modal>
  );
}
