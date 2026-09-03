import type { LatLng } from './types';

/**
 * San Jose Del Monte geography.
 * Limitation 1 confines the system to this city, so these barangays are also
 * the only options on every report form.
 */

export interface Barangay {
  name: string;
  center: LatLng;
}

/** The populated corridors of the city. */
export const SJDM_BARANGAYS: Barangay[] = [
  { name: 'Muzon', center: { latitude: 14.7845, longitude: 121.0287 } },
  { name: 'Tungkong Mangga', center: { latitude: 14.7972, longitude: 121.0489 } },
  { name: 'Kaypian', center: { latitude: 14.8043, longitude: 121.0361 } },
  { name: 'Gaya-Gaya', center: { latitude: 14.7899, longitude: 121.0452 } },
  { name: 'Poblacion', center: { latitude: 14.8136, longitude: 121.0453 } },
  { name: 'Poblacion 1', center: { latitude: 14.8168, longitude: 121.0498 } },
  { name: 'San Manuel', center: { latitude: 14.8251, longitude: 121.0392 } },
  { name: 'Sto. Cristo', center: { latitude: 14.8302, longitude: 121.0537 } },
  { name: 'San Rafael V', center: { latitude: 14.8087, longitude: 121.0664 } },
  { name: 'Graceville', center: { latitude: 14.7961, longitude: 121.0172 } },
  { name: 'Minuyan Proper', center: { latitude: 14.8449, longitude: 121.0721 } },
  { name: 'Sapang Palay Proper', center: { latitude: 14.8378, longitude: 121.0596 } },
  { name: 'Citrus', center: { latitude: 14.8221, longitude: 121.0688 } },
  { name: 'Dulong Bayan', center: { latitude: 14.8194, longitude: 121.0431 } },
  { name: 'Paradise III', center: { latitude: 14.8055, longitude: 121.0578 } },
];

export const SJDM_BARANGAY_NAMES = SJDM_BARANGAYS.map((b) => b.name);

/** Radius options on the user and shelter registration forms. */
export const RADIUS_OPTIONS = [
  { label: '1 km', meters: 1000 },
  { label: '3 km', meters: 3000 },
  { label: '5 km', meters: 5000 },
  { label: '10 km', meters: 10000 },
];

/** Distance in metres. Used for every radius and smart-alert check. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Nearest barangay to a point. A raw GPS fix means nothing to someone reading
 * the report, so auto-tagged locations get turned back into a barangay name.
 */
export function nearestBarangay(point: LatLng): Barangay {
  return SJDM_BARANGAYS.reduce((closest, candidate) =>
    distanceMeters(point, candidate.center) < distanceMeters(point, closest.center)
      ? candidate
      : closest,
  );
}
