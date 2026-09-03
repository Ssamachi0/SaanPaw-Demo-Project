# SaanPaw Mobile

Expo (SDK 54) + React Native + TypeScript client for all three modules.

## Run it

```bash
npm install          # from the repo root - this is an npm workspace
npm run web:mobile   # opens http://localhost:8081 in a browser
```

For a phone or emulator:

```bash
npm --workspace mobile run start   # then press "a" for Android, or scan the QR in Expo Go
```

The app runs **without a backend**. Every screen reads from an in-memory store
seeded with realistic San Jose Del Monte data, so the whole system is
demonstrable today.

### Demo accounts

| Module | Email | Password |
|--------|-------|----------|
| Pet Owner / Community | `user@saanpaw.ph` | `saanpaw123` |
| Shelter Admin | `shelter@saanpaw.ph` | `saanpaw123` |
| Developer | `dev@saanpaw.ph` | `saanpaw123` |

Credentials are pre-filled on each login screen.

## Layout

```
src/
  navigation/     RootNavigator picks a module stack by authenticated role
  screens/
    developer/    Figures 2-5  (Developer Module)
    shelter/      Figures 6-12 (Shelter Admin Module)
    user/         Figures 13-20 (User Module)
  components/
    ui/           design-system primitives (Button, Field, Card, Sheet, ...)
    domain/       ReportCard, MatchCard, ShelterCard, NotificationRow, status pills
    map/          MapCanvas - dependency-free OpenStreetMap tile map
  store/          AppStore - in-memory data + every mutation the UI can perform
  mock/           seed data for SJDM (users, shelters, reports, cases, flags)
  context/        AuthContext (role session, AsyncStorage-backed)
  services/       apiClient (axios) + service stubs for the REST phase
  constants/      theme, config, sjdm (barangays, distance), sjdmBoundary
  types/          shared TS types matching the planned API contract
```

## Notable implementation choices

**No `react-native-maps`.** It needs a Google Maps API key and has no web
target, which would block the browser demo. `components/map/MapCanvas.tsx`
draws OpenStreetMap raster tiles into plain `<Image>` tiles and projects markers
with Web Mercator maths, so the same component runs on Android, iOS, and web
with no key and no native module. Tiles are © OpenStreetMap contributors.

**Image recognition runs client-side for now.** `AppStore.runImageMatch`
scores candidates on species, coat-colour word overlap, breed, size class, and
distance, and returns human-readable reasons for each score. The real model
belongs on the server; this mirrors the ranking shape the API will return, so
the screens do not change when it lands.

**`overrides` in the root `package.json`.** Many Expo and React Navigation
packages accept a wide `react-native` peer range, so npm hoists the newest
release to the repo root while the workspace pins the SDK 54 version. Metro
then resolves the hoisted copy and fails on changed package exports. The
override keeps exactly one `react-native` and one `react` in the tree.

## Wiring the backend

`store/AppStore.tsx` is the single seam. Each action there becomes a request
plus a refetch; the screens consume the store through `useApp()` and do not need
to change. `services/` already holds the axios client and endpoint stubs.
