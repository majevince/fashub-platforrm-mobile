import { Platform, Linking } from 'react-native';

/**
 * Web's "Get directions" link is a plain Google Maps web URL — this
 * upgrades that to a real native deep link (a gap flagged in Step 0, not
 * an existing behavior being ported), falling back to the same web URL
 * web already uses when the native maps app isn't available.
 */
export function openDirections(latitude: number, longitude: number, label?: string) {
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const nativeUrl = Platform.select({
    ios: `maps:0,0?q=${label ? encodeURIComponent(label) : `${latitude},${longitude}`}@${latitude},${longitude}`,
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label ?? 'Event')})`,
  });

  if (!nativeUrl) {
    Linking.openURL(webUrl).catch(() => {});
    return;
  }

  Linking.canOpenURL(nativeUrl)
    .then((supported) => Linking.openURL(supported ? nativeUrl : webUrl))
    .catch(() => Linking.openURL(webUrl).catch(() => {}));
}
