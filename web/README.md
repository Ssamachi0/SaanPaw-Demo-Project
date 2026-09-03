# SaanPaw Developer Console

The **Developer Module** as a standalone web application, separate from the
mobile app.

## Why this is a separate surface

The proposal defines three modules. Two of them — Pet Owner / Community and
Shelter Admin — are used in the field on a phone: reporting a stray you just
found, checking alerts near you, responding to a rescue.

The Developer Module is not field work. Approving shelters means cross-checking
permit numbers against local-government records; report moderation means reading
flagged submissions side by side; system management means configuration and
database monitoring. That is desk work, and it is better served by a wide screen
with persistent navigation, data tables, and master-detail panes than by a
phone-shaped card stack.

Separating it also means system administration is not reachable from a citizen's
or a shelter volunteer's phone at all — the mobile app has no developer sign-in.

## Run it

```bash
npm install          # from the repo root
npm run dev:console  # http://localhost:5173
```

Demo credentials, pre-filled on the login form: `dev@saanpaw.ph` / `saanpaw123`.

## Pages

| Page | Scope item | Route |
|---|---|---|
| Login | Developer Login (Figure 2) | shown when signed out |
| Dashboard | Daily statistics + access to management features | `/` |
| Shelter Approval Management | Figure 3 | `/shelters` |
| Report Monitoring | Figure 5 | `/reports` |
| System Management | Figure 4 | `/system` |

## How it relates to the mobile app

```
SaanPaw/
  shared/    @saanpaw/shared - the domain layer both surfaces import
  mobile/    User + Shelter Admin modules (Expo / React Native)
  web/       Developer Module (React + Vite)     <- this package
  backend/   REST API (pending)
```

`@saanpaw/shared` holds the data model, the San Jose Del Monte geography and
geo-fence, the image-matching logic, the seed data, and the design tokens. Both
apps import it, so a change to the report shape or the colour language reaches
both and they cannot drift apart.

The split is by presentation only. The console rebuilds the UI layer in plain
DOM and CSS — React Native components do not transfer — but every domain
decision stays in one place.

## Stack

React 19, Vite 6, React Router 7, TypeScript. Plain CSS with custom properties;
no UI library and no CSS framework, which keeps the dependency surface small and
matches the mobile app's visual language exactly.

`src/tokens.ts` writes the shared colour and radius tokens onto `:root` at boot,
so `styles.css` can consume them as CSS variables while `@saanpaw/shared` stays
the single source of truth.

## Current limitation

Each surface runs its own in-memory copy of the store, so approving a shelter in
the console does **not** appear in a separately running mobile app. That is
expected before the backend exists — both will read and write the same database
once the REST API is connected, and `AppStoreProvider` is the single seam where
that swap happens.
