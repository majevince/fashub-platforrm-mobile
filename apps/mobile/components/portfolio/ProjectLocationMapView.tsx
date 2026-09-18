import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Single-pin, city-level map for the project detail screen — same
 * WebView + Leaflet + raw OpenStreetMap approach as EventsMapWebView
 * (chosen there to avoid a react-native-maps/custom-dev-client requirement),
 * scoped down to one non-interactive marker instead of a full pin-cluster
 * listings map.
 */
export function ProjectLocationMapView({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  const { colors } = useTheme();

  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false })
      .setView([${latitude}, ${longitude}], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    var icon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:${colors.gold};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    L.marker([${latitude}, ${longitude}], { icon: icon }).addTo(map).bindPopup(${JSON.stringify(label)});
  </script>
</body>
</html>`,
    [latitude, longitude, label, colors.gold]
  );

  return (
    <WebView
      source={{ html }}
      style={{ flex: 1, backgroundColor: colors.ivoryDeep }}
      scrollEnabled={false}
      originWhitelist={['*']}
    />
  );
}
