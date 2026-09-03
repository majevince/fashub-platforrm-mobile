import React from 'react';
import { Modal, View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCommentsThread } from './useCommentsThread';
import { CommentsList, CommentsComposer, CommentsMenuSheet } from './CommentsThreadView';

type Props = {
  postId: string;
  postAuthorId?: string;
  visible: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
};

/**
 * LinkedIn-pattern comment sheet — same interaction model as web's
 * CommentSection (see components/posts/PostCard/CommentSection.tsx):
 * replies flattened one level under their top-level parent with a
 * connector line, collapsed-by-default replies revealing history via
 * "See previous replies", dual reaction display, a role-differentiated
 * menu (own: edit/delete; post owner: pin/delete/report; else: report),
 * and ONE persistent composer at the bottom with a dismissible
 * "Replying to @username" chip — never pre-filled raw text.
 *
 * This is a thin Modal wrapper — all state/behavior lives in
 * useCommentsThread(), shared with the full-screen post detail view
 * (app/post/[id].tsx) so there's exactly one comment implementation.
 */
export function CommentsSheet({ postId, postAuthorId, visible, onClose, onCommentAdded }: Props) {
  const { typeScale, spacing } = useTheme();
  const thread = useCommentsThread(postId, postAuthorId, onCommentAdded, visible);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,21,35,0.4)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View
            style={{
              backgroundColor: V.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '80%',
              paddingTop: spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: V.line,
              }}
            >
              <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: V.ink }}>
                Comments{thread.comments && thread.comments.length > 0 ? ` (${thread.comments.length})` : ''}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={20} color={V.inkFaint} />
              </Pressable>
            </View>

            <CommentsList thread={thread} scrollable />
            <CommentsComposer thread={thread} />
          </View>
        </KeyboardAvoidingView>
      </View>

      {thread.menuFor && <CommentsMenuSheet actions={thread.menuActions} onClose={thread.closeMenu} />}
    </Modal>
  );
}
