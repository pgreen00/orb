import { Component, Host, Prop, State, Watch } from "@stencil/core";

/**
 * Displays a date as a localized phrase relative to now, such as "3 hours ago"
 * or "in 2 days". Localization is handled by `Intl.RelativeTimeFormat`.
 */
@Component({
  tag: "orb-relative-time",
  styleUrl: "relative-time.css",
  shadow: true,
})
export class RelativeTime {
  /**
   * The date to calculate the time from. Defaults to the current date and time.
   * Strings should be ISO 8601 so they parse the same in every browser.
   */
  @Prop() date?: Date | string;

  /** The formatting style to use. */
  @Prop() format: "long" | "short" | "narrow" = "long";

  /** When `auto`, values such as "yesterday" and "tomorrow" are shown when possible. When `always`, values such as "1 day ago" are shown. */
  @Prop() numeric: "always" | "auto" = "auto";

  /** Keep the displayed value up to date as time passes. */
  @Prop() sync = false;

  @State() now = Date.now();
  private timer?: ReturnType<typeof setTimeout>;

  connectedCallback() {
    this.scheduleTick();
  }

  disconnectedCallback() {
    clearTimeout(this.timer);
  }

  @Watch("date")
  handleDateChange() {
    this.now = Date.now();
    this.scheduleTick();
  }

  @Watch("sync")
  handleSyncChange() {
    this.scheduleTick();
  }

  private get target(): number {
    return this.date ? new Date(this.date).getTime() : this.now;
  }

  private scheduleTick() {
    clearTimeout(this.timer);
    if (!this.sync) return;

    const distance = Math.abs(this.target - this.now);
    if (Number.isNaN(distance)) return;

    // Once the phrase is under a minute old it shows seconds, so tick every second.
    const delay = distance < 60_000 ? 1_000 : 60_000;
    this.timer = setTimeout(() => {
      this.now = Date.now();
      this.scheduleTick();
    }, delay);
  }

  private formatted(): string {
    const diff = this.target - this.now;
    if (Number.isNaN(diff)) return "";

    const rtf = new Intl.RelativeTimeFormat(undefined, {
      style: this.format,
      numeric: this.numeric,
    });

    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ["year", 31_536_000_000],
      ["month", 2_629_800_000],
      ["week", 604_800_000],
      ["day", 86_400_000],
      ["hour", 3_600_000],
      ["minute", 60_000],
    ];
    const [unit, ms] = units.find(([, size]) => Math.abs(diff) >= size) ?? [
      "second",
      1_000,
    ];

    return rtf.format(Math.round(diff / ms), unit);
  }

  render() {
    const target = this.target;
    const dateTime = Number.isNaN(target)
      ? undefined
      : new Date(target).toISOString();

    return (
      <Host>
        <time dateTime={dateTime}>{this.formatted()}</time>
      </Host>
    );
  }
}
