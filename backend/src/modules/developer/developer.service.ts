import bcrypt from 'bcryptjs';
import { Shelter } from '../../models/Shelter';
import { LostPetReport } from '../../models/LostPetReport';
import { FoundAnimalReport } from '../../models/FoundAnimalReport';
import { ModerationFlag } from '../../models/ModerationFlag';
import { moderationService } from '../../services/moderation.service';
import { ApiError } from '../../utils/ApiError';

export const developerService = {
  /** Dashboard: daily lost/found stats + pending queues. */
  async getDashboard() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [lostToday, foundToday, pendingShelters, openFlags] = await Promise.all([
      LostPetReport.countDocuments({ reportedAt: { $gte: since } }),
      FoundAnimalReport.countDocuments({ reportedAt: { $gte: since } }),
      Shelter.countDocuments({ approvalStatus: 'pending' }),
      ModerationFlag.countDocuments({ status: 'open' }),
    ]);
    return { lostToday, foundToday, pendingShelters, openFlags };
  },

  // ----- Shelter Approval Management -----
  listPendingShelters() {
    return Shelter.find({ approvalStatus: 'pending' }).sort({ createdAt: 1 }).lean();
  },

  async reviewShelter(params: {
    shelterId: string;
    developerId: string;
    decision: 'approve' | 'reject';
    reason?: string;
    adminEmail?: string;
    temporaryPassword?: string;
  }) {
    const shelter = await Shelter.findById(params.shelterId);
    if (!shelter) throw ApiError.notFound('Shelter not found');

    if (params.decision === 'reject') {
      shelter.approvalStatus = 'rejected';
      shelter.rejectionReason = params.reason;
      await shelter.save();
      return shelter;
    }

    if (!params.adminEmail || !params.temporaryPassword) {
      throw ApiError.badRequest('adminEmail and temporaryPassword are required to approve');
    }
    shelter.approvalStatus = 'approved';
    shelter.approvedBy = params.developerId as never;
    shelter.adminEmail = params.adminEmail.toLowerCase().trim();
    shelter.adminPasswordHash = await bcrypt.hash(params.temporaryPassword, 10);
    await shelter.save();
    return shelter;
  },

  // ----- System Management -----
  async systemConfig() {
    // TODO: surface real config (feature flags, DB health, build version, deploy state).
    return {
      build: process.env.npm_package_version ?? '0.1.0',
      node: process.version,
      uptimeSeconds: Math.round(process.uptime()),
    };
  },

  // ----- Report Monitoring -----
  listFlags(status: 'open' | 'dismissed' | 'actioned' = 'open') {
    return ModerationFlag.find({ status }).sort({ createdAt: -1 }).lean();
  },

  async resolveFlag(params: {
    flagId: string;
    developerId: string;
    action: 'dismiss' | 'remove_report';
    note?: string;
  }) {
    const flag = await ModerationFlag.findById(params.flagId);
    if (!flag) throw ApiError.notFound('Flag not found');

    if (params.action === 'dismiss') {
      flag.status = 'dismissed';
    } else {
      flag.status = 'actioned';
      if (flag.reportType === 'lost') {
        await LostPetReport.findByIdAndUpdate(flag.reportId, { isHiddenByModeration: true });
      } else {
        await FoundAnimalReport.findByIdAndUpdate(flag.reportId, { isHiddenByModeration: true });
      }
    }
    flag.resolvedBy = params.developerId as never;
    flag.resolutionNote = params.note;
    await flag.save();

    const escalation =
      params.action === 'remove_report'
        ? await moderationService.escalateReporter(String(flag.reporterId))
        : { banned: false };

    return { flag, escalation };
  },
};
