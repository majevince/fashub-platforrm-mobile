import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Paperclip, ArrowUp, X, FileText } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { uploadFiles } from '@fashub/api-client';
import type { ChatMessage } from '@fashub/types';
import { toUploadableFile } from '../../lib/uploadableFile';
import { formatFileSize } from '../../lib/chatFormat';

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/zip',
]);
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;
const MAX_FILE = 25 * 1024 * 1024;

type StagedFile = { uri: string; name: string; size: number; mimeType: string };

type Props = {
  otherUserName: string;
  replyingTo: ChatMessage | null;
  onDismissReply: () => void;
  onSend: (payload: { content: string; file?: StagedFile }) => Promise<void>;
  initialText?: string;
};

/**
 * 1:1 port of web's composer (app/chat/page.tsx handleSend + FileAttachment.tsx
 * validateFile): pill text input, attachment button, send. The full 5-category
 * emoji picker web wires to the composer is intentionally not ported — native
 * mobile keyboards already have a built-in emoji picker, which desktop
 * browsers don't reliably offer, so the underlying need doesn't carry over.
 * "Share event" is also not ported here — flagged separately as a real,
 * distinct composer feature judged out of proportion for this pass.
 */
export function Composer({ otherUserName, replyingTo, onDismissReply, onSend, initialText }: Props) {
  const [text, setText] = useState(initialText ?? '');
  const [staged, setStaged] = useState<StagedFile | null>(null);
  const [sending, setSending] = useState(false);

  const validate = (mimeType: string, size: number): string | null => {
    if (!ALLOWED_MIME.has(mimeType)) return `Unsupported file type: ${mimeType || 'unknown'}.`;
    const limit = mimeType.startsWith('video/') ? MAX_VIDEO : mimeType.startsWith('image/') ? MAX_IMAGE : MAX_FILE;
    if (size > limit) return `File too large (${formatFileSize(size)}). Maximum is ${Math.round(limit / 1048576)} MB.`;
    return null;
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
    const size = asset.fileSize ?? 0;
    const err = validate(mimeType, size);
    if (err) {
      Alert.alert('Cannot attach file', err);
      return;
    }
    setStaged({ uri: asset.uri, name: asset.fileName || `attachment.${mimeType.split('/')[1] ?? 'dat'}`, size, mimeType });
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'application/octet-stream';
    const size = asset.size ?? 0;
    const err = validate(mimeType, size);
    if (err) {
      Alert.alert('Cannot attach file', err);
      return;
    }
    setStaged({ uri: asset.uri, name: asset.name, size, mimeType });
  };

  const handleSend = async () => {
    if ((!text.trim() && !staged) || sending) return;
    setSending(true);
    try {
      await onSend({ content: text.trim(), file: staged ?? undefined });
      setText('');
      setStaged(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ backgroundColor: V.surface, borderTopWidth: 1, borderTopColor: V.line }}>
      {replyingTo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: V.primarySoft, paddingHorizontal: 12, paddingVertical: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontWeight: '600', fontSize: 9.5, color: V.primaryDeep }}>Replying to {replyingTo.senderName}</Text>
            <Text style={{ fontWeight: '400', fontSize: 11, color: V.inkSoft }} numberOfLines={1}>
              {replyingTo.content || '📎 Attachment'}
            </Text>
          </View>
          <Pressable onPress={onDismissReply} hitSlop={8}>
            <X size={15} color={V.inkSoft} />
          </Pressable>
        </View>
      ) : null}

      {staged ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: V.canvas, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}>
            <FileText size={13} color={V.primary} />
            <Text style={{ fontWeight: '400', fontSize: 10.5, color: V.ink, maxWidth: 160 }} numberOfLines={1}>
              {staged.name}
            </Text>
            <Text style={{ fontWeight: '500', fontSize: 9, color: V.inkFaint }}>{formatFileSize(staged.size)}</Text>
            <Pressable onPress={() => setStaged(null)} hitSlop={6}>
              <X size={13} color={V.inkFaint} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10 }}>
        <Pressable
          onPress={() =>
            Alert.alert('Attach', undefined, [
              { text: 'Photo or Video', onPress: pickMedia },
              { text: 'Document', onPress: pickDocument },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
          hitSlop={8}
          style={{ paddingBottom: 8 }}
        >
          <Paperclip size={19} color={V.inkFaint} />
        </Pressable>
        <View style={{ flex: 1, backgroundColor: V.canvas, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 100 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${otherUserName}…`}
            placeholderTextColor={V.inkFaint}
            multiline
            style={{ fontWeight: '400', fontSize: 13, color: V.ink, maxHeight: 84 }}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={(!text.trim() && !staged) || sending}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center', opacity: (!text.trim() && !staged) || sending ? 0.5 : 1 }}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <ArrowUp size={16} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );
}

export async function uploadStagedFile(file: StagedFile): Promise<{ fileUrl: string; fileName: string; fileSize: number; fileMimeType: string }> {
  const uploadable = toUploadableFile(file.uri);
  const res = await uploadFiles([uploadable], 'chat');
  return { fileUrl: res.urls[0], fileName: file.name, fileSize: file.size, fileMimeType: file.mimeType };
}
