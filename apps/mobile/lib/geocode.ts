/**
 * Ports web's Events page location search — a plain fetch to Nominatim
 * (OpenStreetMap's free geocoder), not a paid/keyed SDK. Same provider as
 * web keeps location results consistent between platforms.
 */
export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

export async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: { 'User-Agent': 'FaSHub-Mobile/1.0' },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    return { label: first.display_name, latitude: parseFloat(first.lat), longitude: parseFloat(first.lon) };
  } catch {
    return null;
  }
}
