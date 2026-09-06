import React, { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { X, MapPin } from 'lucide-react-native';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import type { EventSort } from '@fashub/types';
import { geocodeLocation } from '../../lib/geocode';

export type EventFilterState = {
  showFreeOnly: boolean;
  sort: EventSort;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  showAnyLocation: boolean;
  radius: number;
};

export const DEFAULT_EVENT_FILTERS: EventFilterState = {
  showFreeOnly: false,
  sort: 'date',
  latitude: null,
  longitude: null,
  locationLabel: null,
  showAnyLocation: true,
  radius: 50,
};

const SORT_OPTIONS: { id: EventSort; label: string }[] = [
  { id: 'date', label: 'Soonest' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_free', label: 'Free First' },
];

const POPULAR_CITIES: { label: string; lat: number; lng: number }[] = [
  { label: 'New York', lat: 40.7128, lng: -74.006 },
  { label: 'London', lat: 51.5072, lng: -0.1276 },
  { label: 'Paris', lat: 48.8566, lng: 2.3522 },
  { label: 'Milan', lat: 45.4642, lng: 9.19 },
  { label: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { label: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { label: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { label: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { typeScale } = useTheme();
  return <Text style={{ ...typeScale.label, fontWeight: '700', color: VF.inkFaint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{children}</Text>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? colors.gold : colors.paper, borderWidth: 1, borderColor: active ? colors.gold : colors.line }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: active ? colors.ivory : colors.inkSoft }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Mobile bottom-sheet equivalent of web's Events sidebar filters + mobile
 * filter drawer (both share the same option set: free-only, sort, location
 * + radius). A named-location search box is included alongside "Near Me"
 * since web's own hero search also lets users type a city, not just use
 * GPS — geocoded via the same free Nominatim provider (lib/geocode.ts).
 * Uses the app's shared theme tokens, not a separate literal palette.
 */
export function EventsFilterSheet({
  visible,
  initial,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: EventFilterState;
  onClose: () => void;
  onApply: (filters: EventFilterState) => void;
}) {
  const { colors, radius: radii } = useTheme();
  const [form, setForm] = useState<EventFilterState>(initial);
  const [locating, setLocating] = useState(false);
  const [searchingCity, setSearchingCity] = useState(false);
  const [cityInput, setCityInput] = useState(initial.locationLabel ?? '');

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission needed', 'Enable location access to find events near you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude, locationLabel: 'Current location', showAnyLocation: false }));
      setCityInput('Current location');
    } catch {
      Alert.alert("Couldn't get your location", 'Please try again.');
    } finally {
      setLocating(false);
    }
  };

  const searchCity = async () => {
    if (!cityInput.trim()) return;
    setSearchingCity(true);
    try {
      const result = await geocodeLocation(cityInput);
      if (result) {
        setForm((f) => ({ ...f, latitude: result.latitude, longitude: result.longitude, locationLabel: result.label, showAnyLocation: false }));
      } else {
        Alert.alert('Location not found', 'Try a different city or place name.');
      }
    } finally {
      setSearchingCity(false);
    }
  };

  const selectCity = (city: (typeof POPULAR_CITIES)[number]) => {
    setForm((f) => ({ ...f, latitude: city.lat, longitude: city.lng, locationLabel: city.label, showAnyLocation: false }));
    setCityInput(city.label);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,21,35,0.5)' }}>
        <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Filters</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.inkSoft} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
            <View>
              <SectionLabel>Price</SectionLabel>
              <Pressable onPress={() => setForm((f) => ({ ...f, showFreeOnly: !f.showFreeOnly }))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '500', color: colors.ink }}>Free events only</Text>
                <View style={{ width: 42, height: 24, borderRadius: 12, backgroundColor: form.showFreeOnly ? colors.gold : colors.line, padding: 2, justifyContent: 'center' }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.paper, alignSelf: form.showFreeOnly ? 'flex-end' : 'flex-start' }} />
                </View>
              </Pressable>
            </View>

            <View>
              <SectionLabel>Sort By</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SORT_OPTIONS.map((o) => (
                  <Chip key={o.id} label={o.label} active={form.sort === o.id} onPress={() => setForm((f) => ({ ...f, sort: o.id }))} />
                ))}
              </View>
            </View>

            <View>
              <SectionLabel>Location</SectionLabel>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TextInput
                  value={cityInput}
                  onChangeText={setCityInput}
                  onSubmitEditing={searchCity}
                  placeholder="Search city or place…"
                  placeholderTextColor={VF.inkFaint}
                  style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.ink, backgroundColor: colors.paper }}
                />
                <Pressable onPress={searchCity} disabled={searchingCity} style={{ paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                  {searchingCity ? <ActivityIndicator size="small" color={colors.ivory} /> : <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ivory }}>Go</Text>}
                </Pressable>
              </View>

              <Pressable
                onPress={useMyLocation}
                disabled={locating}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, paddingVertical: 11, marginBottom: 10 }}
              >
                {locating ? <ActivityIndicator size="small" color={colors.gold} /> : <MapPin size={15} color={colors.gold} />}
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.gold }}>Near Me</Text>
              </Pressable>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {POPULAR_CITIES.map((city) => (
                  <Chip key={city.label} label={city.label} active={form.locationLabel === city.label} onPress={() => selectCity(city)} />
                ))}
              </ScrollView>

              <Pressable onPress={() => setForm((f) => ({ ...f, showAnyLocation: true, latitude: null, longitude: null, locationLabel: null }))} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: form.showAnyLocation ? colors.gold : VF.inkFaint }}>🌍 Anywhere{form.showAnyLocation ? ' ✓' : ''}</Text>
              </Pressable>

              {!form.showAnyLocation && form.latitude != null ? (
                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkSoft, marginBottom: 6 }}>Search radius: {form.radius} km</Text>
                  <Slider
                    minimumValue={10}
                    maximumValue={500}
                    step={10}
                    value={form.radius}
                    onValueChange={(v) => setForm((f) => ({ ...f, radius: v }))}
                    minimumTrackTintColor={colors.gold}
                    maximumTrackTintColor={colors.line}
                    thumbTintColor={colors.gold}
                  />
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => { setForm(DEFAULT_EVENT_FILTERS); setCityInput(''); }} style={{ paddingHorizontal: 16, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: colors.line }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.inkSoft }}>Reset</Text>
            </Pressable>
            <Pressable onPress={() => onApply(form)} style={{ flex: 1, backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ivory }}>Show Events</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
