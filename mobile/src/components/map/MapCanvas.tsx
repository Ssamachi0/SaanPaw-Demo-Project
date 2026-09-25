import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { theme } from '@/constants/theme';
import { SJDM_CENTER } from '@saanpaw/shared';
import type { LatLng } from '@saanpaw/shared';
import { MAPBOX_CONFIGURED, MAPBOX_STYLE, MAPBOX_TOKEN } from '@/config/mapbox';
import { buildMapHtml, type MapMarkerConfig } from './mapboxHtml';
import { MARKER_COLOR, type MapMarker } from './markerStyle';

export type { MapMarker };

/**
 * A real Mapbox map (Android/iOS build).
 *
 * Mapbox GL JS has no React Native binding, so this runs it as a web page
 * inside a WebView loaded from Mapbox's CDN, and exchanges marker taps, pin
 * drags, and location picks with it over `postMessage`. See `mapboxHtml.ts`
 * for the page itself, and `MapCanvas.web.tsx` for the browser build, which
 * runs the same library directly since there is no WebView on the web.
 */

const toMarkerConfig = (m: MapMarker): MapMarkerConfig => ({
  id: m.id,
  lat: m.coordinate.latitude,
  lng: m.coordinate.longitude,
  color: MARKER_COLOR[m.kind],
  label: m.label,
});

export function MapCanvas({
  markers = [],
  initialCenter = SJDM_CENTER,
  initialZoom = 13,
  height = 300,
  /** Alert or operating radius, drawn as a translucent circle. */
  radiusMeters,
  radiusCenter,
  onMarkerPress,
  /** Lets the user tap the map or drag a marker to place a pin. */
  onPickLocation,
  selectedMarkerId,
}: {
  markers?: MapMarker[];
  initialCenter?: LatLng;
  initialZoom?: number;
  height?: number;
  radiusMeters?: number;
  radiusCenter?: LatLng;
  onMarkerPress?: (id: string) => void;
  onPickLocation?: (c: LatLng) => void;
  selectedMarkerId?: string | null;
}) {
  const webviewRef = useRef<WebView>(null);
  const ready = useRef(false);
  const pickable = useRef(Boolean(onPickLocation)).current;
  const [loadError, setLoadError] = useState<string | null>(null);

  // Called through refs so the WebView bridge always reaches the latest
  // handler without having to reload the page when a parent re-renders.
  const onMarkerPressRef = useRef(onMarkerPress);
  onMarkerPressRef.current = onMarkerPress;
  const onPickLocationRef = useRef(onPickLocation);
  onPickLocationRef.current = onPickLocation;

  const html = useMemo(
    () =>
      buildMapHtml({
        token: MAPBOX_TOKEN,
        style: MAPBOX_STYLE,
        center: initialCenter,
        zoom: initialZoom,
        minZoom: 10,
        maxZoom: 18,
        pickable,
        markers: markers.map(toMarkerConfig),
        selectedMarkerId,
        radiusMeters,
        radiusCenter,
      }),
    // Only the very first render's data ends up in the page; everything
    // after that goes through `updateData` so the map never reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const push = (data: Record<string, unknown>) => {
    if (!ready.current) return;
    webviewRef.current?.injectJavaScript(`window.updateData(${JSON.stringify(data)});true;`);
  };

  useEffect(() => {
    push({
      markers: markers.map(toMarkerConfig),
      selectedMarkerId,
      radiusMeters,
      radiusCenter,
      // Where the map's own "recenter" button goes back to. This does not move the camera by
      // itself - if it did, every tap or drag would immediately re-centre on the spot the user
      // just placed the pin, fighting the very interaction this map exists for.
      center: initialCenter,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, selectedMarkerId, radiusMeters, radiusCenter?.latitude, radiusCenter?.longitude, initialCenter.latitude, initialCenter.longitude]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let message: { type: string; id?: string; lat?: number; lng?: number; message?: string };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message.type === 'ready') {
      ready.current = true;
      push({ markers: markers.map(toMarkerConfig), selectedMarkerId, radiusMeters, radiusCenter });
    } else if (message.type === 'marker' && message.id) {
      onMarkerPressRef.current?.(message.id);
    } else if (message.type === 'pick' && message.lat != null && message.lng != null) {
      onPickLocationRef.current?.({ latitude: message.lat, longitude: message.lng });
    } else if (message.type === 'error') {
      // A bad/restricted token or no network reaches here as a Mapbox 'error' event inside the
      // page, not a WebView load failure - without this the map just stays blank with no reason.
      setLoadError(message.message ?? 'The map failed to load.');
    }
  };

  if (!MAPBOX_CONFIGURED) {
    return (
      <View style={[styles.wrap, styles.missingToken, { height }]}>
        <Text style={styles.missingTokenText}>
          Map unavailable - set EXPO_PUBLIC_MAPBOX_TOKEN to a Mapbox public token to enable it.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        originWhitelist={['*']}
        onMessage={handleMessage}
        // These catch the WebView failing to load the page at all (e.g. no network), which is
        // a different failure from the Mapbox-internal 'error' message handled above.
        onError={(e) => setLoadError(e.nativeEvent.description || 'The map failed to load.')}
        onHttpError={(e) => setLoadError(`The map failed to load (HTTP ${e.nativeEvent.statusCode}).`)}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled={false}
        // The map draws its own attribution; a bounce here would clip it.
        bounces={false}
      />
      {loadError ? (
        <View style={styles.errorOverlay} pointerEvents="none">
          <Text style={styles.missingTokenText}>Map failed to load: {loadError}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#DCE6DF',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  missingToken: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(220,38,38,0.06)',
  },
  missingTokenText: { fontSize: 12.5, lineHeight: 18, color: theme.colors.textSoft, textAlign: 'center' },
});
