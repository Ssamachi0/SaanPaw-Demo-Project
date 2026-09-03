import { User } from '../../models/User';
import { Shelter } from '../../models/Shelter';
import { ShelterAnimal } from '../../models/ShelterAnimal';
import { LostPetReport } from '../../models/LostPetReport';
import { FoundAnimalReport } from '../../models/FoundAnimalReport';
import { Notification } from '../../models/Notification';
import { MatchSuggestion } from '../../models/MatchSuggestion';
import { smartAlertService } from '../../services/smartAlert.service';
import { moderationService } from '../../services/moderation.service';
import { geolocationService } from '../../services/geolocation.service';
import { authService } from '../auth/auth.service';
import { REPORT_STATUSES } from '../../config/constants';
import { ApiError } from '../../utils/ApiError';

export const userService = {
  // ----- Registration -----
  async register(input: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    alertRadiusMeters: number;
    homeLocation: { type: 'Point'; coordinates: [number, number] };
  }) {
    const exists = await User.findOne({ email: input.email.toLowerCase().trim() });
    if (exists) throw ApiError.conflict('Email already registered');
    const user = await User.create({
      fullName: input.fullName,
      email: input.email.toLowerCase().trim(),
      phone: input.phone,
      passwordHash: await authService.hashPassword(input.password),
      alertRadiusMeters: input.alertRadiusMeters,
      homeLocation: input.homeLocation,
    });
    return { id: user._id };
  },

  // ----- Dashboard -----
  async getDashboard() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [lostToday, foundToday, recoveredToday] = await Promise.all([
      LostPetReport.countDocuments({ reportedAt: { $gte: since } }),
      FoundAnimalReport.countDocuments({ reportedAt: { $gte: since } }),
      LostPetReport.countDocuments({ status: 'recovered', updatedAt: { $gte: since } }),
    ]);
    return { lostToday, foundToday, recoveredToday };
  },

  // ----- Report Lost Pet -----
  async createLostReport(reporterId: string, data: any) {
    const report = await LostPetReport.create({ ...data, reporterId });
    const [lng, lat] = report.lastSeenLocation.coordinates as number[];
    await moderationService.screenReport({
      reportType: 'lost',
      reportId: String(report._id),
      reporterId,
      text: `${data.breed ?? ''} ${data.color ?? ''} ${data.description ?? ''}`,
      imageCount: report.imageUrls.length,
    });
    await smartAlertService.dispatchReportAlert({
      reportType: 'lost',
      reportId: String(report._id),
      lng,
      lat,
      summary: `${report.animalType} - ${report.color ?? ''} ${report.breed ?? ''}`.trim(),
    });
    return report;
  },

  // ----- Reported Lost Pet Status Update -----
  async updateLostReportStatus(reporterId: string, id: string, status: string) {
    if (!REPORT_STATUSES.includes(status as never)) throw ApiError.badRequest('Invalid status');
    const report = await LostPetReport.findOneAndUpdate(
      { _id: id, reporterId },
      { status },
      { new: true },
    );
    if (!report) throw ApiError.notFound('Report not found');
    return report;
  },

  // ----- Report Found Animal -----
  async createFoundReport(reporterId: string, data: any) {
    const report = await FoundAnimalReport.create({ ...data, reporterId });
    const [lng, lat] = report.foundLocation.coordinates as number[];
    await moderationService.screenReport({
      reportType: 'found',
      reportId: String(report._id),
      reporterId,
      text: `${data.breed ?? ''} ${data.color ?? ''} ${data.description ?? ''}`,
      imageCount: report.imageUrls.length,
    });
    await smartAlertService.dispatchReportAlert({
      reportType: 'found',
      reportId: String(report._id),
      lng,
      lat,
      summary: `${report.animalType} - ${report.color ?? ''} ${report.breed ?? ''}`.trim(),
    });
    return report;
  },

  // ----- Shelter View -----
  listShelters() {
    return Shelter.find({ approvalStatus: 'approved' })
      .select('name address contactNumber location operatingRadiusMeters')
      .lean();
  },
  listShelterAnimals(shelterId: string) {
    return ShelterAnimal.find({ shelterId, adoptionStatus: { $ne: 'adopted' } }).lean();
  },

  // ----- Image Recognition Matching -----
  matchSuggestions(lostReportId: string) {
    return MatchSuggestion.find({ lostReportId, status: 'suggested' })
      .sort({ similarityScore: -1 })
      .lean();
  },

  // ----- Map View Interface -----
  async mapReports(bbox?: { lng: number; lat: number; radiusMeters: number }) {
    const lostQ: Record<string, unknown> = { status: 'active', isHiddenByModeration: false };
    const foundQ: Record<string, unknown> = { status: 'active', isHiddenByModeration: false };
    if (bbox) {
      Object.assign(lostQ, geolocationService.nearFilter('lastSeenLocation', bbox.lng, bbox.lat, bbox.radiusMeters));
      Object.assign(foundQ, geolocationService.nearFilter('foundLocation', bbox.lng, bbox.lat, bbox.radiusMeters));
    }
    const [lost, found] = await Promise.all([
      LostPetReport.find(lostQ).select('animalType color breed lastSeenLocation reportedAt').lean(),
      FoundAnimalReport.find(foundQ).select('animalType color breed foundLocation reportedAt').lean(),
    ]);
    return {
      type: 'FeatureCollection',
      features: [
        ...lost.map((r) => toFeature(r, 'lost', (r as any).lastSeenLocation)),
        ...found.map((r) => toFeature(r, 'found', (r as any).foundLocation)),
      ],
    };
  },

  // ----- Search and Filter Reports -----
  searchReports(filter: {
    kind?: 'lost' | 'found';
    animalType?: string;
    dateFrom?: string;
    dateTo?: string;
    lng?: number;
    lat?: number;
    radiusMeters?: number;
  }) {
    const q: Record<string, unknown> = { isHiddenByModeration: false };
    if (filter.animalType) q.animalType = filter.animalType;
    if (filter.dateFrom || filter.dateTo) {
      q.reportedAt = {
        ...(filter.dateFrom ? { $gte: new Date(filter.dateFrom) } : {}),
        ...(filter.dateTo ? { $lte: new Date(filter.dateTo) } : {}),
      };
    }
    const runLost = filter.kind !== 'found';
    const runFound = filter.kind !== 'lost';
    const withGeo = (field: string) =>
      filter.lng != null && filter.lat != null && filter.radiusMeters != null
        ? geolocationService.nearFilter(field, filter.lng, filter.lat, filter.radiusMeters)
        : {};
    return Promise.all([
      runLost ? LostPetReport.find({ ...q, ...withGeo('lastSeenLocation') }).lean() : [],
      runFound ? FoundAnimalReport.find({ ...q, ...withGeo('foundLocation') }).lean() : [],
    ]).then(([lost, found]) => ({ lost, found }));
  },

  // ----- Smart Notifications feed -----
  listNotifications(userId: string) {
    return Notification.find({ audienceType: 'user', audienceId: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  },
  markNotificationRead(userId: string, id: string) {
    return Notification.findOneAndUpdate(
      { _id: id, audienceType: 'user', audienceId: userId },
      { isRead: true },
      { new: true },
    );
  },

  updatePushToken(userId: string, token: string) {
    return User.findByIdAndUpdate(userId, { expoPushToken: token }, { new: true });
  },
};

function toFeature(r: any, kind: 'lost' | 'found', point: any) {
  return {
    type: 'Feature',
    geometry: point,
    properties: { id: String(r._id), kind, animalType: r.animalType, color: r.color, breed: r.breed, reportedAt: r.reportedAt },
  };
}
