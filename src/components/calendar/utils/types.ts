/** A named calendar, such as Work, Home, or Birthdays. */
export interface OrbCalendarSource {
  /** Stable unique id, referenced by events' `calendarId`. */
  id: string;
  /** Display name shown in the sidebar. */
  name: string;
  /**
   * An orb color token (`primary`, `success`, `warning`, `danger`, `neutral`),
   * a token and shade (`primary-600`), or any CSS color.
   */
  color: string;
  /** When true, this calendar's events are hidden. */
  hidden?: boolean;
}

/**
 * A calendar event. A single object can represent:
 * - a one-off event (no `recurrence`)
 * - a recurring master (`recurrence` set)
 * - an override of one occurrence (`recurrenceParentId` and `recurrenceId` set)
 */
export interface OrbCalendarEvent {
  /** Stable unique id. */
  id: string;
  title: string;
  /** Start time, epoch ms. For all-day events, the start of the first day. */
  start: number;
  /** End time, epoch ms (exclusive). For all-day events, the start of the day after the last day. */
  end: number;
  allDay?: boolean;
  /** Links to an `OrbCalendarSource`. Defaults to the first calendar. */
  calendarId?: string;
  location?: string;
  notes?: string;
  url?: string;
  /** RRULE without the `RRULE:` prefix, such as `FREQ=WEEKLY;BYDAY=MO,WE`. Only on a recurring master. */
  recurrence?: string;
  /** Occurrence start times (epoch ms) to skip. Maps to ICS `EXDATE`. */
  recurrenceExceptions?: number[];
  /** For an override: the master's id. */
  recurrenceParentId?: string;
  /** For an override: the original start (epoch ms) of the occurrence it replaces. Maps to ICS `RECURRENCE-ID`. */
  recurrenceId?: number;
  /** Per-event color, using the same values as `OrbCalendarSource.color`. Defaults to the calendar color. */
  color?: string;
  /** When true, the event can't be dragged, resized, or edited. */
  readonly?: boolean;
}

/** A concrete instance of an event, produced internally for rendering. */
export interface OrbCalendarOccurrence {
  /** The effective event data: the master, or the override replacing it. */
  event: OrbCalendarEvent;
  /** Id of the master, or the event id if it doesn't repeat. */
  masterId: string;
  /** This occurrence's start (epoch ms). */
  start: number;
  /** This occurrence's end (epoch ms). */
  end: number;
  /** The original recurrence start, used as the key for overrides and exceptions. */
  occurrenceStart: number;
  isRecurring: boolean;
  isOverride: boolean;
  allDay: boolean;
}

export type OrbCalendarView = "day" | "week" | "month";

export type OrbRecurrenceScope = "single" | "occurrence" | "future" | "all";

export type OrbWeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface OrbCalendarEventClickDetail {
  occurrence: OrbCalendarOccurrence;
  nativeEvent: MouseEvent;
}

export interface OrbCalendarMutation {
  /** The new or edited event. For creates, the host assigns the id. */
  event: OrbCalendarEvent;
  /** For occurrence-scoped edits, the original occurrence start (epoch ms). */
  occurrenceStart?: number;
  /** Which occurrences the change applies to. `single` for events that don't repeat. */
  scope: OrbRecurrenceScope;
}

export interface OrbCalendarRange {
  start: number;
  end: number;
}
