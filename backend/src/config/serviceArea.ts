/**
 * Limitation #1: SaanPaw operates ONLY within San Jose Del Monte, Bulacan.
 *
 * The polygon below is an approximate city boundary used to geo-fence every
 * report. Replace with the official LGU GeoJSON boundary before deployment.
 * Coordinates are [longitude, latitude] (GeoJSON order).
 */
export const SJDM_BOUNDARY: {
  type: 'Polygon';
  coordinates: [number, number][][];
} = {
  type: 'Polygon',
  coordinates: [
    [
      [121.010, 14.760],
      [121.150, 14.760],
      [121.170, 14.870],
      [121.060, 14.960],
      [120.960, 14.880],
      [121.010, 14.760],
    ],
  ],
};

/** Rough centroid, used as the default map focus. */
export const SJDM_CENTER = { latitude: 14.8136, longitude: 121.0453 };

/** Ray-casting point-in-polygon test. point = [lng, lat]. */
export function isWithinServiceArea(point: [number, number]): boolean {
  const [x, y] = point;
  const ring = SJDM_BOUNDARY.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
