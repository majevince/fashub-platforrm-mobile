import React, { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { X, MapPin } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import {
  MATCH_CATEGORIES,
  MATCH_GENDERS,
  MATCH_OCCASIONS,
  MATCH_FABRICS,
  MATCH_DELIVERY_MODES,
  MATCH_COUNTRIES,
  MATCH_TIMELINES,
  MATCH_MIN_EXPERIENCE_OPTIONS,
  MATCH_MIN_RATING_OPTIONS,
  type ProfessionalType,
  type GenderFocusFilter,
  type DeliveryModeFilter,
  type Timeline,
} from '@fashub/types';

const CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR', 'INR', 'AED', 'KES', 'JPY', 'KRW', 'ZAR'];

export type FilterState = {
  professionalType: ProfessionalType;
  categories: string[];
  gender: GenderFocusFilter;
  occasion: string;
  fabricType: string;
  deliveryMode: DeliveryModeFilter;
  country: string;
  timeline: Timeline;
  minExperience: number;
  minRating: number;
  description: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
};

export const DEFAULT_FILTERS: FilterState = {
  professionalType: 'all',
  categories: [],
  gender: 'all',
  occasion: '',
  fabricType: '',
  deliveryMode: 'any',
  country: '',
  timeline: '1-month',
  minExperience: 0,
  minRating: 0,
  description: '',
  budgetMin: 0,
  budgetMax: 999999,
  currency: 'USD',
  latitude: null,
  longitude: null,
  radius: 50,
};

type Props = {
  visible: boolean;
  initial: FilterState;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: 10.5, fontWeight: '700', color: V.inkFaint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{children}</Text>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 13,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? V.primary : V.canvas,
        borderWidth: 1,
        borderColor: active ? V.primary : V.line,
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: active ? '#fff' : V.inkSoft }}>{label}</Text>
    </Pressable>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {children}
    </ScrollView>
  );
}

/**
 * Mobile's bottom-sheet equivalent of web's persistent sidebar "Your
 * preferences" panel (app/search/page.tsx) — same 10 filter categories,
 * same real option lists (see @fashub/types's MATCH_* constants). Every
 * control here is a horizontal chip row rather than web's native <select>
 * dropdowns — there's no RN equivalent to a desktop <select>, and chip rows
 * are the established mobile-native pattern for this app (Network page's
 * filter chips). Location is "use my current location" + radius slider only
 * — web's typed address-autocomplete search is not ported this pass (a real,
 * separate sub-feature of its own), flagged rather than approximated.
 * Confirmed in Step 0: web does NOT persist these filters across sessions
 * (resets to defaults every page load) — mobile matches that exactly, no
 * persistence layer here.
 */
export function FiltersSheet({ visible, initial, onClose, onApply }: Props) {
  const [form, setForm] = useState<FilterState>(initial);
  const [locating, setLocating] = useState(false);

  const toggleCategory = (id: string) => {
    setForm((f) => ({ ...f, categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id] }));
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission needed', 'Enable location access to find professionals near you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
    } catch {
      Alert.alert("Couldn't get your location", 'Please try again.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,21,35,0.5)' }}>
        <View style={{ backgroundColor: V.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: V.line }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: V.ink }}>Your preferences</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={V.inkSoft} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
            <View>
              <SectionLabel>Professional</SectionLabel>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['all', 'designer', 'tailor'] as ProfessionalType[]).map((t) => (
                  <View key={t} style={{ flex: 1 }}>
                    <Chip label={t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'} active={form.professionalType === t} onPress={() => setForm((f) => ({ ...f, professionalType: t }))} />
                  </View>
                ))}
              </View>
            </View>

            <View>
              <SectionLabel>Craft</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {MATCH_CATEGORIES.map((c) => (
                  <Chip key={c.id} label={c.label} active={form.categories.includes(c.id)} onPress={() => toggleCategory(c.id)} />
                ))}
              </View>
            </View>

            <View>
              <SectionLabel>Gender Focus</SectionLabel>
              <ChipRow>
                {MATCH_GENDERS.map((g) => (
                  <Chip key={g.id} label={g.label} active={form.gender === g.id} onPress={() => setForm((f) => ({ ...f, gender: g.id }))} />
                ))}
              </ChipRow>
            </View>

            <View>
              <SectionLabel>Occasion</SectionLabel>
              <ChipRow>
                {MATCH_OCCASIONS.map((o) => (
                  <Chip key={o.id || 'any'} label={o.label} active={form.occasion === o.id} onPress={() => setForm((f) => ({ ...f, occasion: o.id }))} />
                ))}
              </ChipRow>
            </View>

            <View>
              <SectionLabel>Fabric Type</SectionLabel>
              <ChipRow>
                {MATCH_FABRICS.map((f2) => (
                  <Chip key={f2.id || 'any'} label={f2.label} active={form.fabricType === f2.id} onPress={() => setForm((f) => ({ ...f, fabricType: f2.id }))} />
                ))}
              </ChipRow>
            </View>

            <View>
              <SectionLabel>Delivery Mode</SectionLabel>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {MATCH_DELIVERY_MODES.map((d) => (
                  <View key={d.id} style={{ flex: 1 }}>
                    <Chip label={d.label} active={form.deliveryMode === d.id} onPress={() => setForm((f) => ({ ...f, deliveryMode: d.id }))} />
                  </View>
                ))}
              </View>
            </View>

            <View>
              <SectionLabel>Country / Region</SectionLabel>
              <ChipRow>
                {MATCH_COUNTRIES.map((c) => (
                  <Chip key={c.id || 'worldwide'} label={c.label} active={form.country === c.id} onPress={() => setForm((f) => ({ ...f, country: c.id }))} />
                ))}
              </ChipRow>
            </View>

            {!form.country ? (
              <View>
                <SectionLabel>Location</SectionLabel>
                <Pressable
                  onPress={useMyLocation}
                  disabled={locating}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: V.primarySoft, borderRadius: 12, paddingVertical: 12, marginBottom: 12 }}
                >
                  {locating ? <ActivityIndicator size="small" color={V.primaryDeep} /> : <MapPin size={16} color={V.primaryDeep} />}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: V.primaryDeep }}>
                    {form.latitude != null ? 'Location set — tap to refresh' : 'Use my current location'}
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 12.5, fontWeight: '500', color: V.inkSoft, marginBottom: 6 }}>Search radius: {form.radius} km</Text>
                <Slider
                  minimumValue={5}
                  maximumValue={500}
                  step={5}
                  value={form.radius}
                  onValueChange={(v) => setForm((f) => ({ ...f, radius: v }))}
                  minimumTrackTintColor={V.primary}
                  maximumTrackTintColor={V.line}
                  thumbTintColor={V.primary}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 10.5, color: V.inkFaint }}>5 km</Text>
                  <Text style={{ fontSize: 10.5, color: V.inkFaint }}>500 km</Text>
                </View>
              </View>
            ) : null}

            <View>
              <SectionLabel>Budget Range</SectionLabel>
              <ChipRow>
                {CURRENCIES.map((c) => (
                  <Chip key={c} label={c} active={form.currency === c} onPress={() => setForm((f) => ({ ...f, currency: c }))} />
                ))}
              </ChipRow>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TextInput
                  value={form.budgetMin ? String(form.budgetMin) : ''}
                  onChangeText={(t) => setForm((f) => ({ ...f, budgetMin: parseInt(t, 10) || 0 }))}
                  placeholder="Min"
                  keyboardType="numeric"
                  style={{ flex: 1, borderWidth: 1, borderColor: V.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: V.ink }}
                />
                <TextInput
                  value={form.budgetMax !== 999999 ? String(form.budgetMax) : ''}
                  onChangeText={(t) => setForm((f) => ({ ...f, budgetMax: parseInt(t, 10) || 999999 }))}
                  placeholder="Max"
                  keyboardType="numeric"
                  style={{ flex: 1, borderWidth: 1, borderColor: V.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: V.ink }}
                />
              </View>
            </View>

            <View>
              <SectionLabel>Timeline</SectionLabel>
              <ChipRow>
                {MATCH_TIMELINES.map((t) => (
                  <Chip key={t.id} label={t.label} active={form.timeline === t.id} onPress={() => setForm((f) => ({ ...f, timeline: t.id }))} />
                ))}
              </ChipRow>
            </View>

            <View>
              <SectionLabel>Min. Experience</SectionLabel>
              <ChipRow>
                {MATCH_MIN_EXPERIENCE_OPTIONS.map((o) => (
                  <Chip key={o.value} label={o.label} active={form.minExperience === o.value} onPress={() => setForm((f) => ({ ...f, minExperience: o.value }))} />
                ))}
              </ChipRow>
            </View>

            <View>
              <SectionLabel>Min. Rating</SectionLabel>
              <ChipRow>
                {MATCH_MIN_RATING_OPTIONS.map((o) => (
                  <Chip key={o.value} label={o.label} active={form.minRating === o.value} onPress={() => setForm((f) => ({ ...f, minRating: o.value }))} />
                ))}
              </ChipRow>
            </View>

            <View>
              <SectionLabel>Additional Details</SectionLabel>
              <TextInput
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                placeholder="Tell us more about what you're looking for…"
                multiline
                numberOfLines={3}
                style={{ borderWidth: 1, borderColor: V.line, borderRadius: 12, padding: 12, fontSize: 13, color: V.ink, minHeight: 72, textAlignVertical: 'top' }}
              />
            </View>
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: V.line, flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => setForm(DEFAULT_FILTERS)} style={{ paddingHorizontal: 16, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: V.line }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: V.inkSoft }}>Reset</Text>
            </Pressable>
            <Pressable onPress={() => onApply(form)} style={{ flex: 1, backgroundColor: V.primary, borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>Find Professionals</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
