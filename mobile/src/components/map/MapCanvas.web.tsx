import { useEffect, useRef, useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import mapboxgl from 'mapbox-gl';
import { theme } from '@/constants/theme';
import { SJDM_CENTER } from '@saanpaw/shared';
import type { LatLng } from '@saanpaw/shared';
import { MAPBOX_CONFIGURED, MAPBOX_STYLE, MAPBOX_TOKEN } from '@/config/mapbox';
import { MARKER_COLOR, type MapMarker } from './markerStyle';

export type { MapMarker };

/**
 * The browser build of the map (`expo export -p web` / `npm run web:mobile`).
 * Metro (this app's web bundler) has no CSS loader, so the stylesheet is a
 * `<link>` tag rather than an import - see `MapCanvas.tsx` for the native
 * build, which runs the same Mapbox GL JS version inside a WebView instead.
 */
const MAPBOX_CSS_ID = 'saanpaw-mapbox-gl-css';
const MAPBOX_CSS_HREF = 'https://api.mapbox.com/mapbox-gl-js/v3.31.0/mapbox-gl.css';

/**
 * Mapbox measures its own layout (attribution, controls, the canvas fill) off this
 * stylesheet. Fetching it and constructing the map at the same time is a race: if the
 * map wins, it renders against no styling at all and nothing shows up. This resolves
 * once the stylesheet is actually applied - immediately if it already is, otherwise on
 * its `load` event - with a short timeout so a slow or blocked request can't hang the
 * map forever (it just renders a little rough instead of never rendering).
 */
function loadMapboxCss(): Promise<void> {
  const existing = document.getElementById(MAPBOX_CSS_ID) as HTMLLinkElement | null;
  if (existing) {
    return existing.dataset.loaded === '1' ? Promise.resolve() : new Promise((resolve) => existing.addEventListener('load', () => resolve(), { once: true }));
  }
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.id = MAPBOX_CSS_ID;
    link.rel = 'stylesheet';
    link.href = MAPBOX_CSS_HREF;
    const done = () => {
      link.dataset.loaded = '1';
      resolve();
    };
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', done, { once: true });
    setTimeout(done, 2000);
    document.head.appendChild(link);
  });
}

/** A geodesic-ish circle, good enough for a map overlay. Mirrors `mapboxHtml.ts`'s native version. */
function circlePolygon(center: LatLng, radiusMeters: number, steps = 72): GeoJSON.Polygon {
  const R = 6_371_000;
  const lat1 = (center.latitude * Math.PI) / 180;
  const lng1 = (center.longitude * Math.PI) / 180;
  const d = radiusMeters / R;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i * 2 * Math.PI) / steps;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing));
    const lng2 =
      lng1 +
      Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

export function MapCanvas({
  markers = [],
  initialCenter = SJDM_CENTER,
  initialZoom = 13,
  height = 300,
  radiusMeters,
  radiusCenter,
  onMarkerPress,
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
  // react-native-web renders `View` as a <div> on the web build and forwards
  // `ref` to that real DOM node, which is what mapboxgl.Map needs to mount into.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const markerInstances = useRef<Record<string, mapboxgl.Marker>>({});
  const pickable = useRef(Boolean(onPickLocation)).current;
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bumped once the map object exists, so the marker/radius effects below - which read
  // `mapRef.current` - re-run and catch up once map creation finishes (it's deferred behind
  // the CSS load above, so it's not there yet on these effects' very first run).
  const [mapReady, setMapReady] = useState(0);

  const onMarkerPressRef = useRef(onMarkerPress);
  onMarkerPressRef.current = onMarkerPress;
  const onPickLocationRef = useRef(onPickLocation);
  onPickLocationRef.current = onPickLocation;

  // Mount once. Every prop after that is applied by the effects below, so the
  // map itself (its pan/zoom) never resets while the parent re-renders.
  useEffect(() => {
    if (!MAPBOX_CONFIGURED || !containerRef.current) return;
    let cancelled = false;

    loadMapboxCss().then(() => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [initialCenter.longitude, initialCenter.latitude],
        zoom: initialZoom,
        minZoom: 10,
        maxZoom: 18,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('click', (e) => {
        if (pickable) onPickLocationRef.current?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
      });
      map.on('load', () => {
        map.addSource('radius', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: {} } });
        map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#2E7D5B', 'fill-opacity': 0.14 } });
        map.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#2E7D5B', 'line-opacity': 0.55, 'line-width': 2 } });
      });
      // A bad/restricted token or no network reaches here as an 'error' event, not a thrown
      // exception - without this the map just stays blank forever with no indication why.
      map.on('error', (e) => setLoadError(e.error?.message ?? 'The map failed to load.'));

      // Mapbox measures the container once at construction and never re-measures on its own.
      // If the surrounding layout (a banner above the map, a scrollable form, a card that hasn't
      // settled its final height yet) is still shifting when that happens, Mapbox can lock in a
      // zero or stale size and then never request a single tile - the map looks entirely blank
      // even though the style, fonts and sprite all loaded fine. A resize observer catches every
      // later size change; the two explicit calls below catch the very first one, before it fires.
      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
      map.resize();
      requestAnimationFrame(() => map.resize());

      mapRef.current = map;
      resizeObserverRef.current = resizeObserver;
      setMapReady((v) => v + 1);
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      Object.values(markerInstances.current).forEach((m) => m.remove());
      markerInstances.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The initial centre/zoom only apply once, matching the native build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markers: add, move, or remove to match the latest `markers` prop.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const seen = new Set<string>();
      markers.forEach((m) => {
        seen.add(m.id);
        let marker = markerInstances.current[m.id];
        if (!marker) {
          marker = new mapboxgl.Marker({ color: MARKER_COLOR[m.kind], draggable: pickable })
            .setLngLat([m.coordinate.longitude, m.coordinate.latitude])
            .addTo(map);
          marker.getElement().addEventListener('click', (e) => {
            e.stopPropagation();
            onMarkerPressRef.current?.(m.id);
          });
          marker.on('dragend', () => {
            const pos = marker!.getLngLat();
            onPickLocationRef.current?.({ latitude: pos.lat, longitude: pos.lng });
          });
          markerInstances.current[m.id] = marker;
        } else {
          marker.setLngLat([m.coordinate.longitude, m.coordinate.latitude]);
        }

        if (m.label && selectedMarkerId === m.id) {
          marker.setPopup(new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 22 }).setText(m.label));
          marker.togglePopup();
          marker.getElement().style.zIndex = '5';
        } else {
          marker.getPopup()?.remove();
          marker.getElement().style.zIndex = '';
        }
      });
      Object.keys(markerInstances.current).forEach((id) => {
        if (!seen.has(id)) {
          markerInstances.current[id].remove();
          delete markerInstances.current[id];
        }
      });
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [markers, selectedMarkerId, pickable, mapReady]);

  // Radius circle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource('radius') as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      const geometry = radiusMeters && radiusCenter ? circlePolygon(radiusCenter, radiusMeters) : { type: 'Polygon' as const, coordinates: [] };
      source.setData({ type: 'Feature', geometry, properties: {} });
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [radiusMeters, radiusCenter?.latitude, radiusCenter?.longitude, mapReady]);

  // `initialCenter` only sets where the camera starts. Screens that bind it to the same state as
  // the pin - e.g. the report form - would otherwise fight the user: every tap or drag would
  // immediately re-centre the camera on the spot they just placed the pin. The "recenter" button
  // below (back to this same starting view) is the deliberate way to jump the camera instead.

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
      <View style={styles.mapFill}>
        <View ref={containerRef as unknown as Ref<View>} style={styles.mapInner} />
      </View>
      {loadError ? (
        <View style={styles.errorOverlay} pointerEvents="none">
          <Text style={styles.missingTokenText}>Map failed to load: {loadError}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter"
        style={styles.recenter}
        onPress={() => mapRef.current?.flyTo({ center: [initialCenter.longitude, initialCenter.latitude], zoom: initialZoom })}
      >
        <View style={styles.recenterDot} />
      </Pressable>
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
  missingToken: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  // Two levels, not one: mapboxgl.Map sets `position: relative` as an inline style on whatever
  // container element it's given - it needs that to correctly place its own canvas, controls and
  // attribution inside it. That directly conflicts with using the *same* element as this box's own
  // absolutely-positioned fill (inline styles win over any class), which silently collapsed it to
  // zero height. So the fill lives on a separate outer `View`, and the element handed to Mapbox
  // (`mapInner`) just stretches to match it - its own `position` is entirely Mapbox's to set.
  mapFill: { ...StyleSheet.absoluteFillObject },
  mapInner: { flex: 1 },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(220,38,38,0.06)',
  },
  missingTokenText: { fontSize: 12.5, lineHeight: 18, color: theme.colors.textSoft, textAlign: 'center' },
  recenter: {
    position: 'absolute',
    right: 10,
    bottom: 28,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  recenterDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
});
