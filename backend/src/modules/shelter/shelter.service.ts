import { Shelter } from '../../models/Shelter';
import { ShelterAnimal } from '../../models/ShelterAnimal';
import { AnimalCase } from '../../models/AnimalCase';
import { LostPetReport } from '../../models/LostPetReport';
import { FoundAnimalReport } from '../../models/FoundAnimalReport';
import { Notification } from '../../models/Notification';
import { geolocationService } from '../../services/geolocation.service';
import { ApiError } from '../../utils/ApiError';
import {
  serializeShelter,
  serializeShelterAnimal,
  serializeLostReport,
  serializeFoundReport,
  serializeNotification,
  latLngToGeoPoint,
} from '../../utils/geoHelpers';
import type { ANIMAL_CASE_STATUSES } from '../../config/constants';

type CaseStatus = (typeof ANIMAL_CASE_STATUSES)[number];

export const shelterService = {
  // ----- Register -----
  async register(input: {
    name: string;
    barangay: string;
    contactNumber?: string;
    email?: string;
    address?: string;
    location: { latitude: number; longitude: number };
    operatingRadiusMeters: number;
    permitNumber?: string;
    capacity?: number;
  }) {
    const shelter = await Shelter.create({
      name: input.name,
      barangay: input.barangay,
      contactNumber: input.contactNumber,
      email: input.email,
      address: input.address,
      location: latLngToGeoPoint(input.location),
      operatingRadiusMeters: input.operatingRadiusMeters,
      permitNumber: input.permitNumber,
      capacity: input.capacity,
      approvalStatus: 'pending',
    });
    return serializeShelter(shelter);
  },

  // ----- Dashboard -----
  async getDashboard(shelterId: string) {
    const [activeReports, reunited, underRescue] = await Promise.all([
      LostPetReport.countDocuments({
        $or: [{ status: 'active' }, { status: 'matched' }],
        isHiddenByModeration: false,
      }),
      ShelterAnimal.countDocuments({ shelterId, caseStatus: 'reunited' }),
      ShelterAnimal.countDocuments({ shelterId, caseStatus: 'under_rescue' }),
    ]);
    return { activeReports, reunited, underRescue };
  },

  // ----- Shelter Animals Management -----
  async listShelterAnimals(shelterId: string) {
    const animals = await ShelterAnimal.find({ shelterId }).sort({ intakeDate: -1 }).lean();
    return animals.map(serializeShelterAnimal);
  },

  async addShelterAnimal(shelterId: string, data: Record<string, unknown>) {
    const animal = await ShelterAnimal.create({ ...data, shelterId });
    return serializeShelterAnimal(animal);
  },

  // ----- Recovered Animals Posting -----
  async postRecovered(shelterId: string, data: Record<string, unknown>) {
    const animal = await ShelterAnimal.create({
      ...data,
      shelterId,
      postedPublicly: true,
      caseStatus: 'under_rescue',
    });
    return serializeShelterAnimal(animal);
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
    
    return {
      lost: lost.map(serializeLostReport),
      found: found.map(serializeFoundReport),
    };
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
    doc.history.push({
      status: params.status,
      changedBy: params.shelterId as never,
      changedAt: new Date(),
    });
    
    await doc.save();
    return doc;
  },

  // ----- Shelter Profile Management -----
  async updateProfile(shelterId: string, patch: Record<string, unknown>) {
    const allowed = ['name', 'contactNumber', 'address', 'location', 'operatingRadiusMeters', 'email'];
    const update = Object.fromEntries(
      Object.entries(patch)
        .filter(([k]) => allowed.includes(k))
        .map(([k, v]) => {
          // Convert location from LatLng to GeoPoint if present
          if (k === 'location' && v && typeof v === 'object' && 'latitude' in v) {
            return [k, latLngToGeoPoint(v as any)];
          }
          return [k, v];
        })
    );
    
    const shelter = await Shelter.findByIdAndUpdate(shelterId, update, { new: true });
    return shelter ? serializeShelter(shelter) : null;
  },

  // ----- Notification Management -----
  async listNotifications(shelterId: string) {
    const notifications = await Notification.find({
      audienceType: 'shelter',
      audienceId: shelterId,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return notifications.map(serializeNotification);
  },

  async markNotificationRead(shelterId: string, id: string) {
    const notif = await Notification.findOneAndUpdate(
      { _id: id, audienceType: 'shelter', audienceId: shelterId },
      { isRead: true },
      { new: true },
    );
    if (!notif) throw ApiError.notFound('Notification not found');
    return serializeNotification(notif);
  },
};
