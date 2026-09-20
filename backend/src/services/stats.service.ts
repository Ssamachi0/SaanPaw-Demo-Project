import { Shelter } from '../models/Shelter';
import { ShelterAnimal } from '../models/ShelterAnimal';
import { LostPetReport } from '../models/LostPetReport';
import { FoundAnimalReport } from '../models/FoundAnimalReport';

const DAY_MS = 24 * 60 * 60 * 1000;

export const statsService = {
  /** City-wide counters, shaped like the shared `DashboardStats`. "Today" is the last 24 hours. */
  async platformStats() {
    const since = new Date(Date.now() - DAY_MS);
    const monthAgo = new Date(Date.now() - 30 * DAY_MS);
    const live = { status: { $in: ['active', 'matched'] }, isHiddenByModeration: false };

    const [lostToday, foundToday, lostLive, foundLive, reunitedReports, reunitedAnimals, underRescue, sheltersOnline] =
      await Promise.all([
        LostPetReport.countDocuments({ reportedAt: { $gte: since }, isHiddenByModeration: false }),
        FoundAnimalReport.countDocuments({ reportedAt: { $gte: since }, isHiddenByModeration: false }),
        LostPetReport.countDocuments(live),
        FoundAnimalReport.countDocuments(live),
        LostPetReport.countDocuments({ status: 'recovered', updatedAt: { $gte: monthAgo } }),
        ShelterAnimal.countDocuments({ caseStatus: 'reunited', updatedAt: { $gte: monthAgo } }),
        ShelterAnimal.countDocuments({ caseStatus: 'under_rescue' }),
        Shelter.countDocuments({ approvalStatus: 'approved' }),
      ]);

    return {
      lostToday,
      foundToday,
      activeReports: lostLive + foundLive,
      reunitedThisMonth: reunitedReports + reunitedAnimals,
      underRescue,
      sheltersOnline,
    };
  },
};
