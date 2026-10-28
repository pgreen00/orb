import { RRule } from "rrule";
import {
  OrbCalendarEvent,
  OrbCalendarMutation,
  OrbCalendarOccurrence,
  OrbCalendarRange,
} from "./types";

/**
 * rrule works on UTC field values. To keep recurrences on the wall clock (a
 * 9am event stays at 9am across DST changes), rrule gets a Date whose UTC
 * fields equal the local time, and results are mapped back.
 */
function toNaiveUTC(epoch: number): Date {
  const d = new Date(epoch);
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
    ),
  );
}

function fromNaiveUTC(naive: Date): number {
  return new Date(
    naive.getUTCFullYear(),
    naive.getUTCMonth(),
    naive.getUTCDate(),
    naive.getUTCHours(),
    naive.getUTCMinutes(),
    naive.getUTCSeconds(),
  ).getTime();
}

function buildRule(event: OrbCalendarEvent): RRule | null {
  if (!event.recurrence) return null;
  try {
    const options = RRule.parseString(event.recurrence);
    options.dtstart = toNaiveUTC(event.start);
    return new RRule(options);
  } catch {
    return null;
  }
}

/**
 * Expands events into the occurrences that intersect a range. Recurring
 * masters are expanded with their RRULE, exceptions are skipped, and overrides
 * replace the matching occurrence.
 */
export function expandOccurrences(
  events: OrbCalendarEvent[],
  range: OrbCalendarRange,
): OrbCalendarOccurrence[] {
  const masters = events.filter((e) => e.recurrence && !e.recurrenceParentId);
  const overridesByParent = new Map<string, Map<number, OrbCalendarEvent>>();
  for (const e of events) {
    if (e.recurrenceParentId && e.recurrenceId != null) {
      let m = overridesByParent.get(e.recurrenceParentId);
      if (!m) overridesByParent.set(e.recurrenceParentId, (m = new Map()));
      m.set(e.recurrenceId, e);
    }
  }

  const out: OrbCalendarOccurrence[] = [];

  for (const e of events) {
    if (e.recurrence || e.recurrenceParentId) continue;
    if (e.end > range.start && e.start < range.end) {
      out.push({
        event: e,
        masterId: e.id,
        start: e.start,
        end: e.end,
        occurrenceStart: e.start,
        isRecurring: false,
        isOverride: false,
        allDay: !!e.allDay,
      });
    }
  }

  for (const master of masters) {
    const rule = buildRule(master);
    if (!rule) continue;
    const duration = master.end - master.start;
    const exceptions = new Set(master.recurrenceExceptions ?? []);
    const overrides = overridesByParent.get(master.id);

    // Starting the window early catches long occurrences that begin before the
    // range but overlap it.
    const starts = rule.between(
      toNaiveUTC(range.start - duration),
      toNaiveUTC(range.end),
      true,
    );
    for (const naive of starts) {
      const occStart = fromNaiveUTC(naive);
      if (exceptions.has(occStart)) continue;
      const override = overrides?.get(occStart);
      const data = override ?? master;
      const start = override ? override.start : occStart;
      const end = override ? override.end : occStart + duration;
      if (end <= range.start || start >= range.end) continue;
      out.push({
        event: data,
        masterId: master.id,
        start,
        end,
        occurrenceStart: occStart,
        isRecurring: true,
        isOverride: !!override,
        allDay: !!data.allDay,
      });
    }
  }

  return out.sort((a, b) => a.start - b.start);
}

/** Parses a stored RRULE string into rrule options, for the editor. */
export function parseRRule(
  rule?: string,
): Partial<ReturnType<typeof RRule.parseString>> {
  if (!rule) return {};
  try {
    return RRule.parseString(rule);
  } catch {
    return {};
  }
}

/** The RRULE line from rrule's output, which may also include DTSTART. */
function ruleString(rule: RRule): string {
  const line =
    rule
      .toString()
      .split("\n")
      .find((l) => l.startsWith("RRULE:")) ?? "";
  return line.replace(/^RRULE:/, "");
}

/** Serializes rrule options into an RRULE string without the `RRULE:` prefix. */
export function formatRRule(
  options: Partial<ConstructorParameters<typeof RRule>[0]>,
): string {
  return ruleString(new RRule(options as ConstructorParameters<typeof RRule>[0]));
}

/** Sets or replaces the UNTIL bound of an RRULE string. */
function withUntil(rule: string, untilEpoch: number): string {
  const options = RRule.parseString(rule);
  options.until = toNaiveUTC(untilEpoch);
  options.count = null;
  return ruleString(new RRule(options));
}

/**
 * Applies a mutation from `orbEventCreate`, `orbEventUpdate`, or `orbEventDelete` to an
 * events array, using iCalendar semantics for recurring events: exceptions,
 * overrides, and series splits. Returns a new array and never mutates the
 * input.
 */
export function applyEventChange(
  events: OrbCalendarEvent[],
  mutation: OrbCalendarMutation,
  kind: "create" | "update" | "delete",
): OrbCalendarEvent[] {
  const { event, scope, occurrenceStart } = mutation;

  if (kind === "create") {
    return [...events, event];
  }

  const masterId = event.recurrenceParentId ?? event.id;
  const master = events.find((e) => e.id === masterId);

  if (kind === "delete") {
    switch (scope) {
      case "single":
        return events.filter((e) => e.id !== event.id);
      case "occurrence": {
        if (occurrenceStart == null) return events;
        return events
          .filter(
            (e) =>
              !(
                e.recurrenceParentId === masterId &&
                e.recurrenceId === occurrenceStart
              ),
          )
          .map((e) =>
            e.id === masterId
              ? {
                  ...e,
                  recurrenceExceptions: [
                    ...(e.recurrenceExceptions ?? []),
                    occurrenceStart,
                  ],
                }
              : e,
          );
      }
      case "future": {
        if (occurrenceStart == null || !master?.recurrence) return events;
        return events
          .filter(
            (e) =>
              !(
                e.recurrenceParentId === masterId &&
                (e.recurrenceId ?? 0) >= occurrenceStart
              ),
          )
          .map((e) =>
            e.id === masterId
              ? { ...e, recurrence: withUntil(e.recurrence!, occurrenceStart - 1) }
              : e,
          );
      }
      case "all":
        return events.filter(
          (e) => e.id !== masterId && e.recurrenceParentId !== masterId,
        );
    }
  }

  switch (scope) {
    case "single":
      return events.map((e) => (e.id === event.id ? { ...e, ...event } : e));
    case "occurrence": {
      if (occurrenceStart == null) return events;
      const override: OrbCalendarEvent = {
        ...event,
        // A unique id, so the override never collides with its master.
        id: `${masterId}::${occurrenceStart}`,
        recurrence: undefined,
        recurrenceExceptions: undefined,
        recurrenceParentId: masterId,
        recurrenceId: occurrenceStart,
      };
      const existingIdx = events.findIndex(
        (e) =>
          e.recurrenceParentId === masterId && e.recurrenceId === occurrenceStart,
      );
      if (existingIdx >= 0) {
        const copy = events.slice();
        copy[existingIdx] = { ...copy[existingIdx], ...override };
        return copy;
      }
      return [...events, override];
    }
    case "future": {
      if (occurrenceStart == null || !master?.recurrence) return events;
      const newMaster: OrbCalendarEvent = {
        ...master,
        ...event,
        id: `${masterId}:${occurrenceStart}`,
        recurrenceParentId: undefined,
        recurrenceId: undefined,
        recurrenceExceptions: (master.recurrenceExceptions ?? []).filter(
          (x) => x >= occurrenceStart,
        ),
      };
      return [
        ...events
          // Move overrides at or after the split onto the new master.
          .map((e) =>
            e.recurrenceParentId === masterId &&
            (e.recurrenceId ?? 0) >= occurrenceStart
              ? { ...e, recurrenceParentId: newMaster.id }
              : e,
          )
          // End the original series before the split.
          .map((e) =>
            e.id === masterId
              ? { ...e, recurrence: withUntil(e.recurrence!, occurrenceStart - 1) }
              : e,
          ),
        newMaster,
      ];
    }
    case "all": {
      // Keep the master's rule and apply the changes, including a time shift.
      const delta = master ? event.start - (occurrenceStart ?? master.start) : 0;
      return events.map((e) => {
        if (e.id !== masterId) return e;
        return {
          ...e,
          ...event,
          id: masterId,
          start: e.start + delta,
          end: e.end + delta,
          recurrence: e.recurrence,
        };
      });
    }
  }
}
