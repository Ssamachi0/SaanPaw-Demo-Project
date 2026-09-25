import { theme } from '@/constants/theme';
import type { LatLng } from '@saanpaw/shared';

/** Shared between the native (WebView) and web map so both colour pins the same way. */

export interface MapMarker {
  id: string;
  coordinate: LatLng;
  /** Pin colour: lost = red, found = amber, shelter = green. */
  kind: 'lost' | 'found' | 'shelter' | 'me';
  label?: string;
}

export const MARKER_COLOR: Record<MapMarker['kind'], string> = {
  lost: theme.colors.danger,
  found: theme.colors.accent,
  shelter: theme.colors.primary,
  me: theme.colors.info,
};
