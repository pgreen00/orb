import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * An event in an `orb-calendar`. Its title is its text, and its times are
 * `start` and `end` in ISO 8601 or epoch milliseconds.
 *
 * It holds data for the calendar and draws nothing itself. The calendar reads
 * the element's attributes, so an event can be written entirely in markup:
 *
 * ```html
 * <orb-calendar-event id="standup" calendar-id="work" start="2026-06-08T09:00" end="2026-06-08T09:30">
 *   Standup
 * </orb-calendar-event>
 * ```
 */
@Component({
  tag: "orb-calendar-event",
  shadow: true,
})
export class CalendarEvent {
  /**
   * When the event starts: ISO 8601 with or without an offset, a date alone for
   * local midnight, or epoch milliseconds
   */
  @Prop() start?: string | number;

  /** When the event ends, exclusive. Without one, an all-day event lasts a day and a timed one an hour */
  @Prop() end?: string | number;

  /** Whether the event lasts whole days, from `start` to `end` */
  @Prop() allDay = false;

  /** The `id` of the `orb-calendar-source` the event belongs to */
  @Prop() calendarId?: string;

  /** Where it happens */
  @Prop() location?: string;

  /** Free text about it. May span lines. */
  @Prop() notes?: string;

  /** A link for it */
  @Prop() url?: string;

  /** Its color, overriding the calendar's: a token, a token and shade, or any CSS color */
  @Prop() color?: string;

  /** When true, the event can't be dragged, resized, or edited */
  @Prop() readonly = false;

  /** An RRULE without the `RRULE:` prefix, on a recurring master, such as `FREQ=WEEKLY;BYDAY=MO` */
  @Prop() recurrence?: string;

  /** Start times to skip, separated by spaces. Maps to ICS `EXDATE`. */
  @Prop() recurrenceExceptions?: string;

  /** On an override: the `id` of the master it replaces an occurrence of */
  @Prop() recurrenceParentId?: string;

  /** On an override: the start of the occurrence it replaces */
  @Prop() recurrenceId?: string | number;

  /** Emitted when the event's data changes, so the calendar can update */
  @Event({ bubbles: true, composed: false }) orbCalendarDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbCalendarDataChange.emit();
  }

  @Watch("start")
  @Watch("end")
  @Watch("allDay")
  @Watch("calendarId")
  @Watch("location")
  @Watch("notes")
  @Watch("url")
  @Watch("color")
  @Watch("readonly")
  @Watch("recurrence")
  @Watch("recurrenceExceptions")
  @Watch("recurrenceParentId")
  @Watch("recurrenceId")
  changed() {
    this.orbCalendarDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
