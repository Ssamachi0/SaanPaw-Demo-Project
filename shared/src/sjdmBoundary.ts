/**
 * Limitation 1: the system only works inside San Jose Del Monte.
 * Checked before a report is submitted. Mirrors backend/src/config/serviceArea.ts.
 */
export const SJDM_CENTER = { latitude: 14.8136, longitude: 121.0453 };

export const SJDM_REGION = {
  ...SJDM_CENTER,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

// [lng, lat], same polygon as the backend.
const RING: [number, number][] = [
  [121.010, 14.760],
  [121.150, 14.760],
  [121.170, 14.870],
  [121.060, 14.960],
  [120.960, 14.880],
  [121.010, 14.760],
];

export function isWithinSJDM(latitude: number, longitude: number): boolean {
  let inside = false;
  for (let i = 0, j = RING.length - 1; i < RING.length; j = i++) {
    const [xi, yi] = RING[i];
    const [xj, yj] = RING[j];
    const intersect =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
