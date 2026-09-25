/**
 * Mapbox powers every map in the app (Report Lost/Found location picking, the
 * Map View, and the radius pickers on registration and profile screens).
 *
 * The token is a Mapbox *public* token (`pk.…`), which is meant to ship inside
 * client apps - restrict it to your app's bundle id / URL in the Mapbox
 * dashboard rather than treating it as a secret. Set it in `.env` for local
 * development (see `.env.example`) and per build profile in `eas.json` for
 * store builds.
 */
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

export const MAPBOX_CONFIGURED = MAPBOX_TOKEN.startsWith('pk.');

/** Streets shows the road and building detail needed to place a pin precisely. */
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';
