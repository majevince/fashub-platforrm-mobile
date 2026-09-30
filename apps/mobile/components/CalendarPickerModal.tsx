import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Calendar-grid date picker in a bottom-sheet shell — react-native-calendars
 * is pure JS (no native linking), consistent with this app's avoidance of
 * native modules that would need a dev-client rebuild. Originally built
 * inline in CreateEventModal.tsx for event date fields; factored out here so
 * the "Book a Fitting" flow (components/pages/BookingModal.tsx) uses the
 * exact same calendar component/library, not a re-implementation of it.
 */
export function CalendarPickerModal({
  visible, title, selectedDate, minDate, maxDate, disabledDates, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  selectedDate?: string;
  minDate?: string;
  maxDate?: string;
  /** Dates (YYYY-MM-DD) the visitor can't pick — e.g. days outside a Page's configured availability. Not used by the Events flow. */
  disabledDates?: string[];
  onSelect: (dateString: string) => void;
  onClose: () => void;
}) {
  const { colors, fontFamilies } = useTheme();

  const markedDates: Record<string, any> = {};
  for (const d of disabledDates ?? []) {
    markedDates[d] = { disabled: true, disableTouchEvent: true };
  }
  if (selectedDate) {
    markedDates[selectedDate] = { ...markedDates[selectedDate], selected: true, selectedColor: colors.gold };
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,18,16,0.4)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{ backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 15, color: colors.ink }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}><X size={18} color={colors.inkSoft} /></Pressable>
          </View>
          <Calendar
            current={selectedDate ?? minDate}
            minDate={minDate}
            maxDate={maxDate}
            markedDates={markedDates}
            onDayPress={(day: DateData) => onSelect(day.dateString)}
            theme={{
              todayTextColor: colors.gold,
              arrowColor: colors.gold,
              selectedDayBackgroundColor: colors.gold,
              textDayFontFamily: fontFamilies.sans,
              textMonthFontFamily: fontFamilies.sansBold,
              textDayHeaderFontFamily: fontFamilies.sansSemiBold,
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
