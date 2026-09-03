# SaanPaw

**A Mobile-Based Animal Identification with Image Recognition, Smart Alert System,
Local Shelter Integration, and Geolocation for both Lost Pets and Stray Recovery
for San Jose Del Monte, Bulacan.**

Capstone Project — BS Information Technology, STI San Jose Del Monte.
Proponents: Justin F. Roque, Mark Kenneth B. Pena, Dirk Louisse R. Villaflor,
Mark Gabriel I. Yoldi.

---

## What this repository contains

| Path        | Purpose                                                                 |
|-------------|-----------------------------------------------------------------------|
| `shared/`   | `@saanpaw/shared` — data model, SJDM geography and geo-fence, matching logic, seed data, design tokens |
| `mobile/`   | Expo + React Native + TypeScript app — **User** and **Shelter Admin** modules |
| `web/`      | React + Vite developer console — the **Developer** module, a separate web application |
| `backend/`  | Node.js + Express + TypeScript REST API, MongoDB (Mongoose) data layer |
| `docs/`     | Chapter 3 design artifacts — architecture, flowcharts, use-case diagrams, DFD, ERD |

The Developer Module is deliberately **not** in the mobile app. Shelter approvals,
report moderation, and system management are desk work best done on a wide screen,
and keeping them off the phone means system administration is not reachable from a
citizen's or shelter volunteer's device at all.

The folder layout mirrors the three modules defined in the proposal's
**Scope and Limitations** and is traceable feature-by-feature in
[`docs/scope-traceability.md`](docs/scope-traceability.md).

## System scope (summary)

- **Developer Module** — Login, Dashboard, Shelter Approval Management,
  System Management, Report Monitoring (AI auto-flagging of false/inappropriate reports).
- **Shelter Admin Module** — Register (with operating radius), Login, Dashboard,
  Shelter Animals Management, Recovered Animals Posting, Animal Report Management,
  Animal Status Management (under rescue / reunited / adopted / inconclusive),
  Message Box, Shelter Profile Management, Notification Management.
- **User Module** — Registration (with alert radius), Login, Dashboard, Report Lost Pet,
  Reported Lost Pet Status Update, Report Found Animal, Shelter View,
  Image Recognition Matching, Map View Interface, Smart Notifications,
  Search and Filter Reports.

## Limitations (enforced in code)

1. Operates **only within San Jose Del Monte, Bulacan** — every report coordinate is
   geo-fenced against the city boundary (`backend/src/config/serviceArea.ts`,
   `mobile/src/constants/sjdmBoundary.ts`).
2. **No physical tracking hardware** — no GPS collars, RFID tags, or microchips.
   Identification is image-based only.
3. **No integration with national government animal databases.**

## Getting started

The front-end is complete and runs **without the backend** — every screen is
driven by an in-memory store seeded with realistic San Jose Del Monte data.

```bash
npm install           # installs every workspace from the repo root

npm run web:mobile    # mobile app in a browser  -> http://localhost:8081
npm run dev:console   # developer console        -> http://localhost:5173
```

To run it on a phone or Android emulator instead:

```bash
npm --workspace mobile run start
```

Demo logins (pre-filled on each login screen):

| Module | Where | Email | Password |
|--------|-------|-------|----------|
| Pet Owner / Community | mobile app | `user@saanpaw.ph` | `saanpaw123` |
| Shelter Admin | mobile app | `shelter@saanpaw.ph` | `saanpaw123` |
| Developer | web console | `dev@saanpaw.ph` | `saanpaw123` |

The backend is scaffolded but not yet wired to the app:

```bash
cd backend
cp .env.example .env          # set MONGODB_URI, JWT_SECRET, etc.
npm run dev
```

## Status

| Layer | State |
|-------|-------|
| Shared domain (`shared/`) | Implemented — types, geo-fence, matching, seed data, design tokens |
| Mobile app (`mobile/`) | Implemented — User + Shelter Admin modules, 16 screens |
| Developer console (`web/`) | Implemented — login, dashboard, shelter approvals, report monitoring, system management |
| Data layer | In-memory store in `shared/src/store/AppStore.tsx`, seeded from `shared/src/mock/` |
| Backend API | Scaffolded (models, routes, services) — not yet connected to either surface |

Each surface currently runs its own copy of the in-memory store, so an approval in
the console does not show up in a separately running mobile app. Both will read and
write the same database once the REST API is connected.

## Development methodology

Waterfall (see [`docs/methodology.md`](docs/methodology.md)):
Requirements -> Design -> Implementation -> Verification/Testing -> Deployment & Maintenance.
