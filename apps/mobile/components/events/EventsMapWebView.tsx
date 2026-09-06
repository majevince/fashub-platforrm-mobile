import React, { useMemo, useRef } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { EventListItem } from '@fashub/types';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Reuses web's exact map stack — Leaflet + OpenStreetMap raster tiles, no
 * Mapbox/Google Maps SDK, no API key — inside a WebView rather than a
 * native map component. Chosen over react-native-maps specifically to
 * avoid a custom-dev-client/EAS-build requirement (react-native-maps needs
 * native linking and doesn't run in plain Expo Go, which this app
 * currently uses); this keeps the app installable via Expo Go with zero
 * new native-module setup. Trade-off: pan/zoom/pin-tap happen inside the
 * webview's own DOM rather than as native RN gestures — pin taps are
 * bridged out to RN via `window.ReactNativeWebView.postMessage`, and the
 * "photo-card" popup itself renders as a native RN overlay on top of the
 * WebView (not inside the HTML), so it can reuse the same lightbox/design
 * primitives as the rest of the app. Pin colors are drawn from the app's
 * shared theme tokens (passed in from useTheme(), not a separate literal
 * palette) — the active pin uses `colors.gold`, the app-wide violet accent.
 */
function buildMapHtml(
  events: EventListItem[],
  activeId: string | null,
  interactive: boolean,
  categoryColors: Record<string, string>,
  activeColor: string
): string {
  const points = events
    .filter((e) => Number.isFinite(e.latitude) && Number.isFinite(e.longitude))
    .map((e) => ({
      id: e.id,
      lat: e.latitude,
      lng: e.longitude,
      label: e.isFree ? 'Free' : e.price != null ? `$${Math.round(e.price)}` : 'View',
      color: e.id === activeId ? activeColor : categoryColors[e.category] ?? categoryColors.other,
    }));

  const center = points.find((p) => p.id === activeId) ?? points[0] ?? { lat: 40.7128, lng: -74.006 };

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .event-pin { background: var(--pin-color); color: #fff; font: 700 11px -apple-system, sans-serif; padding: 4px 8px; border-radius: 999px; white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.35); border: 1.5px solid #fff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: ${interactive},
      dragging: ${interactive},
      scrollWheelZoom: ${interactive},
      doubleClickZoom: ${interactive},
      touchZoom: ${interactive}
    }).setView([${center.lat}, ${center.lng}], ${interactive ? 11 : 14});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    var points = ${JSON.stringify(points)};
    points.forEach(function (p) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="event-pin" style="--pin-color:' + p.color + '">' + p.label + '</div>',
        iconSize: null
      });
      var marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
      marker.on('click', function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pinPress', id: p.id }));
      });
    });
  </script>
</body>
</html>`;
}

export function EventsMapWebView({
  events,
  activeId,
  onPinPress,
  interactive = true,
}: {
  events: EventListItem[];
  activeId?: string | null;
  onPinPress?: (eventId: string) => void;
  interactive?: boolean;
}) {
  const { colors } = useTheme();
  const categoryColors = useMemo<Record<string, string>>(
    () => ({
      fashion_show: '#DB2777',
      workshop: '#0EA5E9',
      trunk_show: colors.goldSoft,
      sample_sale: '#059669',
      exhibition: '#F59E0B',
      conference: colors.oxblood,
      networking: '#0891B2',
      launch_event: colors.gold,
      award_ceremony: '#B45309',
      other: '#6B7280',
    }),
    [colors]
  );
  const html = useMemo(() => buildMapHtml(events, activeId ?? null, interactive, categoryColors, colors.gold), [events, activeId, interactive, categoryColors, colors.gold]);
  const webviewRef = useRef<WebView>(null);

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'pinPress' && data.id) onPinPress?.(data.id);
    } catch {
      // ignore malformed bridge messages
    }
  };

  return (
    <WebView
      ref={webviewRef}
      source={{ html }}
      onMessage={handleMessage}
      style={{ flex: 1, backgroundColor: colors.ivoryDeep }}
      scrollEnabled={false}
      originWhitelist={['*']}
    />
  );
}
