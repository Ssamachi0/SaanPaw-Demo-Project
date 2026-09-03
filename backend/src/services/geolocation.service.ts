import { isWithinServiceArea, SJDM_CENTER } from '../config/serviceArea';

export const geolocationService = {
  /** Limitation #1 helper reused by controllers that build queries. */
  assertWithinServiceArea(lng: number, lat: number): void {
    if (!isWithinServiceArea([lng, lat])) {
      throw new Error('Coordinates outside San Jose Del Monte service area');
    }
  },

  /** Build a MongoDB $nearSphere filter for radius queries. */
  nearFilter(field: string, lng: number, lat: number, radiusMeters: number) {
    return {
      [field]: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters,
        },
      },
    };
  },

  defaultCenter: SJDM_CENTER,
};
