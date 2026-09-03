import * as Location from 'expo-location';
import { isWithinSJDM } from '@saanpaw/shared';

export const locationService = {
  async getCurrent(): Promise<{ latitude: number; longitude: number } | null> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  },

  /** Limitation 1: reject anything outside San Jose Del Monte. */
  assertWithinServiceArea(latitude: number, longitude: number): void {
    if (!isWithinSJDM(latitude, longitude)) {
      throw new Error('This location is outside San Jose Del Monte, Bulacan.');
    }
  },

  toGeoPoint(latitude: number, longitude: number) {
    return { type: 'Point' as const, coordinates: [longitude, latitude] as [number, number] };
  },
};
