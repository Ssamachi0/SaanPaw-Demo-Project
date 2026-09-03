export const ROLES = ['developer', 'shelter_admin', 'user'] as const;
export type Role = (typeof ROLES)[number];

export const ANIMAL_TYPES = ['dog', 'cat', 'other'] as const;

/** Lost / found report lifecycle. */
export const REPORT_STATUSES = ['active', 'matched', 'recovered', 'closed'] as const;

/** Animal case status - exactly the four states named in the proposal scope. */
export const ANIMAL_CASE_STATUSES = [
  'under_rescue',
  'reunited',
  'adopted',
  'inconclusive',
] as const;

export const SHELTER_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;

export const NOTIFICATION_TYPES = [
  'lost_report',
  'found_report',
  'match',
  'message',
  'status_update',
  'moderation',
] as const;
