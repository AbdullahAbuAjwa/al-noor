export const centerTimeZone = "Asia/Amman";

const formatters = new Map<string, Intl.DateTimeFormat>();

function wallClockParts(instant: number, timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(instant))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return parts as Record<
    "year" | "month" | "day" | "hour" | "minute" | "second",
    number
  >;
}

// Milliseconds the zone's wall clock is ahead of UTC at a given instant.
function offsetAt(instant: number, timeZone: string) {
  const p = wallClockParts(instant, timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(instant / 1000) * 1000;
}

// "YYYY-MM-DDTHH:mm" as read on a clock in `timeZone` -> the UTC instant.
// Returns null for malformed input and for wall times skipped by a clock change.
export function zonedInputToDate(
  value: string,
  timeZone = centerTimeZone,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (year < 2000 || year > 2100) return null;
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = asUtc - offsetAt(asUtc, timeZone);
  instant = asUtc - offsetAt(instant, timeZone);
  // Round-trip check rejects impossible dates (e.g. 02-30) and DST gaps.
  return toZonedInput(new Date(instant), timeZone) === value
    ? new Date(instant)
    : null;
}

// UTC instant -> "YYYY-MM-DDTHH:mm" on the zone's clock (for datetime-local).
export function toZonedInput(date: Date, timeZone = centerTimeZone): string {
  const p = wallClockParts(date.getTime(), timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
