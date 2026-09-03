import { env } from '../config/env';
import { ModerationFlag } from '../models/ModerationFlag';
import { User } from '../models/User';
import { LostPetReport } from '../models/LostPetReport';
import { FoundAnimalReport } from '../models/FoundAnimalReport';
import { logger } from '../utils/logger';

/**
 * Report Monitoring - AI auto-flagging.
 *
 * `screenReport` runs cheap heuristics now and leaves a hook for a real
 * text/image classifier. When a reporter accumulates >= ban threshold actioned
 * flags, `escalateReporter` bans the account (Developer can still override).
 */
const BANNED_PHRASES = ['test test', 'asdf', 'not real', 'lorem ipsum'];

export const moderationService = {
  async screenReport(params: {
    reportType: 'lost' | 'found';
    reportId: string;
    reporterId: string;
    text: string;
    imageCount: number;
  }): Promise<void> {
    let confidence = 0;
    const lower = params.text.toLowerCase();
    if (BANNED_PHRASES.some((p) => lower.includes(p))) confidence += 0.6;
    if (params.imageCount === 0) confidence += 0.25;
    if (params.text.trim().length < 15) confidence += 0.2;

    // TODO: call a real NSFW / spam classifier and add to `confidence`.

    if (confidence >= 0.5) {
      await ModerationFlag.create({
        reportType: params.reportType,
        reportId: params.reportId,
        reporterId: params.reporterId,
        reason: 'ai_false_positive',
        aiConfidence: Math.min(confidence, 1),
      });
      logger.warn(`moderation: flagged ${params.reportType} ${params.reportId} (conf ${confidence.toFixed(2)})`);
    }
  },

  /** Called by the Developer controller after actioning a flag. */
  async escalateReporter(reporterId: string): Promise<{ banned: boolean }> {
    const actioned = await ModerationFlag.countDocuments({
      reporterId,
      status: 'actioned',
    });
    if (actioned >= env.moderation.falseReportBanThreshold) {
      await User.findByIdAndUpdate(reporterId, { isBanned: true });
      await Promise.all([
        LostPetReport.updateMany({ reporterId }, { isHiddenByModeration: true }),
        FoundAnimalReport.updateMany({ reporterId }, { isHiddenByModeration: true }),
      ]);
      return { banned: true };
    }
    return { banned: false };
  },
};
