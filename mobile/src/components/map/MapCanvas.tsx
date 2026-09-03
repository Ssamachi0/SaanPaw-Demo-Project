import { useMemo, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { SJDM_CENTER } from '@saanpaw/shared';
import type { LatLng } from '@saanpaw/shared';

/**
 * A pan-and-zoom map with no native dependency.
 *
 * `react-native-maps` needs a Google API key and does not run on web, so this
 * draws OpenStreetMap tiles as plain <Image>s and places markers with Web
 * Mercator maths. Works on Android, iOS and web.
 *
 * Tiles are © OpenStreetMap contributors; the attribution below is required.
 */

const TILE = 256;
const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

export interface MapMarker {
  id: string;
  coordinate: LatLng;
  /** Pin colour: lost = red, found = amber, shelter = green. */
  kind: 'lost' | 'found' | 'shelter' | 'me';
  label?: string;
}

const MARKER_STYLE = {
  lost: { color: theme.colors.danger, icon: 'alert-circle' as const },
  found: { color: theme.colors.accent, icon: 'paw' as const },
  shelter: { color: theme.colors.primary, icon: 'home' as const },
  me: { color: theme.colors.info, icon: 'person' as const },
};

// ------------------------------------------------------------ projection

const lngToWorldX = (lng: number, worldSize: number) => ((lng + 180) / 360) * worldSize;

const latToWorldY = (lat: number, worldSize: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldSize;
};

const worldXToLng = (x: number, worldSize: number) => (x / worldSize) * 360 - 180;

const worldYToLat = (y: number, worldSize: number) => {
  const n = Math.PI * (1 - (2 * y) / worldSize);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
};

/** Metres per pixel. Needed to size the radius circle. */
const metersPerPixel = (lat: number, zoom: number) =>
  (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;

// ------------------------------------------------------------ component

export function MapCanvas({
  markers = [],
  initialCenter = SJDM_CENTER,
  initialZoom = 13,
  height = 300,
  /** Alert or operating radius, drawn as a translucent circle. */
  radiusMeters,
  radiusCenter,
  onMarkerPress,
  /** Lets the user tap to place a pin. */
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
  const [center, setCenter] = useState<LatLng>(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [size, setSize] = useState({ width: 0, height });
  const last = useRef({ x: 0, y: 0 });
  const dragged = useRef(false);

  const worldSize = TILE * 2 ** zoom;
  const centerX = lngToWorldX(center.longitude, worldSize);
  const centerY = latToWorldY(center.latitude, worldSize);

  /** Map position -> screen position. */
  const toScreen = (c: LatLng) => ({
    x: lngToWorldX(c.longitude, worldSize) - centerX + size.width / 2,
    y: latToWorldY(c.latitude, worldSize) - centerY + size.height / 2,
  });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderGrant: () => {
          last.current = { x: 0, y: 0 };
          dragged.current = false;
        },
        onPanResponderMove: (_e, g) => {
          const dx = g.dx - last.current.x;
          const dy = g.dy - last.current.y;
          last.current = { x: g.dx, y: g.dy };
          if (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3) dragged.current = true;

          setCenter((prev) => {
            const ws = TILE * 2 ** zoom;
            const nx = lngToWorldX(prev.longitude, ws) - dx;
            const ny = Math.min(ws, Math.max(0, latToWorldY(prev.latitude, ws) - dy));
            return { latitude: worldYToLat(ny, ws), longitude: worldXToLng(nx, ws) };
          });
        },
      }),
    [zoom],
  );

  // Tiles covering the viewport, plus one extra row and column.
  const tiles = useMemo(() => {
    if (!size.width) return [];
    const left = centerX - size.width / 2;
    const top = centerY - size.height / 2;
    const x0 = Math.floor(left / TILE);
    const y0 = Math.floor(top / TILE);
    const x1 = Math.ceil((left + size.width) / TILE);
    const y1 = Math.ceil((top + size.height) / TILE);
    const max = 2 ** zoom;

    const out: { key: string; uri: string; left: number; top: number }[] = [];
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        if (y < 0 || y >= max) continue;
        const wrapped = ((x % max) + max) % max;
        out.push({
          key: `${zoom}/${x}/${y}`,
          uri: TILE_URL(zoom, wrapped, y),
          left: x * TILE - left,
          top: y * TILE - top,
        });
      }
    }
    return out;
  }, [centerX, centerY, size.width, size.height, zoom]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    setSize({ width, height: h });
  };

  const radiusPx =
    radiusMeters && radiusCenter
      ? radiusMeters / metersPerPixel(radiusCenter.latitude, zoom)
      : 0;
  const radiusPos = radiusCenter ? toScreen(radiusCenter) : null;

  const handleTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!onPickLocation || dragged.current) return;
    const { locationX, locationY } = e.nativeEvent;
    const wx = centerX + (locationX - size.width / 2);
    const wy = centerY + (locationY - size.height / 2);
    onPickLocation({ latitude: worldYToLat(wy, worldSize), longitude: worldXToLng(wx, worldSize) });
  };

  return (
    <View style={[styles.wrap, { height }]} onLayout={onLayout}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap} {...pan.panHandlers}>
        {tiles.map((t) => (
          <Image
            key={t.key}
            source={{ uri: t.uri }}
            style={[styles.tile, { left: t.left, top: t.top }]}
            fadeDuration={0}
          />
        ))}

        {radiusPos && radiusPx > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.radius,
              {
                left: radiusPos.x - radiusPx,
                top: radiusPos.y - radiusPx,
                width: radiusPx * 2,
                height: radiusPx * 2,
                borderRadius: radiusPx,
              },
            ]}
          />
        ) : null}

        {markers.map((m) => {
          const p = toScreen(m.coordinate);
          if (p.x < -60 || p.y < -60 || p.x > size.width + 60 || p.y > size.height + 60) return null;
          const style = MARKER_STYLE[m.kind];
          const selected = selectedMarkerId === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => onMarkerPress?.(m.id)}
              style={[styles.marker, { left: p.x - 15, top: p.y - 34 }]}
            >
              <View
                style={[
                  styles.pin,
                  { backgroundColor: style.color },
                  selected && styles.pinSelected,
                ]}
              >
                <Ionicons name={style.icon} size={14} color="#fff" />
              </View>
              <View style={[styles.pinTail, { borderTopColor: style.color }]} />
              {selected && m.label ? (
                <View style={styles.pinLabel}>
                  <Text style={styles.pinLabelText} numberOfLines={1}>
                    {m.label}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </Pressable>

      <View style={styles.zoomControls}>
        <Pressable style={styles.zoomBtn} onPress={() => setZoom((z) => Math.min(18, z + 1))}>
          <Ionicons name="add" size={19} color={theme.colors.text} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable style={styles.zoomBtn} onPress={() => setZoom((z) => Math.max(10, z - 1))}>
          <Ionicons name="remove" size={19} color={theme.colors.text} />
        </Pressable>
      </View>

      <Pressable style={styles.recenter} onPress={() => setCenter(initialCenter)}>
        <Ionicons name="locate" size={17} color={theme.colors.primary} />
      </Pressable>

      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
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
  tile: { position: 'absolute', width: TILE, height: TILE },

  radius: {
    position: 'absolute',
    backgroundColor: 'rgba(46,125,91,0.14)',
    borderWidth: 2,
    borderColor: 'rgba(46,125,91,0.55)',
  },

  marker: { position: 'absolute', alignItems: 'center', width: 30 },
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...theme.shadow.card,
  },
  pinSelected: { transform: [{ scale: 1.22 }] },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  pinLabel: {
    marginTop: 3,
    maxWidth: 140,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.text,
  },
  pinLabelText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  zoomControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  zoomBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, backgroundColor: theme.colors.border },

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

  attribution: {
    position: 'absolute',
    left: 6,
    bottom: 4,
    fontSize: 9,
    color: theme.colors.textSoft,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
});
