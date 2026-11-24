import type { OrbCalendarEvent, OrbCalendarSource } from "./types";
import { nextDay } from "./datetime";

const HOUR = 60 * 60 * 1000;

/**
 * A property of a child element, or else its attribute. Before the element is
 * upgraded, only the attribute is there. A number property is an epoch time.
 */
function read(el: HTMLElement, prop: string, attribute = prop): string | undefined {
  const value = (el as unknown as Record<string, unknown>)[prop];
  if (typeof value === "string") return value || undefined;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : undefined;
  return el.getAttribute(attribute) ?? undefined;
}

/**
 * A boolean property of a child element, or else its attribute. The attribute
 * reads as Stencil reads a boolean one: `"false"` is off, and any other value
 * is on.
 */
function flag(el: HTMLElement, prop: string, attribute = prop): boolean {
  const value = (el as unknown as Record<string, unknown>)[prop];
  if (typeof value === "boolean") return value;
  const text = el.getAttribute(attribute);
  return text !== null && text !== "false";
}

const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, "0");

/**
 * A time from markup, as epoch ms. Accepts:
 * - ISO 8601 with an offset or `Z`, such as `2026-06-08T09:00Z`
 * - ISO 8601 without one, which is local, such as `2026-06-08T09:00`
 * - a date alone, which is local midnight, such as `2026-06-08`
 * - epoch ms, such as `1780923600000`
 *
 * Forms without an offset are read field by field, because `Date.parse` reads a
 * date alone as UTC. Returns `undefined` when the value isn't a time.
 */
export function parseTime(value: string | number | null | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const text = value.trim();
  if (!text) return undefined;
  if (/^-?\d+$/.test(text)) return Number(text);
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (date) return localTime(+date[1], +date[2], +date[3]);
  const local = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(text);
  if (local) {
    const [y, mo, d, h, mi] = local.slice(1, 6).map(Number);
    const s = Number(local[6] ?? 0);
    const ms = Number((local[7] ?? "0").padEnd(3, "0"));
    return localTime(y, mo, d, h, mi, s, ms);
  }
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function localTime(y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0) {
  // Rejects field values that would land on another time, like month 13 or
  // hour 25, rather than letting `Date` roll them over
  const day = new Date(y, mo - 1, d);
  const valid =
    mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && h <= 23 && mi <= 59 && s <= 59 && ms <= 999 &&
    day.getMonth() === mo - 1 &&
    day.getDate() === d;
  return valid ? new Date(y, mo - 1, d, h, mi, s, ms).getTime() : undefined;
}

/**
 * A time for markup, in the format the calendar writes: a date alone for an
 * all-day event, else local time with its offset, such as
 * `2026-06-08T10:00-04:00`. Seconds and milliseconds are written only when they
 * aren't zero, so a round trip keeps the exact time.
 */
export function formatTime(epoch: number, allDay = false): string {
  const d = new Date(epoch);
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (allDay) return date;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const seconds = d.getSeconds() ? `:${pad(d.getSeconds())}` : "";
  const ms = d.getMilliseconds() ? `.${pad(d.getMilliseconds(), 3)}` : "";
  // getTimezoneOffset is minutes behind UTC, so the sign is reversed
  const offset = -d.getTimezoneOffset();
  const zone = `${offset < 0 ? "-" : "+"}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
  return `${date}T${time}${seconds}${ms}${zone}`;
}

/** A source from its element */
export function readSource(el: HTMLElement): OrbCalendarSource {
  return {
    id: el.id,
    name: read(el, "name") ?? el.id,
    color: read(el, "color") ?? "primary",
    href: read(el, "href"),
    // The global attribute, so a source can start hidden in markup
    hidden: el.hasAttribute("hidden"),
  };
}

/**
 * An event, for the markup: the model the calendar keeps for the children it
 * has been told about. Its `id` can be empty, and so can its title, while the
 * user hasn't named a new event yet.
 */
export type OrbCalendarMarkupEvent = Omit<OrbCalendarEvent, "id" | "title"> & {
  id?: string;
  title?: string;
};

/**
 * An event from its element, or `undefined` when it has no usable `start`. The
 * title is the element's text. A missing `end` is a day for an all-day event,
 * and an hour otherwise.
 */
export function readEvent(el: HTMLElement): OrbCalendarMarkupEvent | undefined {
  const allDay = flag(el, "allDay", "all-day");
  const start = parseTime(read(el, "start"));
  if (start == null) return undefined;
  const end = parseTime(read(el, "end")) ?? (allDay ? nextDay(start) : start + HOUR);
  const exceptions = read(el, "recurrenceExceptions", "recurrence-exceptions")
    ?.split(/\s+/)
    .map((time) => parseTime(time))
    .filter((time): time is number => time != null);
  const recurrenceId = parseTime(read(el, "recurrenceId", "recurrence-id"));
  return {
    id: el.id,
    title: (el.textContent ?? "").trim(),
    start,
    end,
    allDay,
    calendarId: read(el, "calendarId", "calendar-id"),
    location: read(el, "location"),
    notes: read(el, "notes"),
    url: read(el, "url"),
    recurrence: read(el, "recurrence"),
    recurrenceExceptions: exceptions?.length ? exceptions : undefined,
    recurrenceParentId: read(el, "recurrenceParentId", "recurrence-parent-id"),
    recurrenceId,
    color: read(el, "color"),
    readonly: flag(el, "readonly"),
  };
}

/** A detached `orb-calendar-event` for an event, with only the attributes it has */
export function createEventElement(event: OrbCalendarEvent, doc: Document = document): HTMLElement {
  // A plain element, so the module doesn't depend on the tag's generated type
  const el = doc.createElement("orb-calendar-event") as HTMLElement;
  writeEvent(el, event);
  return el;
}

/**
 * Writes an event's data onto its element, as attributes, properties, and text,
 * so it works before the child upgrades and the markup stays the saved state. A
 * field is written only when it means something different from what the element
 * says now, so the app's own spelling of a time, a flag, or a title is kept.
 * Returns whether anything changed.
 */
export function writeEvent(el: HTMLElement, event: OrbCalendarMarkupEvent): boolean {
  const allDay = !!event.allDay;
  let changed = setField(el, "id", event.id || undefined);

  let now = readEvent(el);
  if (!!now?.allDay !== allDay) {
    changed = setField(el, "all-day", allDay ? "" : undefined, "allDay", allDay) || changed;
  }
  if (now?.start !== event.start) {
    const text = formatTime(event.start, allDay);
    changed = setField(el, "start", text, "start", text) || changed;
  }

  // Read again, since an end that the markup doesn't give follows the start
  now = readEvent(el);
  if (now?.end !== event.end) {
    const text = formatTime(event.end, allDay);
    changed = setField(el, "end", text, "end", text) || changed;
  }
  if (!sameTimes(now?.recurrenceExceptions, event.recurrenceExceptions)) {
    const text = event.recurrenceExceptions?.length
      ? event.recurrenceExceptions.map((time) => formatTime(time, allDay)).join(" ")
      : undefined;
    changed = setField(el, "recurrence-exceptions", text, "recurrenceExceptions", text) || changed;
  }
  if (now?.recurrenceId !== (event.recurrenceId ?? undefined)) {
    const text = event.recurrenceId == null ? undefined : formatTime(event.recurrenceId, allDay);
    changed = setField(el, "recurrence-id", text, "recurrenceId", text) || changed;
  }

  changed = writeText(el, "calendar-id", "calendarId", now?.calendarId, event.calendarId) || changed;
  changed = writeText(el, "location", "location", now?.location, event.location) || changed;
  changed = writeText(el, "notes", "notes", now?.notes, event.notes) || changed;
  changed = writeText(el, "url", "url", now?.url, event.url) || changed;
  changed = writeText(el, "color", "color", now?.color, event.color) || changed;
  changed = writeText(el, "recurrence", "recurrence", now?.recurrence, event.recurrence) || changed;
  changed =
    writeText(el, "recurrence-parent-id", "recurrenceParentId", now?.recurrenceParentId, event.recurrenceParentId) ||
    changed;
  if (!!now?.readonly !== !!event.readonly) {
    changed = setField(el, "readonly", event.readonly ? "" : undefined, "readonly", !!event.readonly) || changed;
  }

  const title = (event.title ?? "").trim();
  if ((now?.title ?? "") !== title) {
    el.textContent = title;
    changed = true;
  }
  return changed;
}

/**
 * Sets an attribute to `text`, or removes it when `text` is undefined. Also sets
 * the property that reads it, when the element has one. Returns whether either
 * changed.
 */
function setField(el: HTMLElement, attr: string, text?: string, prop?: string, value?: string | boolean): boolean {
  let changed = false;
  if (text === undefined) {
    if (el.hasAttribute(attr)) {
      el.removeAttribute(attr);
      changed = true;
    }
  } else if (el.getAttribute(attr) !== text) {
    el.setAttribute(attr, text);
    changed = true;
  }
  // The property is set too, since it's what reads the field once the element has upgraded
  if (prop && prop in el) {
    const props = el as unknown as Record<string, unknown>;
    if (props[prop] !== value) {
      props[prop] = value;
      changed = true;
    }
  }
  return changed;
}

/** Writes a text field, when the value it has now means something different */
function writeText(
  el: HTMLElement,
  attr: string,
  prop: string,
  current: string | undefined,
  wanted: string | undefined,
): boolean {
  const text = wanted || undefined;
  if (current === text) return false;
  return setField(el, attr, text, prop, text);
}

function sameTimes(a: number[] | undefined, b: number[] | undefined): boolean {
  const x = a ?? [];
  const y = b ?? [];
  return x.length === y.length && x.every((time, i) => time === y[i]);
}
