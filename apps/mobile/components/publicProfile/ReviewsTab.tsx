import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Star, MessageSquare, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getReviews, createReview, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { ProfileDetail, Review } from '@fashub/types';
import type { User } from '@fashub/types';
import { LoadingState } from '../../components/LoadingState';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { EmptyNotice } from './PortfolioTab';

const RATING_LABELS = [
  { key: 'qualityRating', label: 'Quality' },
  { key: 'serviceRating', label: 'Service' },
  { key: 'valueRating', label: 'Value' },
  { key: 'timelinessRating', label: 'Timeliness' },
  { key: 'communicationRating', label: 'Communication' },
] as const;

export function ReviewsTab({
  profile,
  rating,
  currentUser,
  isOwner,
  allowReviews,
  refreshKey,
  onSubmitted,
}: {
  profile: ProfileDetail;
  rating: { averageRating: number; totalReviews: number } | null;
  currentUser: User;
  isOwner: boolean;
  allowReviews: boolean;
  refreshKey: number;
  onSubmitted: () => void;
}) {
  const { colors, typeScale, radius } = useTheme();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (!allowReviews) return;
    getReviews(profile.id, { limit: 20 })
      .then((res) => setReviews(res.reviews))
      .catch(() => setReviews([]));
  }, [profile.id, allowReviews, refreshKey]);

  if (!allowReviews) {
    return <EmptyNotice icon={MessageSquare} title="Reviews are disabled" message="This user has turned off reviews for this profile." />;
  }

  return (
    <View style={{ gap: 16 }}>
      {rating && rating.totalReviews > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14 }}>
          <Text style={{ fontWeight: '700', fontSize: 30, color: colors.ink }}>{rating.averageRating.toFixed(1)}</Text>
          <View>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={13} color={colors.gold} fill={i <= Math.round(rating.averageRating) ? colors.gold : 'transparent'} />
              ))}
            </View>
            <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft, marginTop: 2 }}>{rating.totalReviews} reviews</Text>
          </View>
        </View>
      ) : null}

      {!isOwner ? (
        <Button variant="outline" onPress={() => setComposerOpen(true)}>
          Write a review
        </Button>
      ) : null}

      {reviews === null ? (
        <LoadingState />
      ) : reviews.length === 0 ? (
        <EmptyNotice icon={MessageSquare} title="No Reviews Yet" message="Be the first to leave a review." />
      ) : (
        <View style={{ gap: 12 }}>
          {reviews.map((r) => (
            <View key={r.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.inkSoft, overflow: 'hidden' }}>
                  {r.reviewerAvatar ? <Image source={{ uri: resolveMediaUrl(r.reviewerAvatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{r.reviewerName}</Text>
                  <View style={{ flexDirection: 'row', gap: 1 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={10} color={colors.gold} fill={i <= Math.round(r.overallRating) ? colors.gold : 'transparent'} />
                    ))}
                  </View>
                </View>
                <Text style={{ fontSize: 9.5, fontWeight: '400', color: colors.inkSoft }}>{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
              {r.title ? <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{r.title}</Text> : null}
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{r.comment}</Text>
            </View>
          ))}
        </View>
      )}

      <ReviewComposer
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        currentUser={currentUser}
        profile={profile}
        onSubmitted={() => {
          setComposerOpen(false);
          onSubmitted();
        }}
      />
    </View>
  );
}

function ReviewComposer({
  visible,
  onClose,
  currentUser,
  profile,
  onSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  currentUser: User;
  profile: ProfileDetail;
  onSubmitted: () => void;
}) {
  const { colors, typeScale, spacing, radius } = useTheme();
  const [scores, setScores] = useState<Record<string, number>>({ qualityRating: 0, serviceRating: 0, valueRating: 0, timelinessRating: 0, communicationRating: 0 });
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (Object.values(scores).some((v) => v === 0) || !comment.trim()) {
      setError('Rate every category and add a comment.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createReview({
        reviewerId: currentUser.id,
        reviewerName: currentUser.displayName,
        reviewerAvatar: currentUser.avatar,
        reviewerRole: currentUser.role,
        revieweeId: profile.id,
        revieweeRole: profile.role,
        qualityRating: scores.qualityRating,
        serviceRating: scores.serviceRating,
        valueRating: scores.valueRating,
        timelinessRating: scores.timelinessRating,
        communicationRating: scores.communicationRating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      setScores({ qualityRating: 0, serviceRating: 0, valueRating: 0, timelinessRating: 0, communicationRating: 0 });
      setTitle('');
      setComment('');
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.ivory }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={22} color={colors.ink} />
          </Pressable>
          <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Write a review</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          {error ? <Banner tone="error">{error}</Banner> : null}
          {RATING_LABELS.map(({ key, label }) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.ink }}>{label}</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Pressable key={i} onPress={() => setScores((s) => ({ ...s, [key]: i }))} hitSlop={4}>
                    <Star size={22} color={colors.gold} fill={i <= scores[key] ? colors.gold : 'transparent'} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (optional)"
            placeholderTextColor={colors.inkSoft}
            style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 13, fontWeight: '400', color: colors.ink }}
          />
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Share details of your experience…"
            placeholderTextColor={colors.inkSoft}
            multiline
            numberOfLines={5}
            style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, minHeight: 110, textAlignVertical: 'top', fontSize: 13, fontWeight: '400', color: colors.ink }}
          />
          <Button variant="primary" onPress={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit review'}
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
}
