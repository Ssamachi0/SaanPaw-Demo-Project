import { Shelter } from '../../models/Shelter';
import { ShelterAnimal } from '../../models/ShelterAnimal';
import { AnimalCase } from '../../models/AnimalCase';
import { LostPetReport } from '../../models/LostPetReport';
import { FoundAnimalReport } from '../../models/FoundAnimalReport';
import { Notification } from '../../models/Notification';
import { geolocationService } from '../../services/geolocation.service';
import { ApiError } from '../../utils/ApiError';
import type { ANIMAL_CASE_STATUSES } from '../../config/constants';

type CaseStatus = (typeof ANIMAL_CASE_STATUSES)[number];

export const shelterService = {
  // ----- Register -----
  async register(input: {
    name: string;
    contactNumber?: string;
    address?: string;
    location: { type: 'Point'; coordinates: [number, number] };
    operatingRadiusMeters: number;
    lguPermitNumber?: string;
  }) {
    const shelter = await Shelter.create({ ...input, approvalStatus: 'pending' });
    // Developer verifies with the LGU, then issues credentials on approval.
    return { id: shelter._id, approvalStatus: shelter.approvalStatus };
  },

  // ----- Dashboard -----
  async getDashboard(shelterId: string) {
    const [activeReports, rescued, ongoing] = await Promise.all([
      AnimalCase.countDocuments({ shelterId, status: 'under_rescue' }),
      AnimalCase.countDocuments({ shelterId, status: { $in: ['reunited', 'adopted'] } }),
      AnimalCase.countDocuments({ shelterId, status: { $in: ['under_rescue', 'inconclusive'] } }),
    ]);
    return { activeReports, rescued, ongoing };
  },

  // ----- Shelter Animals Management -----
  listShelterAnimals(shelterId: string) {
    return ShelterAnimal.find({ shelterId }).sort({ intakeDate: -1 }).lean();
  },
  addShelterAnimal(shelterId: string, data: Record<string, unknown>) {
    return ShelterAnimal.create({ ...data, shelterId });
  },

  // ----- Recovered Animals Posting -----
  postRecovered(shelterId: string, data: Record<string, unknown>) {
    return ShelterAnimal.create({ ...data, shelterId, isRecoveredPost: true, adoptionStatus: 'in_care' });
  },

  // ----- Animal Report Management (lost/found within operating radius) -----
  async listAreaReports(shelterId: string) {
    const shelter = await Shelter.findById(shelterId).lean();
    if (!shelter) throw ApiError.notFound('Shelter not found');
    const [lng, lat] = shelter.location!.coordinates as number[];
    const radius = shelter.operatingRadiusMeters;
    const [lost, found] = await Promise.all([
      LostPetReport.find({
        isHiddenByModeration: false,
        status: 'active',
        ...geolocationService.nearFilter('lastSeenLocation', lng, lat, radius),
      }).lean(),
      FoundAnimalReport.find({
        isHiddenByModeration: false,
        status: 'active',
        ...geolocationService.nearFilter('foundLocation', lng, lat, radius),
      }).lean(),
    ]);
    return { lost, found };
  },

  // ----- Animal Status Management -----
  async updateCaseStatus(params: {
    shelterId: string;
    caseId: string;
    status: CaseStatus;
    notes?: string;
  }) {
    const doc = await AnimalCase.findOne({ _id: params.caseId, shelterId: params.shelterId });
    if (!doc) throw ApiError.notFound('Animal case not found');
    doc.status = params.status;
    if (params.notes) doc.notes = params.notes;
    doc.history.push({ status: params.status, changedBy: params.shelterId as never, changedAt: new Date() });
    await doc.save();
    return doc;
  },

  // ----- Shelter Profile Management -----
  async updateProfile(shelterId: string, patch: Record<string, unknown>) {
    const allowed = ['name', 'contactNumber', 'address', 'location', 'operatingRadiusMeters'];
    const update = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
    return Shelter.findByIdAndUpdate(shelterId, update, { new: true });
  },

  // ----- Notification Management -----
  listNotifications(shelterId: string) {
    return Notification.find({ audienceType: 'shelter', audienceId: shelterId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  },
  markNotificationRead(shelterId: string, id: string) {
    return Notification.findOneAndUpdate(
      { _id: id, audienceType: 'shelter', audienceId: shelterId },
      { isRead: true },
      { new: true },
    );
  },
};
