# SaanPaw

**A Mobile-Based Animal Identification with Image Recognition, Smart Alert System,
Local Shelter Integration, and Geolocation for both Lost Pets and Stray Recovery
for San Jose Del Monte, Bulacan.**

Capstone Project — BS Information Technology, STI San Jose Del Monte.
Proponents: Mark Kenneth B. Pena, Dirk Louisse R. Villaflor,
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
| `spike/`    | Timeboxed image-recognition experiment — measures whether pre-trained embeddings can separate same-animal photos |

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
   `shared/src/sjdmBoundary.ts`).
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

Checks and production builds:

```bash
npm run lint          # ESLint across shared, mobile, and web
npm run typecheck     # tsc --noEmit in all three
npm run build         # builds the console and the mobile web export
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

The backend REST API is now **fully implemented** and ready for mobile integration:

```bash
cd backend
cp .env.example .env          # set MONGODB_URI, JWT_SECRET, etc.
npm install                   # install dependencies
npm run seed                  # populate demo data (requires MongoDB)
npm run dev                   # start development server on http://localhost:4000
```

See [BACKEND_DEVELOPMENT.md](BACKEND_DEVELOPMENT.md) for comprehensive backend documentation,
including all 19 implemented endpoints, data models, authentication, and deployment instructions.

## Status

| Layer | State |
|-------|-------|
| Shared domain (`shared/`) | ✅ Implemented — types, geo-fence, matching, seed data, design tokens |
| Mobile app (`mobile/`) | ✅ Implemented — User + Shelter Admin modules, 23 routed screens |
| Developer console (`web/`) | ✅ Implemented — login, dashboard, shelter approvals, report monitoring, system management |
| Backend API (`backend/`) | ✅ Implemented — All 19 endpoints, models, auth, services, database seeding |
| Data layer | In-memory store (mobile/web) connects to MongoDB backend via REST API |

**Next phase:** Integrate mobile app with backend API by adding HTTP client and replacing mock store calls with API calls.

## Development methodology

Waterfall (see [`docs/methodology.md`](docs/methodology.md)):
Requirements -> Design -> Implementation -> Verification/Testing -> Deployment & Maintenance.
