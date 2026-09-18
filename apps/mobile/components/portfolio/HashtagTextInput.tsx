import React, { useRef, useState } from 'react';
import { View, Text, TextInput, NativeSyntheticEvent, TextInputScrollEventData } from 'react-native';
import { splitHashtagSegments } from '../../lib/hashtags';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Native port of web's HashtagTextarea — RN can't render inline colored
 * spans inside a single TextInput either, so this uses the same "transparent
 * TextInput over a highlighted backdrop" technique: a real TextInput on top
 * with transparent text (typing/selection/cursor all behave normally,
 * cursorColor stays visible independent of text color), and a
 * non-interactive Text backdrop underneath rendering the same string with
 * hashtags in gold/bold, kept aligned via identical font/padding and a
 * synced scroll position.
 */
export function HashtagTextInput({
  value,
  onChange,
  placeholder,
  minHeight = 100,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const { colors, fontFamilies } = useTheme();
  const [scrollY, setScrollY] = useState(0);

  const segments = splitHashtagSegments(value);
  const shared = { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 20, padding: 13 };

  const onScroll = (e: NativeSyntheticEvent<TextInputScrollEventData>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  };

  return (
    <View style={{ position: 'relative', minHeight, borderRadius: 14, backgroundColor: colors.ivory, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -scrollY, left: 0, right: 0, ...shared }}>
        <Text style={{ ...shared, padding: 0, color: colors.ink }}>
          {value
            ? segments.map((seg, i) =>
                seg.type === 'hashtag' ? (
                  <Text key={i} style={{ color: colors.gold, fontFamily: fontFamilies.sansBold }}>{'#' + seg.value}</Text>
                ) : (
                  <Text key={i}>{seg.value}</Text>
                )
              )
            : <Text style={{ color: colors.inkSoft }}>{placeholder}</Text>}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onScroll={onScroll}
        scrollEnabled
        multiline
        placeholder={placeholder}
        placeholderTextColor="transparent"
        style={{ ...shared, minHeight, color: 'transparent' }}
        cursorColor={colors.ink}
        selectionColor={colors.goldSoft}
      />
    </View>
  );
}
