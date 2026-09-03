import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Receipt, CalendarClock, Tag, Wallet, Clock, ShieldCheck, ChevronRight, Package, Calendar as CalendarIcon, MapPin, FolderKanban } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { resolveMediaUrl } from '@fashub/api-client';
import type {
  InquiryData,
  FabricCardData,
  ColorVariantSnapshot,
  EventCardData,
  ProjectCardData,
  PostCardData,
  StoryCardData,
} from '@fashub/types';
import { VerifiedBadge } from '../VerifiedBadge';

function isProTier(v?: boolean | string | null): boolean {
  return v === true || v === 'pro' || v === 'business';
}

// ─── Parsers — mirror web's components/chat/*.tsx parse*Data functions exactly ───

export function parseInquiryData(attachmentType: string | null | undefined, attachmentData: unknown): InquiryData | null {
  if (attachmentType !== 'project_inquiry') return null;
  const d = attachmentData as Partial<InquiryData> | null;
  if (!d || typeof d !== 'object' || !d.message) return null;
  return {
    inquiryType: d.inquiryType ?? 'message',
    projectId: d.projectId ?? null,
    projectTitle: d.projectTitle ?? null,
    projectCoverImage: d.projectCoverImage ?? null,
    creatorName: d.creatorName ?? null,
    creatorAvatar: d.creatorAvatar ?? null,
    creatorRole: d.creatorRole ?? null,
    creatorIsPro: d.creatorIsPro ?? false,
    creatorIsVerified: d.creatorIsVerified ?? false,
    budget: d.budget ?? null,
    timeline: d.timeline ?? null,
    category: d.category ?? null,
    message: d.message,
  };
}

export function parseFabricData(attachmentType: string | null | undefined, attachmentData: unknown): FabricCardData | null {
  if (attachmentType !== 'fabric') return null;
  const r = attachmentData as Record<string, unknown> | null;
  if (!r || typeof r !== 'object' || !r.id || !r.name) return null;
  let cv: ColorVariantSnapshot[] = [];
  if (Array.isArray(r.colorVariants)) {
    cv = (r.colorVariants as unknown[]).map((v) => {
      if (typeof v === 'string') return { hex: v };
      const obj = v as Record<string, unknown>;
      return {
        id: obj.id as string | undefined,
        label: obj.label as string | undefined,
        hex: obj.hex as string | undefined,
        photos: Array.isArray(obj.photos) ? (obj.photos as string[]) : [],
      };
    });
  }
  return {
    id: String(r.id),
    name: String(r.name),
    rollNumber: typeof r.rollNumber === 'string' ? r.rollNumber : null,
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    colorVariants: cv,
    fabricType: String(r.fabricType ?? 'Fabric'),
    composition: typeof r.composition === 'string' ? r.composition : null,
    color: typeof r.color === 'string' ? r.color : null,
    secondaryColor: typeof r.secondaryColor === 'string' ? r.secondaryColor : null,
    weight: typeof r.weight === 'string' ? r.weight : null,
    pattern: typeof r.pattern === 'string' ? r.pattern : null,
    unit: typeof r.unit === 'string' ? r.unit : null,
    sellingPricePerUnit: typeof r.sellingPricePerUnit === 'number' ? r.sellingPricePerUnit : null,
    costPerUnit: typeof r.costPerUnit === 'number' ? r.costPerUnit : null,
    available: typeof r.available === 'number' ? r.available : 0,
    reserved: typeof r.reserved === 'number' ? r.reserved : 0,
    reorderLevel: typeof r.reorderLevel === 'number' ? r.reorderLevel : null,
    inStock: Boolean(r.inStock ?? true),
    usageCategories: Array.isArray(r.usageCategories) ? (r.usageCategories as string[]) : [],
    supplier: typeof r.supplier === 'string' ? r.supplier : null,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    deleted: Boolean(r.deleted ?? false),
    isSampleRequest: Boolean(r.isSampleRequest ?? false),
    ownerInfo: (r.ownerInfo as FabricCardData['ownerInfo']) ?? null,
    note: typeof r.note === 'string' ? r.note : null,
  };
}

export function parseEventData(attachmentType: string | null | undefined, attachmentData: unknown): EventCardData | null {
  if (attachmentType !== 'event') return null;
  const d = attachmentData as Partial<EventCardData> | null;
  if (!d || !d.title) return null;
  return d as EventCardData;
}

export function parseProjectData(attachmentType: string | null | undefined, attachmentData: unknown): ProjectCardData | null {
  if (attachmentType !== 'project') return null;
  const d = attachmentData as Partial<ProjectCardData> | null;
  if (!d || !d.title) return null;
  return d as ProjectCardData;
}

export function parsePostData(attachmentType: string | null | undefined, attachmentData: unknown): PostCardData | null {
  if (attachmentType !== 'post') return null;
  const d = attachmentData as Partial<PostCardData> | null;
  if (!d || !d.title) return null;
  return d as PostCardData;
}

export function parseStoryData(attachmentType: string | null | undefined, attachmentData: unknown): StoryCardData | null {
  if (attachmentType !== 'story') return null;
  const d = attachmentData as Partial<StoryCardData> | null;
  if (!d || !d.storyId) return null;
  return d as StoryCardData;
}

// ─── InquiryCard ────────────────────────────────────────────────────────────

const INQUIRY_CONFIG = {
  message: { label: 'General Inquiry', Icon: Mail, badgeBg: V.primarySoft, badgeText: V.primaryDeep },
  quote: { label: 'Quote Request', Icon: Receipt, badgeBg: '#D1FAE5', badgeText: '#047857' },
  consultation: { label: 'Consultation Request', Icon: CalendarClock, badgeBg: V.amberSoft, badgeText: V.amber },
} as const;

export function InquiryCard({ data, isOwn, senderName }: { data: InquiryData; isOwn: boolean; senderName: string }) {
  const config = INQUIRY_CONFIG[data.inquiryType] ?? INQUIRY_CONFIG.message;
  const hasProject = !!(data.projectTitle || data.projectCoverImage);

  return (
    <View style={{ width: 260, borderRadius: 14, overflow: 'hidden', backgroundColor: V.surface, borderWidth: 1, borderColor: V.line }}>
      {data.projectCoverImage ? (
        <View style={{ height: 120 }}>
          <LinearGradient colors={[V.primary, V.primaryDeep]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <Image source={{ uri: resolveMediaUrl(data.projectCoverImage) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: config.badgeBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
            <config.Icon size={11} color={config.badgeText} />
            <Text style={{ fontWeight: '700', fontSize: 10, color: config.badgeText }}>{config.label}</Text>
          </View>
          {data.projectTitle ? (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 }}>
              <Text style={{ fontWeight: '700', fontSize: 13.5, color: '#fff' }} numberOfLines={2}>
                {data.projectTitle}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ padding: 14, paddingBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: config.badgeBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
            <config.Icon size={11} color={config.badgeText} />
            <Text style={{ fontWeight: '700', fontSize: 10, color: config.badgeText }}>{config.label}</Text>
          </View>
          {data.projectTitle ? (
            <Text style={{ fontWeight: '600', fontSize: 13, color: V.ink, marginTop: 6 }} numberOfLines={1}>
              {data.projectTitle}
            </Text>
          ) : null}
        </View>
      )}

      <View style={{ padding: 14, gap: 10 }}>
        {data.creatorName ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {data.creatorAvatar ? (
                <Image source={{ uri: resolveMediaUrl(data.creatorAvatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Text style={{ fontWeight: '700', fontSize: 10, color: '#fff' }}>{data.creatorName.slice(0, 2).toUpperCase()}</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
              <Text style={{ fontWeight: '400', fontSize: 12, color: V.ink }} numberOfLines={1}>
                {data.creatorName}
              </Text>
              {data.creatorIsVerified ? <VerifiedBadge size="sm" /> : null}
              {data.creatorRole ? (
                <Text style={{ fontWeight: '400', fontSize: 10.5, color: V.inkFaint }} numberOfLines={1}>
                  · {data.creatorRole}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {data.category ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Tag size={12} color={V.inkFaint} />
            <Text style={{ fontWeight: '400', fontSize: 11, color: V.inkFaint, textTransform: 'capitalize' }}>{data.category}</Text>
          </View>
        ) : null}

        {data.budget || data.timeline ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {data.budget ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Wallet size={11} color={V.inkFaint} />
                <Text style={{ fontWeight: '400', fontSize: 10.5, color: V.inkSoft }}>{data.budget}</Text>
              </View>
            ) : null}
            {data.timeline ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Clock size={11} color={V.inkFaint} />
                <Text style={{ fontWeight: '400', fontSize: 10.5, color: V.inkSoft }}>{data.timeline}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={{ height: 1, backgroundColor: V.line }} />

        <View>
          <Text style={{ fontWeight: '500', fontSize: 9.5, letterSpacing: 0.5, color: V.inkFaint, textTransform: 'uppercase', marginBottom: 3 }}>Message</Text>
          <Text style={{ fontWeight: '400', fontSize: 12.5, lineHeight: 17, color: V.inkSoft }}>{data.message}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '400', fontSize: 10.5, color: V.inkFaint }}>{isOwn ? 'Sent by you' : `From ${senderName}`}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={11} color={V.inkFaint} />
            <Text style={{ fontWeight: '500', fontSize: 10, color: V.inkFaint }}>Secure inquiry</Text>
          </View>
        </View>

        {hasProject ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line, borderRadius: 10, paddingVertical: 9 }}>
            <FolderKanban size={14} color={V.inkSoft} />
            <Text style={{ fontWeight: '600', fontSize: 12, color: V.inkSoft }}>View Project</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── FabricMessageCard (inventory / sample-request card) ────────────────────

const TYPE_BG: Record<string, { bg: string; text: string }> = {
  silk: { bg: '#FCE7F3', text: '#BE185D' },
  cotton: { bg: '#DBEAFE', text: '#1D4ED8' },
  denim: { bg: '#E0E7FF', text: '#4338CA' },
  linen: { bg: V.amberSoft, text: V.amber },
  wool: { bg: '#FFEDD5', text: '#C2410C' },
  lace: { bg: '#FFE4E6', text: '#BE123C' },
  velvet: { bg: '#F3E8FF', text: '#7E22CE' },
  chiffon: { bg: '#E0F2FE', text: '#0369A1' },
  satin: { bg: V.primarySoft, text: V.primaryDeep },
  polyester: { bg: '#F3F4F6', text: '#4B5563' },
};

function stockStatus(inStock: boolean, available: number, reorderLevel?: number | null) {
  if (!inStock || available === 0) return { label: 'Out of stock', dot: '#EF4444', bg: 'rgba(239,68,68,0.1)', text: '#DC2626' };
  if (reorderLevel != null && available <= reorderLevel) return { label: 'Low stock', dot: '#FACC15', bg: 'rgba(250,204,21,0.12)', text: '#A16207' };
  return { label: 'In stock', dot: '#10B981', bg: 'rgba(16,185,129,0.1)', text: '#059669' };
}

function fmtUnit(unit?: string | null): string {
  if (!unit) return 'yd';
  return unit.replace('meters', 'm').replace('yards', 'yd').replace('meter', 'm').replace('yard', 'yd');
}

function capitalize(s?: string | null): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function FabricMessageCard({
  data,
  isOwn,
  senderName,
  timestamp,
  onApprove,
  onDecline,
}: {
  data: FabricCardData;
  isOwn: boolean;
  senderName: string;
  timestamp: string;
  onApprove?: () => void;
  onDecline?: () => void;
}) {
  const isDeleted = data.deleted;
  const cv = data.colorVariants ?? [];
  const coverImg = cv[0]?.photos?.[0] ?? data.images?.[0] ?? null;
  const stock = stockStatus(data.inStock, data.available ?? 0, data.reorderLevel);
  const price = data.sellingPricePerUnit ?? data.costPerUnit ?? null;
  const unit = fmtUnit(data.unit);
  const available = data.available ?? 0;
  const timeLabel = new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const typeC = TYPE_BG[data.fabricType?.toLowerCase?.()] ?? { bg: '#F3F4F6', text: '#4B5563' };

  if (isDeleted) {
    return (
      <View style={{ width: 260, borderRadius: 16, overflow: 'hidden', backgroundColor: V.surface, borderWidth: 1, borderColor: V.line, opacity: 0.5 }}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontWeight: '400', fontSize: 12, fontStyle: 'italic', color: V.inkFaint }}>This fabric listing has been removed.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: 260, borderRadius: 16, overflow: 'hidden', backgroundColor: V.surface, borderWidth: 1, borderColor: V.line }}>
      {data.note ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: V.canvas }}>
          <Text style={{ fontWeight: '400', fontSize: 12.5, color: V.ink }}>{data.note}</Text>
        </View>
      ) : null}

      {data.isSampleRequest ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: V.amberSoft, borderBottomWidth: 1, borderBottomColor: V.amberLine }}>
          <Package size={12} color={V.amber} />
          <Text style={{ fontWeight: '700', fontSize: 10, letterSpacing: 0.3, color: V.amber }}>Sample Request</Text>
          <Text style={{ fontWeight: '400', fontSize: 9.5, color: V.amber, marginLeft: 'auto' }}>{timeLabel}</Text>
        </View>
      ) : null}

      <View style={{ height: 130, backgroundColor: V.canvas, position: 'relative' }}>
        {coverImg ? (
          <Image source={{ uri: resolveMediaUrl(coverImg) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: data.color || '#D1D5DB' }}>
            <Text style={{ fontSize: 34, fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{data.fabricType?.charAt(0) ?? '?'}</Text>
          </View>
        )}
        <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: typeC.bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
          <Text style={{ fontWeight: '700', fontSize: 8.5, color: typeC.text, textTransform: 'capitalize' }}>{data.fabricType}</Text>
        </View>
        <View style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: stock.bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stock.dot }} />
          <Text style={{ fontWeight: '600', fontSize: 9, color: stock.text }}>{stock.label}</Text>
        </View>
        {cv.length > 1 ? (
          <View style={{ position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', gap: 3 }}>
            {cv.slice(0, 5).map((v, i) => (
              <View key={i} style={{ width: 11, height: 11, borderRadius: 5.5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: v.hex ?? '#ccc' }} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ padding: 13, gap: 9 }}>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 13.5, color: V.ink }} numberOfLines={2}>
            {data.name}
          </Text>
          {data.rollNumber ? (
            <Text style={{ fontWeight: '500', fontSize: 10, color: V.inkFaint, marginTop: 2 }}>SKU {data.rollNumber}</Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700', fontSize: 13.5, color: V.ink }}>
            {price != null && price > 0 ? `$${price.toFixed(2)}` : '—'}
            <Text style={{ fontWeight: '400', fontSize: 10, color: V.inkFaint }}> /{unit}</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: stock.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stock.dot }} />
            <Text style={{ fontWeight: '600', fontSize: 9.5, color: stock.text }}>
              {available > 0 ? `${available % 1 === 0 ? available : available.toFixed(1)}${unit} avail` : 'Unavailable'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[
            { label: 'Weight', value: capitalize(data.weight) },
            { label: 'Pattern', value: capitalize(data.pattern) },
          ].map((m) => (
            <View key={m.label} style={{ flex: 1, backgroundColor: V.canvas, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ fontWeight: '700', fontSize: 8, color: V.inkFaint, textTransform: 'uppercase', letterSpacing: 0.3 }}>{m.label}</Text>
              <Text style={{ fontWeight: '600', fontSize: 10, color: V.inkSoft, marginTop: 1 }} numberOfLines={1}>
                {m.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: V.canvas, paddingTop: 8 }}>
          <Text style={{ fontWeight: '400', fontSize: 10, color: V.inkFaint }} numberOfLines={1}>
            {isOwn ? 'Shared by you' : `Shared by ${senderName}`}
          </Text>
          {!data.isSampleRequest ? <Text style={{ fontWeight: '400', fontSize: 10, color: V.inkFaint }}>{timeLabel}</Text> : null}
        </View>

        {data.isSampleRequest && !isOwn && (onApprove || onDecline) ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {onApprove ? (
              <Pressable onPress={onApprove} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: '#10B981' }}>
                <Text style={{ fontWeight: '600', fontSize: 11.5, color: '#fff' }}>Approve</Text>
              </Pressable>
            ) : null}
            {onDecline ? (
              <Pressable onPress={onDecline} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: V.canvas }}>
                <Text style={{ fontWeight: '600', fontSize: 11.5, color: V.inkSoft }}>Decline</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontWeight: '600', fontSize: 11, color: V.primary }}>View in Inventory</Text>
          <ChevronRight size={12} color={V.primary} />
        </View>
      </View>
    </View>
  );
}

// ─── EventMessageCard ─────────────────────────────────────────────────────

export function EventMessageCard({ data, senderName }: { data: EventCardData; senderName: string }) {
  const priceLabel = data.isFree ? 'Free' : data.price != null ? `${data.currency ?? '$'}${data.price}` : null;

  return (
    <View style={{ width: 240, borderRadius: 14, overflow: 'hidden', backgroundColor: V.surface, borderWidth: 1, borderColor: V.line }}>
      <View style={{ height: 100, backgroundColor: V.canvas }}>
        {data.image ? (
          <Image source={{ uri: resolveMediaUrl(data.image) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <LinearGradient colors={[V.primary, '#7C3AED']} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon size={26} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        )}
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: V.ink }} numberOfLines={1}>
          {data.title}
        </Text>
        <Text style={{ fontWeight: '400', fontSize: 11, color: V.primary }}>
          {new Date(data.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
        {data.location ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} color={V.inkFaint} />
            <Text style={{ fontWeight: '400', fontSize: 10.5, color: V.inkFaint }} numberOfLines={1}>
              {data.location}
            </Text>
          </View>
        ) : null}
        {priceLabel ? (
          <Text style={{ fontWeight: '600', fontSize: 11, color: data.isFree ? '#059669' : V.ink, marginTop: 2 }}>{priceLabel}</Text>
        ) : null}
        <Text style={{ fontWeight: '400', fontSize: 9.5, color: V.inkFaint, marginTop: 4 }}>From {senderName}</Text>
      </View>
    </View>
  );
}

// ─── ProjectMessageCard ───────────────────────────────────────────────────

export function ProjectMessageCard({ data, senderName }: { data: ProjectCardData; senderName: string }) {
  return (
    <View style={{ width: 240, borderRadius: 14, overflow: 'hidden', backgroundColor: V.surface, borderWidth: 1, borderColor: V.line }}>
      <View style={{ height: 100, backgroundColor: V.canvas }}>
        {data.coverImage ? (
          <Image source={{ uri: resolveMediaUrl(data.coverImage) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <LinearGradient colors={[V.primary, '#7C3AED']} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={26} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        )}
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: V.ink }} numberOfLines={1}>
          {data.title}
        </Text>
        {data.category ? (
          <Text style={{ fontWeight: '400', fontSize: 10.5, color: V.inkFaint, textTransform: 'capitalize' }}>{data.category}</Text>
        ) : null}
        {data.summary ? (
          <Text style={{ fontWeight: '400', fontSize: 11, color: V.inkSoft }} numberOfLines={2}>
            {data.summary}
          </Text>
        ) : null}
        <Text style={{ fontWeight: '400', fontSize: 9.5, color: V.inkFaint, marginTop: 4 }}>From {senderName}</Text>
      </View>
    </View>
  );
}

// ─── PostMessageCard ──────────────────────────────────────────────────────

export function PostMessageCard({ data }: { data: PostCardData }) {
  const cover = data.images?.[0];
  return (
    <View style={{ width: 240, borderRadius: 14, overflow: 'hidden', backgroundColor: V.surface, borderWidth: 1, borderColor: V.line }}>
      <View style={{ height: 100, backgroundColor: V.canvas }}>
        {cover ? <Image source={{ uri: resolveMediaUrl(cover) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: V.ink }} numberOfLines={1}>
          {data.title}
        </Text>
        {data.basePrice != null ? (
          <Text style={{ fontWeight: '600', fontSize: 12, color: V.primary }}>
            {data.currency ?? '$'}
            {data.basePrice}
          </Text>
        ) : null}
        {data.authorName ? <Text style={{ fontWeight: '400', fontSize: 9.5, color: V.inkFaint }}>By {data.authorName}</Text> : null}
      </View>
    </View>
  );
}

// ─── StoryMessageCard ─────────────────────────────────────────────────────

export function StoryMessageCard({
  data,
  onOpen,
  unavailable,
}: {
  data: StoryCardData;
  onOpen?: () => void;
  /** Set by the parent after GET /api/stories/[id] came back 404 for this
   * card's storyId — catches early author-deletion, which the snapshot's
   * expiresAt alone can't detect. */
  unavailable?: boolean;
}) {
  const expired = unavailable || Date.now() >= new Date(data.expiresAt).getTime();

  return (
    <Pressable onPress={expired ? undefined : onOpen} style={{ width: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: V.ink, opacity: expired ? 0.55 : 1 }}>
      <View style={{ height: 200, backgroundColor: '#000' }}>
        {data.thumbnailUrl ? <Image source={{ uri: resolveMediaUrl(data.thumbnailUrl) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
        <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
          <Text style={{ fontWeight: '500', fontSize: 8.5, color: '#fff' }}>{expired ? 'No longer available' : 'Story reply'}</Text>
        </View>
      </View>
      {data.replyText ? (
        <View style={{ padding: 8 }}>
          <Text style={{ fontWeight: '400', fontSize: 11, color: '#fff' }} numberOfLines={2}>
            {data.replyText}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
