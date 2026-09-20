import type {
  AnimalCase,
  AnimalCaseStatus,
  AnimalReport,
  AppUser,
  DashboardStats,
  MatchSuggestion,
  ModerationFlag,
  NotificationItem,
  ReportKind,
  ReportStatus,
  Role,
  Shelter,
  ShelterAnimal,
} from './types';

/**
 * Typed client for the SaanPaw REST API. Every response shape here is what the
 * backend serializers in `backend/src/utils/geoHelpers.ts` produce, which is the
 * same shape as `./types`, so nothing needs mapping on the way in.
 */

export interface ApiSession {
  baseUrl: string;
  token: string;
  role: Role;
  /** Called on a 401 so the app can drop an expired session. */
  onUnauthorized?: () => void;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** The backend's error middleware answers `{ error: string }`. */
export function errorText(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null) {
    const body = payload as { error?: unknown; message?: unknown };
    const text = body.error ?? body.message;
    if (typeof text === 'string' && text) return text;
  }
  return typeof payload === 'string' && payload ? payload : `Request failed (${status})`;
}

async function call<T>(
  session: ApiSession,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${session.token}` };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${session.baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiRequestError('Cannot reach the SaanPaw server. Check your connection and try again.', 0);
  }

  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  const payload: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) session.onUnauthorized?.();
    throw new ApiRequestError(errorText(payload, response.status), response.status);
  }
  return payload as T;
}

interface ReportsEnvelope {
  lost: AnimalReport[];
  found: AnimalReport[];
}

const flatten = (e: ReportsEnvelope) => [...e.lost, ...e.found];

/** A secondary fetch that should not take the whole screen down when it fails. */
async function optional<T>(task: Promise<T>, fallback: T): Promise<T> {
  try {
    return await task;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) throw err;
    return fallback;
  }
}

export interface Snapshot {
  /** Id of the signed-in user or shelter. */
  selfId: string;
  users: AppUser[];
  shelters: Shelter[];
  reports: AnimalReport[];
  matches: MatchSuggestion[];
  shelterAnimals: ShelterAnimal[];
  cases: AnimalCase[];
  flags: ModerationFlag[];
  notifications: NotificationItem[];
  /** Server-computed counters that win over anything derivable from the loaded rows. */
  stats: Partial<DashboardStats>;
}

const emptySnapshot = (selfId: string): Snapshot => ({
  selfId,
  users: [],
  shelters: [],
  reports: [],
  matches: [],
  shelterAnimals: [],
  cases: [],
  flags: [],
  notifications: [],
  stats: {},
});

export async function loadSnapshot(s: ApiSession): Promise<Snapshot> {
  if (s.role === 'user') {
    const [me, stats, shelters, mine, open, notifications] = await Promise.all([
      call<AppUser>(s, '/user/me'),
      call<DashboardStats>(s, '/user/dashboard'),
      call<Shelter[]>(s, '/user/shelters'),
      call<ReportsEnvelope>(s, '/user/reports/mine'),
      call<ReportsEnvelope>(s, '/user/reports/search'),
      call<NotificationItem[]>(s, '/user/notifications'),
    ]);

    const reports = new Map<string, AnimalReport>();
    for (const r of [...flatten(open), ...flatten(mine)]) reports.set(r.id, r);

    const [matches, animals] = await Promise.all([
      Promise.all(mine.lost.map((r) => optional(call<MatchSuggestion[]>(s, `/user/reports/lost/${r.id}/matches`), []))),
      Promise.all(shelters.map((sh) => optional(call<ShelterAnimal[]>(s, `/user/shelters/${sh.id}/animals`), []))),
    ]);

    return {
      ...emptySnapshot(me.id),
      users: [me],
      shelters,
      reports: [...reports.values()],
      matches: matches.flat(),
      shelterAnimals: animals.flat(),
      notifications,
      stats,
    };
  }

  if (s.role === 'shelter_admin') {
    const [me, dash, reports, animals, cases, notifications] = await Promise.all([
      call<Shelter>(s, '/shelter/me'),
      call<{ activeReports: number; reunited: number; underRescue: number }>(s, '/shelter/dashboard'),
      call<ReportsEnvelope>(s, '/shelter/reports'),
      call<ShelterAnimal[]>(s, '/shelter/animals'),
      call<AnimalCase[]>(s, '/shelter/cases'),
      call<NotificationItem[]>(s, '/shelter/notifications'),
    ]);
    return {
      ...emptySnapshot(me.id),
      shelters: [me],
      reports: flatten(reports),
      shelterAnimals: animals,
      cases,
      notifications,
      stats: {
        activeReports: dash.activeReports,
        reunitedThisMonth: dash.reunited,
        underRescue: dash.underRescue,
      },
    };
  }

  const overview = await call<{
    stats: DashboardStats;
    shelters: Shelter[];
    users: AppUser[];
    reports: AnimalReport[];
    flags: ModerationFlag[];
  }>(s, '/developer/overview');
  return { ...emptySnapshot(''), ...overview };
}

/** Field names the report endpoints read from the request body. */
export interface ReportPayload {
  name?: string;
  animalType: AnimalReport['animalType'];
  breed?: string;
  color?: string;
  sex?: AnimalReport['sex'];
  size?: AnimalReport['size'];
  distinctMarks?: string;
  description?: string;
  imageUrls: string[];
  barangay: string;
  location: AnimalReport['location'];
}

const notificationsBase = (role: Role) => (role === 'shelter_admin' ? '/shelter' : '/user');

export const apiActions = {
  createReport: (s: ApiSession, kind: ReportKind, body: ReportPayload) =>
    call<AnimalReport>(s, `/user/reports/${kind}`, { method: 'POST', body }),

  setReportStatus: (s: ApiSession, kind: ReportKind, id: string, status: ReportStatus) =>
    call<AnimalReport>(s, `/user/reports/${kind}/${id}/status`, { method: 'PATCH', body: { status } }),

  deleteReport: (s: ApiSession, kind: ReportKind, id: string) =>
    call<{ id: string }>(s, `/user/reports/${kind}/${id}`, { method: 'DELETE' }),

  updateUserProfile: (s: ApiSession, patch: Partial<AppUser>) =>
    call<AppUser>(s, '/user/profile', { method: 'PATCH', body: patch }),

  matchesFor: (s: ApiSession, lostReportId: string) =>
    call<MatchSuggestion[]>(s, `/user/reports/lost/${lostReportId}/matches`),

  notifications: (s: ApiSession) => call<NotificationItem[]>(s, `${notificationsBase(s.role)}/notifications`),

  markNotificationRead: (s: ApiSession, id: string) =>
    call<NotificationItem>(s, `${notificationsBase(s.role)}/notifications/${id}/read`, { method: 'PATCH' }),

  openCase: (s: ApiSession, reportId: string, note: string) =>
    call<AnimalCase>(s, '/shelter/cases', { method: 'POST', body: { reportId, note } }),

  setCaseStatus: (s: ApiSession, caseId: string, status: AnimalCaseStatus, notes: string) =>
    call<AnimalCase>(s, `/shelter/cases/${caseId}/status`, { method: 'PATCH', body: { status, notes } }),

  addShelterAnimal: (s: ApiSession, body: Omit<ShelterAnimal, 'id' | 'shelterId'>) =>
    call<ShelterAnimal>(s, '/shelter/animals', { method: 'POST', body }),

  updateShelterAnimal: (
    s: ApiSession,
    id: string,
    patch: { caseStatus?: AnimalCaseStatus; postedPublicly?: boolean },
  ) => call<ShelterAnimal>(s, `/shelter/animals/${id}`, { method: 'PATCH', body: patch }),

  updateShelterProfile: (s: ApiSession, patch: Partial<Shelter>) =>
    call<Shelter>(s, '/shelter/profile', { method: 'PATCH', body: patch }),

  reviewShelter: (s: ApiSession, id: string, decision: 'approve' | 'reject') =>
    call<{ shelter: Shelter; adminEmail?: string; temporaryPassword?: string }>(
      s,
      `/developer/shelters/${id}/review`,
      { method: 'PATCH', body: { decision } },
    ),

  resolveFlag: (s: ApiSession, id: string, action: 'dismiss' | 'remove_report') =>
    call<{ flag: ModerationFlag }>(s, `/developer/flags/${id}/resolve`, { method: 'PATCH', body: { action } }),

  banUser: (s: ApiSession, id: string) => call<AppUser>(s, `/developer/users/${id}/ban`, { method: 'PATCH' }),
};
