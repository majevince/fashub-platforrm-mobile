import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, TextInput, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { X, Search, Heart, Play, Pause, Music2, Disc3, Type } from 'lucide-react-native';
import { searchTracks, getFavoriteTracks, getRecentTracks, getSoundPacks, toggleTrackFavorite, resolveMediaUrl, ApiError } from '@fashub/api-client';
import { TRACK_MOOD_TABS, type Track, type SoundPack, type TrackMoodTab } from '@fashub/types';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';

export type StickerStyle = 'pill' | 'card' | 'lyric';

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedTrack: Track | null;
  trimStart: number;
  trimEnd: number;
  musicVolume: number;
  originalVolume: number;
  stickerStyle: StickerStyle;
  maxClipSeconds: number;
  hasVideo: boolean;
  onSelectTrack: (track: Track) => void;
  onChangeTrim: (start: number, end: number) => void;
  onChangeMusicVolume: (v: number) => void;
  onChangeOriginalVolume: (v: number) => void;
  onChangeStickerStyle: (style: StickerStyle) => void;
};

/**
 * Real palette from the web app's own components/stories/MusicPicker.tsx +
 * lib/design/tokens.ts (`T`) — confirmed by reading source directly. This is
 * deliberately NOT FaSHub's ink/ivory/gold/oxblood set used everywhere else
 * in this app: the user explicitly chose "match web's real palette" for
 * this feature after being shown that web's actual music-on-story UI runs
 * on this violet system, not gold/oxblood. Scoped to this feature only.
 */
const V = {
  ink: '#1B1523',
  inkSoft: '#645C74',
  inkFaint: '#9992A6',
  canvas: '#FAF8FC',
  surface: '#FFFFFF',
  line: '#EBE6F3',
  lineStrong: '#DDD5EC',
  primary: '#6D28D9',
  primaryDeep: '#4C1D95',
  primarySoft: '#F2EBFC',
} as const;

const STYLE_OPTIONS: { key: StickerStyle; name: string; desc: string; Icon: typeof Music2 }[] = [
  { key: 'pill', name: 'Pill', desc: 'Compact badge, minimal footprint', Icon: Music2 },
  { key: 'card', name: 'Album card', desc: 'Full artwork with a live EQ', Icon: Disc3 },
  { key: 'lyric', name: 'Lyric ticker', desc: 'Animated, synced lyric line', Icon: Type },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const WAVEFORM_W = 260;
const BAR_COUNT = 40;
const MIN_CLIP_SECONDS = 1;

function barHeights(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const heights: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    heights.push(0.22 + ((h % 1000) / 1000) * 0.78);
  }
  return heights;
}

/**
 * "Add sound" sheet — 1:1 port of web's MusicPicker.tsx: search + 6-tab mood
 * strip (Trending/Runway/Studio/Street Style/Chill/Upbeat), curated Runway +
 * community sound-pack sections, Favorites/Recently Used, tabbed Browse /
 * Trim / Sticker style body, real track preview playback, and the "Add to
 * story" footer with the exact cap caption. Colors are web's real violet
 * tokens (see `V` above); fonts stay FaSHub's own (Fraunces/Inter/Space
 * Mono) since only the color system was flagged as a deliberate exception.
 *
 * Known, explicitly-flagged gap vs. web: the waveform is a deterministic
 * seeded approximation, not real decoded audio peaks — web uses
 * wavesurfer.js client-side audio analysis, which has no native RN
 * equivalent without a new native audio-decoding dependency.
 */
export function MusicSheet({
  visible,
  onClose,
  selectedTrack,
  trimStart,
  trimEnd,
  musicVolume,
  originalVolume,
  stickerStyle,
  maxClipSeconds,
  hasVideo,
  onSelectTrack,
  onChangeTrim,
  onChangeMusicVolume,
  onChangeOriginalVolume,
  onChangeStickerStyle,
}: Props) {
  const [tab, setTab] = useState<'browse' | 'trim' | 'style'>(selectedTrack ? 'trim' : 'browse');
  const [query, setQuery] = useState('');
  const [activeMood, setActiveMood] = useState<TrackMoodTab>('trending');
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [runwayPacks, setRunwayPacks] = useState<SoundPack[]>([]);
  const [brandPacks, setBrandPacks] = useState<SoundPack[]>([]);
  const [error, setError] = useState('');

  const previewPlayer = useAudioPlayer(null);
  const previewStatus = useAudioPlayerStatus(previewPlayer);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setTab(selectedTrack ? 'trim' : 'browse');
    else {
      previewPlayer.pause();
      setPlayingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const load = () => {
    setError('');
    setTracks(null);
    searchTracks({
      search: query.trim() || undefined,
      mood: activeMood === 'trending' ? undefined : activeMood,
      sort: activeMood === 'trending' ? 'trending' : undefined,
    })
      .then((res) => setTracks(res.tracks))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load tracks."));
  };

  useEffect(() => {
    if (!visible) return;
    load();
    getFavoriteTracks().then((res) => setFavorites(res.tracks)).catch(() => setFavorites([]));
    getRecentTracks().then((res) => setRecent(res.tracks)).catch(() => setRecent([]));
    getSoundPacks('runway').then((res) => setRunwayPacks(res.packs)).catch(() => setRunwayPacks([]));
    getSoundPacks('brand').then((res) => setBrandPacks(res.packs)).catch(() => setBrandPacks([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeMood]);

  useEffect(() => {
    if (previewStatus.didJustFinish) setPlayingId(null);
  }, [previewStatus.didJustFinish]);

  // Trim-tab preview stops at the trimmed range's end, mirroring web's
  // wavesurfer region-out behavior — full, untrimmed preview elsewhere.
  useEffect(() => {
    if (tab !== 'trim' || !selectedTrack || playingId !== selectedTrack.id) return;
    if (previewStatus.currentTime >= trimEnd) {
      previewPlayer.pause();
      previewPlayer.seekTo(trimStart);
      setPlayingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewStatus.currentTime]);

  const togglePreview = (track: Track) => {
    if (playingId === track.id) {
      previewPlayer.pause();
      setPlayingId(null);
      return;
    }
    const uri = resolveMediaUrl(track.audioUrl) ?? track.audioUrl;
    previewPlayer.replace(uri);
    const startAt = tab === 'trim' && track.id === selectedTrack?.id ? trimStart : 0;
    previewPlayer.seekTo(startAt).then(() => previewPlayer.play());
    setPlayingId(track.id);
  };

  const handleFavorite = async (trackId: string) => {
    try {
      await toggleTrackFavorite(trackId);
      getFavoriteTracks().then((res) => setFavorites(res.tracks)).catch(() => {});
    } catch {
      // Non-critical.
    }
  };

  const handleSelectTrack = (track: Track) => {
    previewPlayer.pause();
    setPlayingId(null);
    onSelectTrack(track);
    setTab('trim');
  };

  const packTracks = (pack: SoundPack): Track[] =>
    pack.trackIds
      .map((id) => tracks?.find((t) => t.id === id) || favorites.find((t) => t.id === id) || recent.find((t) => t.id === id))
      .filter((t): t is Track => Boolean(t));

  const showCuratedSections = !query.trim() && activeMood === 'trending';

  const renderTrack = (track: Track) => (
    <View key={track.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 20 }}>
      <Pressable onPress={() => handleSelectTrack(track)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: V.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {track.coverArtUrl ? (
            <Image source={{ uri: resolveMediaUrl(track.coverArtUrl) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Music2 size={16} color={V.primary} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: V.ink }} numberOfLines={1}>
            {track.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '400', color: V.inkFaint }} numberOfLines={1}>
              {track.artist} · {formatDuration(track.durationSeconds)}
            </Text>
            {track.licensingTier === 'story_only' ? (
              <Text style={{ fontSize: 8, fontWeight: '500', color: V.inkFaint, backgroundColor: V.canvas, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, textTransform: 'uppercase' }}>
                Story only
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      <Pressable onPress={() => handleFavorite(track.id)} hitSlop={8} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
        <Heart size={14} color={track.favorited ? V.primary : V.inkFaint} fill={track.favorited ? V.primary : 'transparent'} />
      </Pressable>
      <Pressable
        onPress={() => togglePreview(track)}
        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line, alignItems: 'center', justifyContent: 'center' }}
      >
        {playingId === track.id ? <Pause size={13} color={V.primary} /> : <Play size={13} color={V.primary} style={{ marginLeft: 1 }} />}
      </Pressable>
    </View>
  );

  const packSection = (title: string, list: Track[]) =>
    list.length > 0 ? (
      <View style={{ paddingBottom: 6 }}>
        <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: V.primary, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
          {title}
        </Text>
        {list.map(renderTrack)}
      </View>
    ) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,11,12,0.55)' }}>
        <View style={{ backgroundColor: V.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '86%' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: V.line, alignSelf: 'center', marginTop: 10 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: V.ink }}>Add sound</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={V.inkSoft} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 10 }}>
              <Search size={15} color={V.inkFaint} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search songs, artists, lyrics…"
                placeholderTextColor={V.inkFaint}
                style={{ flex: 1, fontSize: 13.5, fontWeight: '400', color: V.ink, padding: 0 }}
              />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[...TRACK_MOOD_TABS]}
              keyExtractor={(m) => m.key}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const active = activeMood === item.key;
                return (
                  <Pressable
                    onPress={() => setActiveMood(item.key)}
                    style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: active ? V.primary : V.canvas, borderWidth: active ? 0 : 1, borderColor: V.line }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '600', color: active ? '#fff' : V.inkSoft }}>{item.label}</Text>
                  </Pressable>
                );
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: V.line }}>
            {(['browse', 'trim', 'style'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                disabled={t !== 'browse' && !selectedTrack}
                style={{ marginRight: 20, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: tab === t ? V.primary : 'transparent', opacity: t !== 'browse' && !selectedTrack ? 0.35 : 1 }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: tab === t ? V.ink : V.inkFaint }}>
                  {t === 'browse' ? 'Browse' : t === 'trim' ? 'Trim' : 'Sticker style'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flex: 1 }}>
            {tab === 'browse' ? (
              error ? (
                <ErrorState message={error} onRetry={load} />
              ) : tracks === null ? (
                <LoadingState />
              ) : (
                <FlatList
                  data={tracks}
                  keyExtractor={(t) => t.id}
                  ListHeaderComponent={
                    showCuratedSections ? (
                      <View>
                        {runwayPacks.map((pack) =>
                          packTracks(pack).length > 0 ? (
                            <View key={pack.id}>{packSection(`Runway Sound${pack.season ? ` — ${pack.season}` : ''}`, packTracks(pack))}</View>
                          ) : null
                        )}
                        {brandPacks.map((pack) =>
                          packTracks(pack).length > 0 ? (
                            <View key={pack.id}>{packSection(`${pack.community?.name || pack.name} Sound Pack`, packTracks(pack))}</View>
                          ) : null
                        )}
                        {packSection('Favorites', favorites)}
                        {packSection('Recently Used', recent)}
                        <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: V.primary, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
                          Trending this week
                        </Text>
                      </View>
                    ) : null
                  }
                  renderItem={({ item }) => renderTrack(item)}
                  ListEmptyComponent={
                    <View style={{ padding: 32, alignItems: 'center', gap: 6 }}>
                      <Music2 size={26} color={V.inkFaint} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: V.inkSoft }}>No tracks found</Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '400', color: V.inkFaint }}>Try a different search or category</Text>
                    </View>
                  }
                />
              )
            ) : tab === 'trim' && selectedTrack ? (
              <TrimTab
                track={selectedTrack}
                trimStart={trimStart}
                trimEnd={trimEnd}
                musicVolume={musicVolume}
                originalVolume={originalVolume}
                stickerStyle={stickerStyle}
                maxClipSeconds={maxClipSeconds}
                hasVideo={hasVideo}
                playing={playingId === selectedTrack.id}
                onTogglePlay={() => togglePreview(selectedTrack)}
                onChangeTrim={onChangeTrim}
                onChangeMusicVolume={onChangeMusicVolume}
                onChangeOriginalVolume={onChangeOriginalVolume}
              />
            ) : tab === 'style' && selectedTrack ? (
              <View style={{ padding: 16, gap: 10 }}>
                {STYLE_OPTIONS.map((opt) => {
                  const selected = stickerStyle === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => onChangeStickerStyle(opt.key)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: selected ? V.primary : V.line, backgroundColor: selected ? V.primarySoft : 'transparent' }}
                    >
                      <View style={{ width: 52, height: 36, borderRadius: 8, backgroundColor: V.canvas, alignItems: 'center', justifyContent: 'center' }}>
                        <opt.Icon size={18} color={V.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '600', color: V.ink }}>{opt.name}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '400', color: V.inkFaint }}>{opt.desc}</Text>
                      </View>
                      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: selected ? V.primary : V.line, alignItems: 'center', justifyContent: 'center' }}>
                        {selected ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: V.primary }} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1, borderTopColor: V.line }}>
            <Pressable
              onPress={onClose}
              disabled={!selectedTrack}
              style={{ width: '100%', paddingVertical: 13, borderRadius: 999, alignItems: 'center', backgroundColor: V.primary, opacity: selectedTrack ? 1 : 0.4 }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>Add to story</Text>
            </Pressable>
            <Text style={{ fontSize: 9, fontWeight: '500', letterSpacing: 0.5, color: V.inkFaint, textAlign: 'center', textTransform: 'uppercase', marginTop: 8 }}>
              Clip capped at {maxClipSeconds}s · matches story segment length
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TrimTab({
  track,
  trimStart,
  trimEnd,
  musicVolume,
  originalVolume,
  hasVideo,
  playing,
  onTogglePlay,
  onChangeTrim,
  onChangeMusicVolume,
  onChangeOriginalVolume,
}: {
  track: Track;
  trimStart: number;
  trimEnd: number;
  musicVolume: number;
  originalVolume: number;
  stickerStyle: StickerStyle;
  maxClipSeconds: number;
  hasVideo: boolean;
  playing: boolean;
  onTogglePlay: () => void;
  onChangeTrim: (s: number, e: number) => void;
  onChangeMusicVolume: (v: number) => void;
  onChangeOriginalVolume: (v: number) => void;
}) {
  const heights = useMemo(() => barHeights(track.id), [track.id]);
  const duration = track.durationSeconds;
  const pxPerSecond = WAVEFORM_W / duration;
  const base = useRef({ start: trimStart, end: trimEnd, musicVolume, originalVolume });

  const startHandle = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => (base.current.start = trimStart),
      onPanResponderMove: (_e, g) => {
        const next = Math.max(0, Math.min(trimEnd - MIN_CLIP_SECONDS, base.current.start + g.dx / pxPerSecond));
        onChangeTrim(next, trimEnd);
      },
    })
  ).current;

  const endHandle = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => (base.current.end = trimEnd),
      onPanResponderMove: (_e, g) => {
        const next = Math.max(trimStart + MIN_CLIP_SECONDS, Math.min(duration, base.current.end + g.dx / pxPerSecond));
        onChangeTrim(trimStart, next);
      },
    })
  ).current;

  const musicSlider = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => (base.current.musicVolume = musicVolume),
      onPanResponderMove: (_e, g) => onChangeMusicVolume(Math.max(0, Math.min(1, base.current.musicVolume + g.dx / 220))),
    })
  ).current;

  const originalSlider = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => (base.current.originalVolume = originalVolume),
      onPanResponderMove: (_e, g) => onChangeOriginalVolume(Math.max(0, Math.min(1, base.current.originalVolume + g.dx / 220))),
    })
  ).current;

  const startPct = trimStart / duration;
  const endPct = trimEnd / duration;

  return (
    <View style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <LinearGradient colors={[V.primary, V.primaryDeep]} style={{ width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {track.coverArtUrl ? (
            <Image source={{ uri: resolveMediaUrl(track.coverArtUrl) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Music2 size={20} color="#fff" />
          )}
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: V.ink }} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '500', color: V.inkFaint, letterSpacing: 0.5, marginTop: 3 }} numberOfLines={1}>
            {track.artist.toUpperCase()} · {formatDuration(duration)} FULL LENGTH
          </Text>
        </View>
        <Pressable onPress={onTogglePlay} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: V.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          {playing ? <Pause size={16} color={V.primary} /> : <Play size={16} color={V.primary} style={{ marginLeft: 1 }} />}
        </Pressable>
      </View>

      <View style={{ height: 64, marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: '100%', gap: 2 }}>
          {heights.map((h, i) => {
            const barPct = i / BAR_COUNT;
            const inRange = barPct >= startPct && barPct <= endPct;
            return <View key={i} style={{ flex: 1, minWidth: 2, height: `${h * 100}%`, borderRadius: 2, backgroundColor: inRange ? V.primarySoft : V.lineStrong }} />;
          })}
        </View>
        <View style={{ position: 'absolute', top: -4, bottom: -4, left: startPct * WAVEFORM_W - 7, width: 14 }} {...startHandle.panHandlers}>
          <View style={{ flex: 1, backgroundColor: V.primary, borderRadius: 4 }} />
        </View>
        <View style={{ position: 'absolute', top: -4, bottom: -4, left: endPct * WAVEFORM_W - 7, width: 14 }} {...endHandle.panHandlers}>
          <View style={{ flex: 1, backgroundColor: V.primary, borderRadius: 4 }} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <Text style={{ fontSize: 9.5, fontWeight: '500', color: V.inkFaint }}>0:00</Text>
        <Text style={{ fontSize: 9.5, fontWeight: '500', color: V.inkFaint }}>
          <Text style={{ color: V.primaryDeep, fontWeight: '600' }}>
            {formatDuration(trimStart)}–{formatDuration(trimEnd)}
          </Text>{' '}
          selected
        </Text>
        <Text style={{ fontSize: 9.5, fontWeight: '500', color: V.inkFaint }}>{formatDuration(duration)}</Text>
      </View>

      <VolumeRow label="Music volume" value={musicVolume} handlers={musicSlider.panHandlers} />
      {hasVideo ? <VolumeRow label="Original clip audio" value={originalVolume} handlers={originalSlider.panHandlers} /> : null}
    </View>
  );
}

function VolumeRow({ label, value, handlers }: { label: string; value: number; handlers: ReturnType<typeof PanResponder.create>['panHandlers'] }) {
  const trackWidth = 220;
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 11.5, fontWeight: '400', color: V.ink }}>{label}</Text>
        <Text style={{ fontSize: 10, fontWeight: '600', color: V.primary }}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={{ height: 16, justifyContent: 'center' }}>
        <View style={{ width: trackWidth, height: 3, borderRadius: 2, backgroundColor: V.lineStrong }}>
          <View style={{ width: `${value * 100}%`, height: '100%', borderRadius: 2, backgroundColor: V.primary }} />
        </View>
        <View
          {...handlers}
          style={{ position: 'absolute', left: value * trackWidth - 9, top: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: V.primary, borderWidth: 2, borderColor: '#fff' }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 8.5, fontWeight: '500', color: V.inkFaint }}>MUTE</Text>
        <Text style={{ fontSize: 8.5, fontWeight: '500', color: V.inkFaint }}>FULL</Text>
      </View>
    </View>
  );
}
