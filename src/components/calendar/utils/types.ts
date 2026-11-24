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
  /** Where its events come from, for the range on screen. `{start}` and `{end}` are replaced with the range. */
  href?: string;
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
  /** The `orb-calendar-event` the occurrence is drawn from */
  element: HTMLElement;
}

export interface OrbCalendarMutation {
  /**
   * The new or edited event: the one the user changed. For creates, the calendar
   * gives it an id; for an occurrence, it's that occurrence's data.
   */
  event: OrbCalendarEvent;
  /** For occurrence-scoped edits, the original occurrence start (epoch ms). */
  occurrenceStart?: number;
  /** Which occurrences the change applies to. `single` for events that don't repeat. */
  scope: OrbRecurrenceScope;
}

/**
 * What a change event carries: the mutation, and the element of the event the
 * user acted on. Setting its `id` is how an app gives an event the server's id.
 */
export interface OrbCalendarChangeDetail extends OrbCalendarMutation {
  /** The event's own element, not its occurrences' */
  element: HTMLElement;
}

export interface OrbCalendarRange {
  start: number;
  end: number;
}

/** What a source toggle is about, and the state it changes to */
export interface OrbCalendarSourceToggleDetail {
  /** The source's `id` */
  id: string;
  /** The source's name, for messages such as "Work is hidden" */
  name: string;
  /** The state it changes to */
  hidden: boolean;
  /** The `orb-calendar-source` element the calendar writes `hidden` on */
  source?: HTMLElement;
}

/** What a source is about to load, before its request goes out */
export interface OrbCalendarSourceLoadDetail {
  /** The source's `id` */
  id: string;
  /** The `orb-calendar-source` element whose `href` is requested */
  source: HTMLElement;
  /** The first moment of the range, epoch ms */
  start: number;
  /** The moment after the range, epoch ms, not included in it */
  end: number;
  /** The URL the request goes to */
  url: string;
}
