import type { AnimalReport } from './types';

/** Text helpers, so both surfaces phrase things the same way. */

/** Relative time, e.g. "4h ago". */
export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - +new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * What to call a report. Lost pets have a name; found animals get described.
 * "other" means nothing to a reader, so the breed stands in for it.
 */
export function describeAnimal(
  report: Pick<AnimalReport, 'name' | 'color' | 'breed' | 'animalType'>,
): string {
  if (report.name) return report.name;
  const noun = report.animalType === 'other' ? (report.breed ?? 'animal') : report.animalType;
  const colour = report.color?.trim();
  return colour ? `${colour} ${noun}` : `Unidentified ${noun}`;
}

/** Human-readable case status, e.g. "under_rescue" -> "under rescue". */
export function humanizeStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
