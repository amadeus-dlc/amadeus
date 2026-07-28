// amadeus-mirror-timestamp.ts — canonical Mirror timestamp parsing.
//
// Accepts the exact RFC 3339 grammar used by the Mirror wire codec and rejects
// calendar or clock rollover before converting the value to an epoch.

const RFC3339_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):(\d{2}))$/;

type TimestampParts = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  fraction: string | undefined;
  offsetSign: string | undefined;
  offsetHour: number;
  offsetMinute: number;
}>;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11
    ? 30
    : 31;
}

function parseTimestampParts(value: string): TimestampParts | null {
  const match = RFC3339_RE.exec(value);
  if (match === null) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
    fraction: match[7],
    offsetSign: match[9],
    offsetHour: Number(match[10] ?? 0),
    offsetMinute: Number(match[11] ?? 0),
  };
}

function inRange(value: number, minimum: number, maximum: number): boolean {
  return value >= minimum && value <= maximum;
}

function validTimestampParts(parts: TimestampParts): boolean {
  if (!inRange(parts.month, 1, 12)) return false;
  if (!inRange(parts.day, 1, daysInMonth(parts.year, parts.month))) return false;
  if (!inRange(parts.hour, 0, 23)) return false;
  if (!inRange(parts.minute, 0, 59)) return false;
  if (!inRange(parts.second, 0, 60)) return false;
  if (!inRange(parts.offsetHour, 0, 23)) return false;
  return inRange(parts.offsetMinute, 0, 59);
}

function timestampEpoch(parts: TimestampParts): number {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, Math.min(parts.second, 59), 0);
  const fractionMs =
    parts.fraction === undefined ? 0 : Number(`0.${parts.fraction}`) * 1000;
  const leapSecondMs = parts.second === 60 ? 1000 : 0;
  const offsetMs =
    (parts.offsetHour * 60 + parts.offsetMinute) * 60_000 *
    (parts.offsetSign === "-" ? -1 : 1);
  return date.getTime() + fractionMs + leapSecondMs - offsetMs;
}

export function mirrorTimestampEpoch(value: string): number | null {
  const parts = parseTimestampParts(value);
  if (parts === null || !validTimestampParts(parts)) return null;
  const epoch = timestampEpoch(parts);
  return Number.isFinite(epoch) ? epoch : null;
}
