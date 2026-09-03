# UI Screen Inventory

All screens below are implemented and runnable.

Figure numbers cross-reference the proposal's mockups. Those figures are
**illustrative** — they show roughly how a screen might look and are a source of
inspiration, not a specification. The binding requirements are the written Scope
and Limitations; layout and palette are free to be optimised.

The **Developer Module runs as a separate web console** (`web/`, see
[`web/README.md`](../web/README.md)); the **User and Shelter Admin modules** are
the mobile app (`mobile/`, see [`mobile/README.md`](../mobile/README.md)).
Figures 2-5 therefore live in `web/src/pages/`, and Figures 6-20 in
`mobile/src/screens/`.

| Figure | Mockup | Screen file |
|--------|--------|-------------|
| 2  | Developer Login | `web/src/pages/Login.tsx` |
| 3  | Shelter Approval | `web/src/pages/ShelterApprovals.tsx` |
| 4  | System Management | `web/src/pages/SystemManagement.tsx` |
| 5  | Report Monitoring | `web/src/pages/ReportMonitoring.tsx` |
| 6  | Shelter Admin Register | `mobile/src/screens/shelter/RegisterScreen.tsx` |
| 7  | Shelter Admin Login | `mobile/src/screens/shelter/LoginScreen.tsx` |
| 8  | Shelter Admin Dashboard | `mobile/src/screens/shelter/DashboardScreen.tsx` |
| 9  | Animal Report Management | `mobile/src/screens/shelter/AnimalReportsScreen.tsx` |
| 10 | Animal Status Management | `mobile/src/screens/shelter/AnimalStatusScreen.tsx` |
| 11 | Shelter Profile Management | `mobile/src/screens/shelter/ShelterProfileScreen.tsx` |
| 12 | Notification Management | `mobile/src/screens/shelter/NotificationsScreen.tsx` |
| 13 | User Login | `mobile/src/screens/user/LoginScreen.tsx` |
| 14 | User Registration | `mobile/src/screens/user/RegisterScreen.tsx` |
| 15 | Report Lost Pet | `mobile/src/screens/user/ReportLostPetScreen.tsx` |
| 16 | Report Found Animal | `mobile/src/screens/user/ReportFoundAnimalScreen.tsx` |
| 17 | Image Recognition Matching | `mobile/src/screens/user/ImageRecognitionScreen.tsx` |
| 18 | Map View Interface | `mobile/src/screens/user/MapViewScreen.tsx` |
| 19 | Smart Notifications | `mobile/src/screens/user/NotificationsScreen.tsx` |
| 20 | Search and Filter Reports | `mobile/src/screens/user/SearchReportsScreen.tsx` |

Also implemented (referenced in the scope narrative, no standalone figure):

| Screen | File |
|--------|------|
| Module picker (app entry) | `mobile/src/screens/auth/RolePickerScreen.tsx` |
| Developer Dashboard | `web/src/pages/Dashboard.tsx` |
| Shelter Animals Management | `mobile/src/screens/shelter/ShelterAnimalsScreen.tsx` |
| Recovered Animals Posting | `mobile/src/screens/shelter/RecoveredAnimalsScreen.tsx` |
| Message Box | `mobile/src/screens/shelter/MessagesScreen.tsx` |
| User Dashboard | `mobile/src/screens/user/DashboardScreen.tsx` |
| Shelter View | `mobile/src/screens/user/ShelterViewScreen.tsx` |
| Reported Lost Pet Status Update | `mobile/src/screens/user/LostPetStatusScreen.tsx` |

Figures 15 and 16 share `mobile/src/screens/user/ReportForm.tsx`; the two flows
collect the same animal descriptor and differ only in the pet-name field, the
copy, and what happens after submission.

## Shared building blocks

| Layer | File | Purpose |
|-------|------|---------|
| Design tokens | `shared/src/theme.ts` (+ `mobile/src/constants/theme.ts`, `web/src/tokens.ts`) | Colour, spacing, radius, shadow. Lost = red, Found = amber, shelter/recovery = green, applied consistently on cards, pins, and alerts. |
| UI primitives | `mobile/src/components/ui/index.tsx` | `Screen`, `Card`, `Button`, `Field`, `Select`, `Choice`, `Segmented`, `Sheet`, `Badge`, `EmptyState`, `Banner`, `ScoreBar`, `AnimalPhoto`. |
| Domain components | `mobile/src/components/domain/index.tsx` | `ReportCard`, `MatchCard`, `ShelterCard`, `ShelterAnimalCard`, `NotificationRow`, case-status pills, `describeAnimal`, `timeAgo`. |
| Map | `mobile/src/components/map/MapCanvas.tsx` | Pan/zoom OpenStreetMap tile map with typed markers and a radius circle. No API key, no native module, works on web. |
| State | `shared/src/store/AppStore.tsx` | Every entity and every mutation either surface performs. The single seam for the REST API. |
| Seed data | `shared/src/mock/data.ts` | Realistic San Jose Del Monte users, shelters, reports, cases, moderation flags, and conversations. |

## Cross-module behaviour worth demonstrating

These flows are live in the mock store, so an action in one module is visible in
the others:

1. **Smart alert dispatch** — submitting a report in the User Module raises a
   notification in every approved shelter whose operating radius covers the pin,
   and adds the report to the Developer Module's monitor.
2. **Image-recognition matching** — a new lost report is scored against every
   open found report and shelter animal, and the ranked candidates appear
   immediately on the submission confirmation screen.
3. **Case lifecycle** — a shelter responding to a report opens a case; setting it
   to "Reunited" closes the owner's report and posts to their status timeline.
4. **Moderation and banning** — resolving a flag as "account banned" in the
   Developer Module removes that account's reports from every other view.
5. **Radius changes** — editing the alert radius (user) or operating radius
   (shelter) instantly changes which reports and alerts are in scope.
