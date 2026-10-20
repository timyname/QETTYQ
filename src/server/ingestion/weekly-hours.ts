/** Conservative subset of OSM opening_hours. Unsupported holidays, exceptions,
 * seasonal dates, solar times and comments remain unknown, never guessed open.
 * Weekly reported hours are not a live guarantee or an event/session schedule.
 */
export type WeeklyInterval = { weekday: number; from: number; until: number };
const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export function parseWeeklyHours(raw: string | null | undefined): WeeklyInterval[] | null {
  if (!raw || raw.length > 500) return null;
  if (raw.trim() === "24/7") return days.map((_, weekday) => ({ weekday, from: 0, until: 1440 }));
  const result: WeeklyInterval[] = [];
  const closedDays = new Set<number>();
  for (const part of raw.split(";")) {
    const match = part.trim().match(/^((?:Su|Mo|Tu|We|Th|Fr|Sa)(?:-(?:Su|Mo|Tu|We|Th|Fr|Sa))?(?:,(?:Su|Mo|Tu|We|Th|Fr|Sa)(?:-(?:Su|Mo|Tu|We|Th|Fr|Sa))?)*)\s+(off|closed|\d{2}:\d{2}-\d{2}:\d{2}(?:,\d{2}:\d{2}-\d{2}:\d{2})*)$/);
    if (!match) return null;
    const weekdays = new Set<number>();
    for (const span of match[1].split(",")) {
      const [first, last] = span.split("-").map(value => days.indexOf(value));
      for (let offset = 0; offset <= (last === undefined ? 0 : (last - first + 7) % 7); offset++) weekdays.add((first + offset) % 7);
    }
    if (["off", "closed"].includes(match[2])) {
      // Combining overrides with prior intervals is ambiguous in this small parser.
      if (result.some(interval => weekdays.has(interval.weekday))) return null;
      for (const day of weekdays) closedDays.add(day);
      continue;
    }
    for (const range of match[2].split(",")) {
      const [start, end] = range.split("-");
      const minute = (value: string) => { const [h, m] = value.split(":").map(Number); return m > 59 || h > 24 || h === 24 && m !== 0 ? NaN : h * 60 + m; };
      const from = minute(start), until = minute(end);
      if (!Number.isFinite(from) || !Number.isFinite(until) || from >= 1440 || from === until) return null;
      for (const weekday of weekdays) {
        if (closedDays.has(weekday) || until < from && until > 0 && closedDays.has((weekday + 1) % 7)) return null;
        if (until > from) result.push({ weekday, from, until });
        else { result.push({ weekday, from, until: 1440 }); if (until) result.push({ weekday: (weekday + 1) % 7, from: 0, until }); }
      }
    }
  }
  return result;
}
export function weeklyOpeningStatus(raw: string | null | undefined, start: number, end: number, fetchedAt?: string): "open" | "closed" | "unknown" {
  const intervals = parseWeeklyHours(raw);
  if (!intervals || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 86_400_000
    || fetchedAt && (!Number.isFinite(Date.parse(fetchedAt)) || Date.parse(fetchedAt) > start || start - Date.parse(fetchedAt) > 7 * 86_400_000)) return "unknown";
  // Astana's fixed UTC+05:00; no local host timezone or DST inference.
  const localStart = new Date(start + 5 * 3_600_000), localEnd = new Date(end + 5 * 3_600_000);
  const startDay = localStart.getUTCDay(), minute = (date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const covers = (day: number, from: number, until: number) => {
    if (until <= from) return true;
    let covered = from;
    for (const slot of intervals.filter(slot => slot.weekday === day).sort((a, b) => a.from - b.from)) {
      if (slot.from > covered) break;
      covered = Math.max(covered, slot.until);
      if (covered >= until) return true;
    }
    return false;
  };
  if (localStart.toISOString().slice(0, 10) === localEnd.toISOString().slice(0, 10)) return covers(startDay, minute(localStart), minute(localEnd)) ? "open" : "closed";
  return covers(startDay, minute(localStart), 1440) && covers(localEnd.getUTCDay(), 0, minute(localEnd)) ? "open" : "closed";
}
