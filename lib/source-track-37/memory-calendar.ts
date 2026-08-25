import type { AlbumMomentView } from "@/lib/moment-model";

export const TRACK37_SOURCE_SHA256 = "63ab49382fe9798515bf91bf5683b9224d0902f6f7b041757d8ddcd3dd57750e";
export const TRACK37_SOURCE_BYTES = 36195;

export interface Track37CalendarDay {
  key: string;
  year: number;
  month: number;
  day: number;
  moments: AlbumMomentView[];
}

export interface Track37CalendarMonth {
  key: string;
  year: number;
  month: number;
  days: Track37CalendarDay[];
  momentCount: number;
}

/**
 * Track37 is a presentation lens only. A calendar key is accepted only when
 * canonical Moment data already exposes an explicit YYYY-MM-DD prefix through
 * discoveryDate or timestamp. We intentionally do not synthesize a date from
 * sort order, current time, anniversaries, revisit state, seasons, or source
 * prototype labels.
 */
export function track37AuthoritativeDateValue(moment: Pick<AlbumMomentView, "discoveryDate" | "timestamp">): string {
  return moment.discoveryDate || moment.timestamp || "";
}

export function track37CalendarDateKey(moment: Pick<AlbumMomentView, "discoveryDate" | "timestamp">): string | null {
  const value = track37AuthoritativeDateValue(moment).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function track37ProjectCalendar(moments: readonly AlbumMomentView[]): Track37CalendarMonth[] {
  const dayMap = new Map<string, AlbumMomentView[]>();

  for (const moment of moments) {
    const key = track37CalendarDateKey(moment);
    if (!key) continue;
    const bucket = dayMap.get(key);
    if (bucket) bucket.push(moment);
    else dayMap.set(key, [moment]);
  }

  const days = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucket]) => {
      const [year, month, day] = key.split("-").map(Number);
      return { key, year, month, day, moments: [...bucket] } satisfies Track37CalendarDay;
    });

  const monthMap = new Map<string, Track37CalendarDay[]>();
  for (const day of days) {
    const key = day.key.slice(0, 7);
    const bucket = monthMap.get(key);
    if (bucket) bucket.push(day);
    else monthMap.set(key, [day]);
  }

  return [...monthMap.entries()].map(([key, monthDays]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      key,
      year,
      month,
      days: monthDays,
      momentCount: monthDays.reduce((count, item) => count + item.moments.length, 0),
    } satisfies Track37CalendarMonth;
  });
}

export function track37FlattenDays(months: readonly Track37CalendarMonth[]): Track37CalendarDay[] {
  return months.flatMap((month) => month.days);
}

export function track37AdjacentDateKey(
  days: readonly Track37CalendarDay[],
  currentKey: string | null,
  direction: -1 | 1,
): string | null {
  if (days.length === 0) return null;
  const index = currentKey ? days.findIndex((day) => day.key === currentKey) : -1;
  if (index < 0) return direction > 0 ? days[0].key : days[days.length - 1].key;
  const next = Math.min(days.length - 1, Math.max(0, index + direction));
  return days[next]?.key ?? null;
}

export function track37DateLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}
