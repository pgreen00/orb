import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * A named calendar in an `orb-calendar`, such as Work or Home. Its `id` is the
 * element's `id`, and events join it with their `calendar-id`.
 *
 * It holds data for the calendar and draws nothing itself. The calendar reads
 * the element's attributes, so a source can be written entirely in markup. Give
 * it an `href` and it loads its events from a server, for the range on screen.
 */
@Component({
  tag: "orb-calendar-source",
  shadow: true,
})
export class CalendarSource {
  /** The name shown in the calendar's sidebar */
  @Prop() name?: string;

  /**
   * The color of this calendar's events: an orb token (`primary`), a token and
   * shade (`primary-600`), or any CSS color
   */
  @Prop() color?: string;

  /**
   * Where to load this calendar's events from, for the range on screen. `{start}`
   * and `{end}` are replaced with the range, as local times with their offsets,
   * and URL-encoded. `{end}` is the midnight after the last day shown, so the
   * range runs up to but not including it. The response is HTML of
   * `orb-calendar-event` elements. It includes every recurring event with an
   * occurrence in the range, even one that started before it, and its overrides.
   */
  @Prop() href?: string;

  /** Emitted when the source's data changes, so the calendar can update */
  @Event({ bubbles: true, composed: false }) orbCalendarDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbCalendarDataChange.emit();
  }

  @Watch("name")
  @Watch("color")
  @Watch("href")
  changed() {
    this.orbCalendarDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
