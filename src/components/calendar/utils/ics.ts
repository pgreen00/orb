import { OrbCalendarEvent } from "./types";

/** Escapes TEXT values per RFC 5545 §3.3.11. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/** Folds lines to 75 characters per RFC 5545 §3.1. Continuations start with a space. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(" " + rest);
  return parts.join("\r\n");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** UTC timestamp, such as `20260611T093000Z`. */
function formatUTC(epoch: number): string {
  const d = new Date(epoch);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Local date for all-day events, such as `20260611`. */
function formatDate(epoch: number): string {
  const d = new Date(epoch);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function prop(name: string, value?: string): string[] {
  if (value == null || value === "") return [];
  return [foldLine(`${name}:${value}`)];
}

function buildVEvent(event: OrbCalendarEvent, dtstamp: string): string[] {
  const lines = ["BEGIN:VEVENT"];
  // Overrides share their master's UID and carry a RECURRENCE-ID.
  lines.push(...prop("UID", event.recurrenceParentId ?? event.id));
  lines.push(...prop("DTSTAMP", dtstamp));

  if (event.allDay) {
    lines.push(...prop("DTSTART;VALUE=DATE", formatDate(event.start)));
    lines.push(...prop("DTEND;VALUE=DATE", formatDate(event.end)));
  } else {
    lines.push(...prop("DTSTART", formatUTC(event.start)));
    lines.push(...prop("DTEND", formatUTC(event.end)));
  }

  lines.push(...prop("SUMMARY", escapeText(event.title ?? "")));
  lines.push(...prop("LOCATION", event.location && escapeText(event.location)));
  lines.push(...prop("DESCRIPTION", event.notes && escapeText(event.notes)));
  lines.push(...prop("URL", event.url));

  if (event.recurrence && !event.recurrenceParentId) {
    lines.push(...prop("RRULE", event.recurrence));
    for (const ex of event.recurrenceExceptions ?? []) {
      lines.push(...prop("EXDATE", formatUTC(ex)));
    }
  }
  if (event.recurrenceParentId && event.recurrenceId != null) {
    lines.push(...prop("RECURRENCE-ID", formatUTC(event.recurrenceId)));
  }

  lines.push("END:VEVENT");
  return lines;
}

export interface BuildICSOptions {
  calendarIds?: string[];
  /** Export timestamp (epoch ms). */
  now: number;
}

/** Serializes events into a VCALENDAR string. */
export function buildICS(
  events: OrbCalendarEvent[],
  opts: BuildICSOptions,
): string {
  const dtstamp = formatUTC(opts.now);
  const filtered = opts.calendarIds
    ? events.filter((e) => e.calendarId && opts.calendarIds!.includes(e.calendarId))
    : events;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Orb//orb-calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const event of filtered) {
    lines.push(...buildVEvent(event, dtstamp));
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
