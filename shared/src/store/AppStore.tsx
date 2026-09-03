import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { distanceMeters } from '../sjdm';
import {
  CURRENT_SHELTER_ID,
  CURRENT_USER_ID,
  seedCases,
  seedConversations,
  seedFlags,
  seedMatches,
  seedMessages,
  seedNotifications,
  seedReports,
  seedShelterAnimals,
  seedShelters,
  seedUsers,
} from '../mock/data';
import type {
  AnimalCase,
  AnimalCaseStatus,
  AnimalReport,
  AnimalType,
  AppUser,
  Conversation,
  DashboardStats,
  LatLng,
  MatchSuggestion,
  Message,
  ModerationFlag,
  NotificationItem,
  ReportKind,
  ReportStatus,
  Role,
  Shelter,
  ShelterAnimal,
} from '../types';

/**
 * All app data, held in memory.
 *
 * Every action lives here, so reporting a lost pet also alerts nearby shelters
 * and shows up in the developer console. When the API lands, these actions
 * become fetch calls and no screen has to change.
 */

/**
 * "Daily" means the last 24 hours, matching the backend.
 * Counting by calendar day zeroed the dashboard just after midnight.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const withinLast24h = (iso: string) => Date.now() - +new Date(iso) <= DAY_MS;

const uid = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

export interface NewReportInput {
  kind: ReportKind;
  name?: string;
  animalType: AnimalType;
  breed?: string;
  color?: string;
  sex?: AnimalReport['sex'];
  size?: AnimalReport['size'];
  distinctMarks?: string;
  description?: string;
  imageUrls: string[];
  barangay: string;
  location: LatLng;
}

interface AppState {
  users: AppUser[];
  shelters: Shelter[];
  reports: AnimalReport[];
  matches: MatchSuggestion[];
  shelterAnimals: ShelterAnimal[];
  cases: AnimalCase[];
  flags: ModerationFlag[];
  notifications: NotificationItem[];
  conversations: Conversation[];
  messages: Message[];

  currentUser: AppUser;
  currentShelter: Shelter;

  // ---- selectors
  stats: DashboardStats;
  reportById: (id: string) => AnimalReport | undefined;
  shelterById: (id: string) => Shelter | undefined;
  myReports: AnimalReport[];
  /** Inside the user's alert radius, nearest first. */
  nearbyReports: (kind?: ReportKind) => (AnimalReport & { distance: number })[];
  /** Inside the shelter's operating radius, nearest first. */
  shelterAreaReports: () => (AnimalReport & { distance: number })[];
  matchesForReport: (lostReportId: string) => MatchSuggestion[];
  notificationsFor: (role: Role) => NotificationItem[];
  messagesIn: (conversationId: string) => Message[];
  caseForReport: (reportId: string) => AnimalCase | undefined;
  /**
   * Stands in for image recognition: scores open found reports and shelter
   * animals against a description. The real model will run on the server and
   * return this same shape.
   */
  runImageMatch: (input: {
    animalType: AnimalType;
    color?: string;
    size?: AnimalReport['size'];
    breed?: string;
    location: LatLng;
  }) => { id: string; source: 'found_report' | 'shelter_animal'; score: number; reasons: string[] }[];

  // ---- actions
  createReport: (input: NewReportInput) => AnimalReport;
  setReportStatus: (reportId: string, status: ReportStatus) => void;
  deleteReport: (reportId: string) => void;
  setShelterApproval: (shelterId: string, status: 'approved' | 'rejected') => void;
  openCase: (reportId: string, note: string) => void;
  setCaseStatus: (caseId: string, status: AnimalCaseStatus, note: string) => void;
  setShelterAnimalStatus: (animalId: string, status: AnimalCaseStatus) => void;
  addShelterAnimal: (input: Omit<ShelterAnimal, 'id' | 'shelterId'>) => void;
  toggleAnimalPublic: (animalId: string) => void;
  updateShelterProfile: (patch: Partial<Shelter>) => void;
  updateUserProfile: (patch: Partial<AppUser>) => void;
  sendMessage: (conversationId: string, senderRole: Role, body: string) => void;
  startConversation: (shelterId: string, subject: string, body: string) => string;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (role: Role) => void;
  resolveFlag: (flagId: string, resolution: ModerationFlag['resolution']) => void;
  banUser: (userId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(seedUsers);
  const [shelters, setShelters] = useState<Shelter[]>(seedShelters);
  const [reports, setReports] = useState<AnimalReport[]>(seedReports);
  const [matches, setMatches] = useState<MatchSuggestion[]>(seedMatches);
  const [shelterAnimals, setShelterAnimals] = useState<ShelterAnimal[]>(seedShelterAnimals);
  const [cases, setCases] = useState<AnimalCase[]>(seedCases);
  const [flags, setFlags] = useState<ModerationFlag[]>(seedFlags);
  const [notifications, setNotifications] = useState<NotificationItem[]>(seedNotifications);
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [messages, setMessages] = useState<Message[]>(seedMessages);

  const currentUser = users.find((u) => u.id === CURRENT_USER_ID)!;
  const currentShelter = shelters.find((s) => s.id === CURRENT_SHELTER_ID)!;

  const pushNotification = useCallback((n: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) => {
    setNotifications((prev) => [
      { ...n, id: uid('n'), createdAt: new Date().toISOString(), isRead: false },
      ...prev,
    ]);
  }, []);

  // -------------------------------------------------------------- selectors

  const stats = useMemo<DashboardStats>(() => {
    const live = reports.filter((r) => r.status === 'active' || r.status === 'matched');
    return {
      lostToday: reports.filter((r) => r.kind === 'lost' && withinLast24h(r.reportedAt)).length,
      foundToday: reports.filter((r) => r.kind === 'found' && withinLast24h(r.reportedAt)).length,
      activeReports: live.length,
      reunitedThisMonth:
        cases.filter((c) => c.status === 'reunited').length +
        shelterAnimals.filter((a) => a.caseStatus === 'reunited').length,
      underRescue: shelterAnimals.filter((a) => a.caseStatus === 'under_rescue').length,
      sheltersOnline: shelters.filter((s) => s.approvalStatus === 'approved').length,
    };
  }, [reports, cases, shelterAnimals, shelters]);

  const reportById = useCallback((id: string) => reports.find((r) => r.id === id), [reports]);
  const shelterById = useCallback((id: string) => shelters.find((s) => s.id === id), [shelters]);

  const myReports = useMemo(
    () =>
      reports
        .filter((r) => r.reporterId === currentUser.id)
        .sort((a, b) => +new Date(b.reportedAt) - +new Date(a.reportedAt)),
    [reports, currentUser.id],
  );

  const nearbyReports = useCallback(
    (kind?: ReportKind) =>
      reports
        .filter((r) => (kind ? r.kind === kind : true))
        .filter((r) => r.status !== 'closed')
        .map((r) => ({ ...r, distance: distanceMeters(currentUser.location, r.location) }))
        .filter((r) => r.distance <= currentUser.alertRadiusMeters)
        .sort((a, b) => a.distance - b.distance),
    [reports, currentUser],
  );

  const shelterAreaReports = useCallback(
    () =>
      reports
        .filter((r) => r.status !== 'closed')
        .map((r) => ({ ...r, distance: distanceMeters(currentShelter.location, r.location) }))
        .filter((r) => r.distance <= currentShelter.operatingRadiusMeters)
        .sort((a, b) => a.distance - b.distance),
    [reports, currentShelter],
  );

  const matchesForReport = useCallback(
    (lostReportId: string) =>
      matches.filter((m) => m.lostReportId === lostReportId).sort((a, b) => b.score - a.score),
    [matches],
  );

  const notificationsFor = useCallback(
    (role: Role) =>
      notifications
        .filter((n) => n.audience === role)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [notifications],
  );

  const messagesIn = useCallback(
    (conversationId: string) =>
      messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt)),
    [messages],
  );

  const caseForReport = useCallback(
    (reportId: string) => cases.find((c) => c.reportId === reportId),
    [cases],
  );

  const runImageMatch = useCallback<AppState['runImageMatch']>(
    (input) => {
      const norm = (s?: string) => (s ?? '').toLowerCase();
      const colorWords = norm(input.color).split(/[^a-z]+/).filter((w) => w.length > 2);

      const score = (c: {
        animalType: AnimalType;
        color?: string;
        size?: AnimalReport['size'];
        breed?: string;
        location?: LatLng;
      }) => {
        const reasons: string[] = [];
        let s = 0;

        if (c.animalType === input.animalType) {
          s += 0.35;
          reasons.push(`Species match (${input.animalType})`);
        } else {
          return null; // a cat is never a match for a dog
        }

        const candColor = norm(c.color);
        const overlap = colorWords.filter((w) => candColor.includes(w));
        if (overlap.length) {
          s += Math.min(0.3, 0.15 * overlap.length);
          reasons.push(`Coat colour overlap on "${overlap.join(', ')}"`);
        }

        if (input.breed && c.breed && norm(c.breed).includes(norm(input.breed).split(' ')[0])) {
          s += 0.15;
          reasons.push(`Breed reads as ${c.breed}`);
        }

        if (input.size && c.size === input.size) {
          s += 0.1;
          reasons.push(`Same size class (${input.size})`);
        }

        if (c.location) {
          const d = distanceMeters(input.location, c.location);
          if (d < 2000) {
            s += 0.15;
            reasons.push(`Recorded ${(d / 1000).toFixed(1)} km away`);
          } else if (d < 6000) {
            s += 0.05;
            reasons.push(`Recorded ${(d / 1000).toFixed(1)} km away`);
          } else {
            reasons.push(`Recorded ${(d / 1000).toFixed(1)} km away - outside the usual stray range`);
          }
        }

        return { score: Math.min(0.99, s), reasons };
      };

      const fromReports = reports
        .filter((r) => r.kind === 'found' && r.status === 'active')
        .map((r) => {
          const res = score(r);
          return res && { id: r.id, source: 'found_report' as const, ...res };
        });

      const fromAnimals = shelterAnimals
        .filter((a) => a.caseStatus === 'under_rescue' || a.caseStatus === 'inconclusive')
        .map((a) => {
          const shelter = shelters.find((s) => s.id === a.shelterId);
          const res = score({ ...a, location: shelter?.location });
          return res && { id: a.id, source: 'shelter_animal' as const, ...res };
        });

      return [...fromReports, ...fromAnimals]
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    },
    [reports, shelterAnimals, shelters],
  );

  // ---------------------------------------------------------------- actions

  const createReport = useCallback<AppState['createReport']>(
    (input) => {
      const report: AnimalReport = {
        ...input,
        id: uid('r'),
        status: 'active',
        reportedAt: new Date().toISOString(),
        reporterId: currentUser.id,
        reporterName: currentUser.fullName,
        reporterPhone: currentUser.phone,
      };
      setReports((prev) => [report, ...prev]);

      // Alert every approved shelter whose radius covers this report.
      shelters
        .filter((s) => s.approvalStatus === 'approved')
        .forEach((s) => {
          const d = distanceMeters(s.location, report.location);
          if (d <= s.operatingRadiusMeters) {
            pushNotification({
              audience: 'shelter_admin',
              type: input.kind === 'lost' ? 'lost_nearby' : 'found_nearby',
              title: `New ${input.kind} report in your radius`,
              body: `${input.name ?? `A ${input.color ?? ''} ${input.animalType}`.trim()} in ${input.barangay}, ${(d / 1000).toFixed(1)} km away.`,
              distanceMeters: d,
              relatedReportId: report.id,
            });
          }
        });

      if (input.kind === 'lost') {
        pushNotification({
          audience: 'user',
          type: 'lost_nearby',
          title: 'Your report is live',
          body: `${input.name ?? 'Your pet'} is now visible to shelters and nearby users in ${input.barangay}.`,
          relatedReportId: report.id,
        });

        // Rank candidates now so the match screen has results waiting.
        const ranked = runImageMatch({
          animalType: input.animalType,
          color: input.color,
          size: input.size,
          breed: input.breed,
          location: input.location,
        });
        if (ranked.length) {
          setMatches((prev) => [
            ...ranked.slice(0, 3).map((m) => ({
              id: uid('mm'),
              lostReportId: report.id,
              candidateId: m.id,
              candidateSource: m.source,
              score: m.score,
              reasons: m.reasons,
              createdAt: new Date().toISOString(),
            })),
            ...prev,
          ]);
        }
      }

      return report;
    },
    [currentUser, shelters, pushNotification, runImageMatch],
  );

  const setReportStatus = useCallback<AppState['setReportStatus']>((reportId, status) => {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
  }, []);

  const deleteReport = useCallback<AppState['deleteReport']>((reportId) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setMatches((prev) => prev.filter((m) => m.lostReportId !== reportId && m.candidateId !== reportId));
  }, []);

  const setShelterApproval = useCallback<AppState['setShelterApproval']>((shelterId, status) => {
    setShelters((prev) => prev.map((s) => (s.id === shelterId ? { ...s, approvalStatus: status } : s)));
  }, []);

  const openCase = useCallback<AppState['openCase']>(
    (reportId, note) => {
      const id = uid('c');
      const at = new Date().toISOString();
      setCases((prev) => [
        {
          id,
          reportId,
          shelterId: currentShelter.id,
          status: 'under_rescue',
          openedAt: at,
          updatedAt: at,
          timeline: [{ at, status: 'under_rescue', note, by: currentShelter.name }],
        },
        ...prev,
      ]);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, caseId: id, status: 'matched' } : r)),
      );
      pushNotification({
        audience: 'user',
        type: 'case_update',
        title: 'A shelter responded to your report',
        body: `${currentShelter.name} opened a rescue case. Status: Under rescue.`,
        relatedReportId: reportId,
      });
    },
    [currentShelter, pushNotification],
  );

  const setCaseStatus = useCallback<AppState['setCaseStatus']>(
    (caseId, status, note) => {
      const at = new Date().toISOString();
      let reportId: string | undefined;
      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== caseId) return c;
          reportId = c.reportId;
          return {
            ...c,
            status,
            updatedAt: at,
            timeline: [...c.timeline, { at, status, note, by: currentShelter.name }],
          };
        }),
      );
      if (status === 'reunited' && reportId) {
        setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'recovered' } : r)));
      }
      pushNotification({
        audience: 'user',
        type: 'case_update',
        title: 'Case status updated',
        body: `${currentShelter.name} set the case to "${status.replace('_', ' ')}". ${note}`,
        relatedReportId: reportId,
      });
    },
    [currentShelter, pushNotification],
  );

  const setShelterAnimalStatus = useCallback<AppState['setShelterAnimalStatus']>((animalId, status) => {
    setShelterAnimals((prev) =>
      prev.map((a) => (a.id === animalId ? { ...a, caseStatus: status } : a)),
    );
  }, []);

  const addShelterAnimal = useCallback<AppState['addShelterAnimal']>(
    (input) => {
      setShelterAnimals((prev) => [{ ...input, id: uid('sa'), shelterId: currentShelter.id }, ...prev]);
    },
    [currentShelter.id],
  );

  const toggleAnimalPublic = useCallback<AppState['toggleAnimalPublic']>((animalId) => {
    setShelterAnimals((prev) =>
      prev.map((a) => (a.id === animalId ? { ...a, postedPublicly: !a.postedPublicly } : a)),
    );
  }, []);

  const updateShelterProfile = useCallback<AppState['updateShelterProfile']>(
    (patch) => {
      setShelters((prev) => prev.map((s) => (s.id === currentShelter.id ? { ...s, ...patch } : s)));
    },
    [currentShelter.id],
  );

  const updateUserProfile = useCallback<AppState['updateUserProfile']>(
    (patch) => {
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, ...patch } : u)));
    },
    [currentUser.id],
  );

  const sendMessage = useCallback<AppState['sendMessage']>(
    (conversationId, senderRole, body) => {
      const sentAt = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: uid('msg'),
          conversationId,
          senderRole,
          senderName: senderRole === 'shelter_admin' ? currentShelter.name : currentUser.fullName,
          body,
          sentAt,
        },
      ]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessageAt: sentAt,
                unreadForShelter: senderRole === 'user' ? c.unreadForShelter + 1 : 0,
                unreadForUser: senderRole === 'shelter_admin' ? c.unreadForUser + 1 : 0,
              }
            : c,
        ),
      );
    },
    [currentShelter.name, currentUser.fullName],
  );

  const startConversation = useCallback<AppState['startConversation']>(
    (shelterId, subject, body) => {
      const id = uid('conv');
      const at = new Date().toISOString();
      setConversations((prev) => [
        {
          id,
          shelterId,
          userId: currentUser.id,
          userName: currentUser.fullName,
          subject,
          lastMessageAt: at,
          unreadForShelter: 1,
          unreadForUser: 0,
        },
        ...prev,
      ]);
      setMessages((prev) => [
        ...prev,
        { id: uid('msg'), conversationId: id, senderRole: 'user', senderName: currentUser.fullName, body, sentAt: at },
      ]);
      return id;
    },
    [currentUser],
  );

  const markNotificationRead = useCallback<AppState['markNotificationRead']>((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback<AppState['markAllNotificationsRead']>((role) => {
    setNotifications((prev) => prev.map((n) => (n.audience === role ? { ...n, isRead: true } : n)));
  }, []);

  const resolveFlag = useCallback<AppState['resolveFlag']>((flagId, resolution) => {
    setFlags((prev) => {
      const flag = prev.find((f) => f.id === flagId);
      if (flag && resolution === 'removed') {
        setReports((rs) => rs.filter((r) => r.id !== flag.reportId));
      }
      if (flag && resolution === 'account_banned') {
        setUsers((us) => us.map((u) => (u.id === flag.reporterId ? { ...u, isBanned: true } : u)));
        setReports((rs) => rs.filter((r) => r.reporterId !== flag.reporterId));
      }
      return prev.map((f) => (f.id === flagId ? { ...f, resolution } : f));
    });
  }, []);

  const banUser = useCallback<AppState['banUser']>((userId) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isBanned: true } : u)));
    setReports((prev) => prev.filter((r) => r.reporterId !== userId));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      users,
      shelters,
      reports,
      matches,
      shelterAnimals,
      cases,
      flags,
      notifications,
      conversations,
      messages,
      currentUser,
      currentShelter,
      stats,
      reportById,
      shelterById,
      myReports,
      nearbyReports,
      shelterAreaReports,
      matchesForReport,
      notificationsFor,
      messagesIn,
      caseForReport,
      runImageMatch,
      createReport,
      setReportStatus,
      deleteReport,
      setShelterApproval,
      openCase,
      setCaseStatus,
      setShelterAnimalStatus,
      addShelterAnimal,
      toggleAnimalPublic,
      updateShelterProfile,
      updateUserProfile,
      sendMessage,
      startConversation,
      markNotificationRead,
      markAllNotificationsRead,
      resolveFlag,
      banUser,
    }),
    [
      users, shelters, reports, matches, shelterAnimals, cases, flags, notifications,
      conversations, messages, currentUser, currentShelter, stats, reportById, shelterById,
      myReports, nearbyReports, shelterAreaReports, matchesForReport, notificationsFor,
      messagesIn, caseForReport, runImageMatch, createReport, setReportStatus, deleteReport,
      setShelterApproval, openCase, setCaseStatus, setShelterAnimalStatus, addShelterAnimal,
      toggleAnimalPublic, updateShelterProfile, updateUserProfile, sendMessage,
      startConversation, markNotificationRead, markAllNotificationsRead, resolveFlag, banUser,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppStoreProvider');
  return ctx;
}
