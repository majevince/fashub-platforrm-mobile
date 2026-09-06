import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, Animated, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { X, CalendarDays, Users2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);

const ITEMS = [
  { key: 'events', label: 'Events', href: '/events', Icon: CalendarDays },
  { key: 'communities', label: 'Communities', href: '/communities', Icon: Users2 },
] as const;

/**
 * New nav pattern — no left-side drawer precedent existed anywhere on
 * mobile (only bottom-sheet Modals, e.g. network.tsx's PickerModal), so
 * this defaults to a left-side drawer per the ticket's own fallback rule
 * for a top-left trigger. Communities/Events already exist as hidden tabs
 * (`href: null` in app/(tabs)/_layout.tsx) — this is the first thing that
 * actually links to them.
 */
export function AppDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);

  const navigate = (href: (typeof ITEMS)[number]['href']) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(27,21,35,0.4)' }]} onPress={onClose} />
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            backgroundColor: colors.ivory,
            transform: [{ translateX }],
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 4, height: 0 },
            elevation: 8,
          }}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Menu</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={20} color={colors.ink} />
              </Pressable>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line, marginBottom: 8 }} />
            {ITEMS.map(({ key, label, href, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Pressable
                  key={key}
                  onPress={() => navigate(href)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 }}
                >
                  <Icon size={20} color={active ? colors.gold : colors.ink} strokeWidth={1.8} />
                  <Text style={{ fontSize: 14.5, fontWeight: active ? '700' : '500', color: active ? colors.gold : colors.ink }}>{label}</Text>
                </Pressable>
              );
            })}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}
