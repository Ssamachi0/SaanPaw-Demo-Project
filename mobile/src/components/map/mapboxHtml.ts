import type { LatLng } from '@saanpaw/shared';

/**
 * The page that runs inside the map's WebView (see `MapCanvas.tsx`).
 *
 * Mapbox GL JS has no React Native build, so on Android/iOS it runs as an
 * ordinary web page loaded from Mapbox's CDN, and talks to React Native
 * through `postMessage`. `MapCanvas.web.tsx` runs the same library directly
 * in the DOM instead, since the web build has no WebView to put it in.
 *
 * Pinned to the same version as the `mapbox-gl` npm package used on web
 * (see `mobile/package.json`), so both platforms render identically.
 */
const MAPBOX_GL_VERSION = '3.31.0';

export interface MapMarkerConfig {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label?: string;
}

export interface MapInitialState {
  token: string;
  style: string;
  center: LatLng;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  /** Whether tapping the map or dragging a marker should report a picked point. */
  pickable: boolean;
  markers: MapMarkerConfig[];
  selectedMarkerId?: string | null;
  radiusMeters?: number;
  radiusCenter?: LatLng;
}

export function buildMapHtml(initial: MapInitialState): string {
  // Passed as JSON into the page's own script, so nothing here is a template
  // literal that could clash with the vanilla JS below (which uses plain quotes).
  const configJson = JSON.stringify(initial).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js"></script>
  <style>
    html, body, #map { position: absolute; inset: 0; margin: 0; padding: 0; overflow: hidden; }
    .pin-marker { width: 30px; height: 30px; cursor: pointer; }
    .recenter-btn {
      position: absolute; right: 10px; bottom: 28px; width: 34px; height: 34px; border-radius: 17px;
      background: #fff; border: none; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center; z-index: 2;
    }
    .mapboxgl-popup-content { font: 600 11px system-ui, sans-serif; padding: 4px 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <button class="recenter-btn" onclick="window.__recenter()" aria-label="Recenter">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2E7D5B" stroke-width="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>
    </svg>
  </button>
  <script>
    var CONFIG = ${configJson};
    mapboxgl.accessToken = CONFIG.token;

    var map = new mapboxgl.Map({
      container: 'map',
      style: CONFIG.style,
      center: [CONFIG.center.longitude, CONFIG.center.latitude],
      zoom: CONFIG.zoom,
      minZoom: CONFIG.minZoom,
      maxZoom: CONFIG.maxZoom,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    function post(message) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }

    // ---------------------------------------------------------- markers

    var markerInstances = {};

    function applyMarkers(markers, selectedId, pickable) {
      var seen = {};
      markers.forEach(function (m) {
        seen[m.id] = true;
        var existing = markerInstances[m.id];
        if (existing) {
          existing.setLngLat([m.lng, m.lat]);
        } else {
          var marker = new mapboxgl.Marker({ color: m.color, draggable: pickable })
            .setLngLat([m.lng, m.lat])
            .addTo(map);
          marker.getElement().addEventListener('click', function (e) {
            e.stopPropagation();
            post({ type: 'marker', id: m.id });
          });
          marker.on('dragend', function () {
            var pos = marker.getLngLat();
            post({ type: 'pick', lat: pos.lat, lng: pos.lng });
          });
          markerInstances[m.id] = marker;
          existing = marker;
        }
        if (m.label && selectedId === m.id) {
          existing.setPopup(
            new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 22 }).setText(m.label),
          );
          existing.togglePopup();
          existing.getElement().style.zIndex = '5';
        } else if (existing.getPopup()) {
          existing.getPopup().remove();
          existing.getElement().style.zIndex = '';
        }
      });
      Object.keys(markerInstances).forEach(function (id) {
        if (!seen[id]) {
          markerInstances[id].remove();
          delete markerInstances[id];
        }
      });
    }

    // ------------------------------------------------------------ radius

    /** A circle of points around a centre, close enough to a geodesic circle for a map overlay. */
    function circlePolygon(center, radiusMeters, steps) {
      var R = 6371000;
      var lat1 = (center.latitude * Math.PI) / 180;
      var lng1 = (center.longitude * Math.PI) / 180;
      var d = radiusMeters / R;
      var coords = [];
      for (var i = 0; i <= steps; i++) {
        var bearing = (i * 2 * Math.PI) / steps;
        var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing));
        var lng2 =
          lng1 +
          Math.atan2(
            Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
            Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
          );
        coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
      }
      return { type: 'Polygon', coordinates: [coords] };
    }

    function applyRadius(radiusMeters, radiusCenter) {
      var source = map.getSource('radius');
      if (!source) return;
      var geometry =
        radiusMeters && radiusCenter ? circlePolygon(radiusCenter, radiusMeters, 72) : { type: 'Polygon', coordinates: [] };
      source.setData({ type: 'Feature', geometry: geometry, properties: {} });
    }

    // -------------------------------------------------------- RN bridge

    var pending = null;
    // Where "recenter" goes back to. Starts at the page's own opening view, but tracks the
    // React side's initialCenter after that, so a screen like the report form - where that
    // prop follows the pin - snaps back to wherever the pin currently is, not the first view.
    var recenterTarget = CONFIG.center;

    window.updateData = function (data) {
      if (!map.isStyleLoaded()) {
        pending = data;
        return;
      }
      applyMarkers(data.markers || [], data.selectedMarkerId, CONFIG.pickable);
      applyRadius(data.radiusMeters, data.radiusCenter);
      if (data.center) recenterTarget = data.center;
    };

    window.__recenter = function () {
      map.flyTo({ center: [recenterTarget.longitude, recenterTarget.latitude], zoom: CONFIG.zoom });
    };

    map.on('load', function () {
      map.addSource('radius', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: {} } });
      map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#2E7D5B', 'fill-opacity': 0.14 } });
      map.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#2E7D5B', 'line-opacity': 0.55, 'line-width': 2 } });

      applyMarkers(CONFIG.markers || [], CONFIG.selectedMarkerId, CONFIG.pickable);
      applyRadius(CONFIG.radiusMeters, CONFIG.radiusCenter);

      if (pending) {
        window.updateData(pending);
        pending = null;
      }
      post({ type: 'ready' });
    });

    map.on('click', function (e) {
      if (!CONFIG.pickable) return;
      post({ type: 'pick', lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.on('error', function (e) {
      post({ type: 'error', message: (e && e.error && e.error.message) || 'Map failed to load.' });
    });
  </script>
</body>
</html>`;
}
