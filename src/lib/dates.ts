/**
 * Date helpers. A "local date" is the YYYY-MM-DD calendar day in the user's IANA timezone.
 * Daily totals are grouped by the local date recorded when a meal was eaten, so a meal at
 * 23:30 in Algiers belongs to that day even though it is 22:30 UTC.
 */

export type LocalDate = string; // YYYY-MM-DD

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalDate(s: string): s is LocalDate {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function safeTimeZone(tz: string | null | undefined): string {
  return tz && isValidTimeZone(tz) ? tz : 'UTC';
}

function parts(instant: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const p: Record<string, string> = {};
  for (const { type, value } of f.formatToParts(instant)) p[type] = value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Calendar date of an instant in a timezone. */
export function localDateFor(instant: Date, timeZone: string): LocalDate {
  const p = parts(instant, safeTimeZone(timeZone));
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Hour of day (0–23) of an instant in a timezone. */
export function localHourFor(instant: Date, timeZone: string): number {
  return parts(instant, safeTimeZone(timeZone)).hour;
}

/** Local time HH:MM of an instant in a timezone. */
export function localTimeFor(instant: Date, timeZone: string): string {
  const p = parts(instant, safeTimeZone(timeZone));
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** Offset in minutes between a timezone and UTC at an instant (e.g. +60 for Africa/Algiers). */
export function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const p = parts(instant, safeTimeZone(timeZone));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** Converts a wall-clock date and time in a timezone to a UTC instant. */
export function zonedTimeToUtc(date: LocalDate, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let offset = timeZoneOffsetMinutes(new Date(guess), timeZone);
  let result = guess - offset * 60000;
  // Second pass handles instants near a DST change.
  const offset2 = timeZoneOffsetMinutes(new Date(result), timeZone);
  if (offset2 !== offset) {
    offset = offset2;
    result = guess - offset * 60000;
  }
  return new Date(result);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday-based week start. */
export function startOfWeek(date: LocalDate): LocalDate {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(date, -dow);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

export function dateRange(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
