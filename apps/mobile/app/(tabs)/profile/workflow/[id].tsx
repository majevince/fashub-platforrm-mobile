import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, CheckCircle2, Circle, CircleDot, X } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { getWorkflow, advanceWorkflowStage, approveWorkflowDelivery, requestWorkflowRevision, cancelWorkflow, resolveMediaUrl, ApiError } from '@fashub/api-client';
import { CANCELLATION_REASONS, type Workflow } from '@fashub/types';
import { Button } from '../../../../components/Button';
import { Banner } from '../../../../components/Banner';
import { LoadingState } from '../../../../components/LoadingState';

export default function WorkflowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('other');
  const [cancelNote, setCancelNote] = useState('');

  const load = () => {
    if (!user || !id) return;
    getWorkflow(id, user.id)
      .then((res) => {
        setWorkflow(res.workflow);
        setError('');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this workflow."));
  };

  useEffect(load, [user, id]);

  if (!user || !id) return null;

  const isCreator = workflow?.creatorId === user.id;
  const isClient = workflow?.clientId === user.id;
  const other = workflow ? (isCreator ? workflow.client : workflow.creator) : null;

  const runAction = async (fn: () => Promise<{ workflow: Workflow }>) => {
    setBusy(true);
    try {
      const res = await fn();
      setWorkflow(res.workflow);
    } catch (err) {
      Alert.alert('Action failed', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setCancelOpen(false);
    await runAction(() => cancelWorkflow(id, user.id, cancelReason, cancelNote.trim() || undefined));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, flex: 1 }} numberOfLines={1}>
          {workflow?.title ?? 'Workflow'}
        </Text>
      </View>

      {error ? (
        <View style={{ padding: spacing.lg }}>
          <Banner tone="error">{error}</Banner>
        </View>
      ) : !workflow ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          {workflow.status === 'cancelled' ? (
            <Banner tone="error">
              {`Cancelled by ${workflow.cancelledBy === user.id ? 'you' : other?.displayName ?? 'the other party'}` +
                (workflow.cancellationReason ? ` — ${CANCELLATION_REASONS.find((r) => r.value === workflow.cancellationReason)?.label ?? workflow.cancellationReason}` : '') +
                (workflow.cancellationNote ? `. "${workflow.cancellationNote}"` : '')}
            </Banner>
          ) : null}

          {other ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.oxblood, overflow: 'hidden' }}>
                {other.avatar ? <Image source={{ uri: resolveMediaUrl(other.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
              </View>
              <View>
                <Text style={{ fontWeight: '600', fontSize: 13, color: colors.ink }}>{other.displayName}</Text>
                <Text style={{ fontWeight: '400', fontSize: 10.5, color: colors.inkSoft, textTransform: 'capitalize' }}>
                  {isCreator ? 'Client' : 'Creator'} · {other.role}
                </Text>
              </View>
              {workflow.agreedPrice != null ? (
                <Text style={{ marginLeft: 'auto', fontWeight: '700', fontSize: 16, color: colors.gold }}>${workflow.agreedPrice.toLocaleString()}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: 4 }}>
            <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>STAGES</Text>
            {workflow.stages.map((stage) => (
              <View key={stage.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  {stage.status === 'completed' ? (
                    <CheckCircle2 size={18} color={colors.gold} />
                  ) : stage.status === 'active' ? (
                    <CircleDot size={18} color={colors.oxblood} />
                  ) : (
                    <Circle size={18} color={colors.lineStrong} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 12.5, color: stage.status === 'pending' ? colors.inkSoft : colors.ink }}>{stage.name}</Text>
                  {stage.description ? <Text style={{ fontWeight: '400', fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>{stage.description}</Text> : null}
                  {stage.updates && stage.updates.length > 0 ? (
                    <View style={{ marginTop: 6, gap: 4 }}>
                      {stage.updates.map((u) => (
                        <Text key={u.id} style={{ fontWeight: '500', fontSize: 10, color: colors.inkSoft }}>
                          · {u.content}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {isCreator && workflow.status !== 'completed' && workflow.status !== 'cancelled' ? (
            <View style={{ gap: 10 }}>
              <Button variant="primary" onPress={() => runAction(() => advanceWorkflowStage(id, user.id))} disabled={busy}>
                Advance stage
              </Button>
              <Pressable onPress={() => setCancelOpen(true)} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ fontWeight: '600', fontSize: 12.5, color: colors.oxblood }}>Cancel project</Text>
              </Pressable>
            </View>
          ) : null}

          {isClient && workflow.status === 'delivered' && !workflow.clientApproved ? (
            <View style={{ gap: 10 }}>
              <Button variant="primary" onPress={() => runAction(() => approveWorkflowDelivery(id, user.id))} disabled={busy}>
                Approve delivery
              </Button>
              <Button variant="outline" onPress={() => runAction(() => requestWorkflowRevision(id, user.id))} disabled={busy}>
                Request revision
              </Button>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={cancelOpen} animationType="slide" transparent onRequestClose={() => setCancelOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,16,0.4)' }}>
          <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Cancel project</Text>
              <Pressable onPress={() => setCancelOpen(false)} hitSlop={8}>
                <X size={20} color={colors.inkSoft} />
              </Pressable>
            </View>
            <View style={{ gap: 6 }}>
              {CANCELLATION_REASONS.map((r) => (
                <Pressable key={r.value} onPress={() => setCancelReason(r.value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: cancelReason === r.value ? colors.oxblood : colors.line, alignItems: 'center', justifyContent: 'center' }}>
                    {cancelReason === r.value ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.oxblood }} /> : null}
                  </View>
                  <Text style={{ fontWeight: '400', fontSize: 13, color: colors.ink }}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={cancelNote}
              onChangeText={setCancelNote}
              placeholder="Add a note (optional)…"
              placeholderTextColor={colors.inkSoft}
              multiline
              style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10, minHeight: 60, fontWeight: '400', fontSize: 13, color: colors.ink }}
            />
            <Button variant="secondary" onPress={handleCancel}>
              Confirm cancellation
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
