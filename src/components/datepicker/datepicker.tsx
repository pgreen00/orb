import {
  Component,
  Element,
  Event,
  EventEmitter,
  Fragment,
  Host,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  max as latest,
  min as earliest,
  set,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleChevronLeftIcon,
  DoubleChevronRightIcon,
} from "../../utils/icons";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type TimeColumn = "hour" | "minute" | "second";

/**
 * An inline date and time picker. It renders a month calendar and/or time
 * columns and reports the selected value as epoch milliseconds. It fills the
 * width of its container, so it works inline, inside an `orb-card`, or as the
 * content of an `orb-popover`.
 *
 * The day grid and each time column use a roving tabindex: one button in each
 * is in the Tab order, and arrow keys move between the rest.
 *
 * @part header - The month and year navigation row
 * @part weekdays - The row of weekday names
 * @part days - The grid of days
 * @part day - Each day button
 * @part timepicker - The time row
 * @part time-trigger - The button that opens the time columns
 * @part time-column - Each column of hours, minutes, or seconds
 */
@Component({
  tag: "orb-datepicker",
  styleUrl: "datepicker.css",
  shadow: true,
})
export class Datepicker {
  @Element() el!: HTMLOrbDatepickerElement;
  private popoverEl?: HTMLOrbPopoverElement;
  private triggerEl?: HTMLButtonElement;
  private focusDayAfterRender = false;
  private focusTimeAfterRender?: TimeColumn;

  /** The month being shown, independent of the selected value. */
  @State() currentDate = new Date();

  /** Whether the time popover is open, for the trigger's `aria-expanded`. */
  @State() timeOpen = false;

  /** The day the user last moved to with the keyboard or clicked. */
  @State() focusedDate?: Date;

  /** The value in each time column the user last moved to or clicked. */
  @State() focusedTime: Partial<Record<TimeColumn, number>> = {};

  /**
   * Which controls to show: a calendar (`date`), a calendar and time
   * (`datetime`), or just time (`time`)
   */
  @Prop() type: "date" | "datetime" | "time" = "datetime";

  /**
   * Includes a seconds column in the time picker
   */
  @Prop() includeSeconds = false;

  /**
   * Earliest selectable instant (epoch ms). Days before its day are disabled.
   */
  @Prop() min?: number;

  /**
   * Latest selectable instant (epoch ms). Days after its day are disabled.
   */
  @Prop() max?: number;

  /**
   * Disables individual days. Return `true` to disable the given date.
   */
  @Prop() isDateDisabled?: (date: Date) => boolean;

  /**
   * The selected value (epoch ms)
   */
  @Prop({ mutable: true }) value?: number;

  /**
   * Emitted when the user changes the value. Detail is the new value in epoch
   * milliseconds.
   */
  @Event() orbValueChange: EventEmitter<number | undefined>;

  componentWillLoad() {
    this.showValueMonth();
  }

  componentDidRender() {
    const root = this.el.shadowRoot;
    if (this.focusDayAfterRender) {
      this.focusDayAfterRender = false;
      root
        .querySelector<HTMLElement>('.days-grid button[tabindex="0"]')
        ?.focus();
    }
    if (this.focusTimeAfterRender) {
      const column = this.focusTimeAfterRender;
      this.focusTimeAfterRender = undefined;
      root
        .querySelector<HTMLElement>(
          `.time-column[data-column="${column}"] button[tabindex="0"]`,
        )
        ?.focus();
    }
  }

  @Watch("value")
  valueChangeHandler() {
    this.showValueMonth();
  }

  private get selectedDate() {
    return this.value != null ? new Date(this.value) : undefined;
  }

  private showValueMonth() {
    if (this.value != null) this.currentDate = new Date(this.value);
  }

  private nextMonth = () => {
    this.currentDate = addMonths(this.currentDate, 1);
  };

  private prevMonth = () => {
    this.currentDate = subMonths(this.currentDate, 1);
  };

  private nextYear = () => {
    this.currentDate = addMonths(this.currentDate, 12);
  };

  private prevYear = () => {
    this.currentDate = subMonths(this.currentDate, 12);
  };

  private setValue(opts: {
    day?: Date;
    hour?: number;
    minute?: number;
    second?: number;
  }) {
    const newValue = set(this.value ?? new Date(), {
      year: opts.day?.getFullYear(),
      month: opts.day?.getMonth(),
      date: opts.day?.getDate(),
      hours: opts.hour,
      minutes: opts.minute,
      seconds: opts.second,
    });
    this.value = newValue.getTime();
    this.orbValueChange.emit(this.value);
  }

  private isDisabled(day: Date) {
    return (
      !!this.isDateDisabled?.(day) ||
      (this.min != null && isBefore(day, startOfDay(this.min))) ||
      (this.max != null && isAfter(day, this.max))
    );
  }

  /**
   * The day in the Tab order: the day last moved to if it's in the shown
   * month, otherwise the selected day, today, or the first of the month.
   */
  private get tabbableDay() {
    const inMonth = (date?: Date) =>
      !!date && isSameMonth(date, this.currentDate);
    if (inMonth(this.focusedDate)) return this.focusedDate;
    if (inMonth(this.selectedDate)) return this.selectedDate;
    const today = new Date();
    if (inMonth(today)) return today;
    return startOfMonth(this.currentDate);
  }

  private onDayClick(day: Date) {
    this.focusedDate = day;
    if (!this.isDisabled(day)) this.setValue({ day });
  }

  /**
   * Arrow keys move by a day or a week, Home and End go to the start and end
   * of the week, and Page Up and Page Down change the month (the year with
   * Shift). Moving past the shown month switches to the new month. Enter and
   * Space select the day through the native button.
   */
  private onDayKeyDown(e: KeyboardEvent, day: Date) {
    const rtl = getComputedStyle(this.el).direction === "rtl";
    const monthStart = startOfMonth(day);
    const monthEnd = startOfDay(endOfMonth(day));
    let next: Date;
    switch (e.key) {
      case "ArrowLeft":
        next = addDays(day, rtl ? 1 : -1);
        break;
      case "ArrowRight":
        next = addDays(day, rtl ? -1 : 1);
        break;
      case "ArrowUp":
        next = addDays(day, -7);
        break;
      case "ArrowDown":
        next = addDays(day, 7);
        break;
      case "Home":
        next = latest([startOfWeek(day), monthStart]);
        break;
      case "End":
        next = earliest([startOfDay(endOfWeek(day)), monthEnd]);
        break;
      case "PageUp":
        next = e.shiftKey ? addYears(day, -1) : addMonths(day, -1);
        break;
      case "PageDown":
        next = e.shiftKey ? addYears(day, 1) : addMonths(day, 1);
        break;
      default:
        return;
    }
    e.preventDefault();
    this.focusedDate = next;
    this.currentDate = next;
    this.focusDayAfterRender = true;
  }

  private onTimeClick(column: TimeColumn, n: number) {
    this.focusedTime = { ...this.focusedTime, [column]: n };
    this.setValue({ [column]: n });
  }

  /**
   * Up and Down move through a column, wrapping at the ends. Home and End go
   * to the first and last value. Escape closes the popover. Enter and Space
   * select the value through the native button.
   */
  private onTimeKeyDown(
    e: KeyboardEvent,
    column: TimeColumn,
    count: number,
    n: number,
  ) {
    let next: number;
    switch (e.key) {
      case "ArrowUp":
        next = (n - 1 + count) % count;
        break;
      case "ArrowDown":
        next = (n + 1) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      case "Escape":
        e.preventDefault();
        this.popoverEl?.hide();
        return;
      default:
        return;
    }
    e.preventDefault();
    this.focusedTime = { ...this.focusedTime, [column]: next };
    this.focusTimeAfterRender = column;
  }

  /** Centers each column on its selected value, then focuses the first column. */
  private onTimePresentEnd = () => {
    const columns =
      this.el.shadowRoot.querySelectorAll<HTMLElement>(".time-column");
    columns.forEach((column) => {
      const selected = column.querySelector<HTMLElement>(".selected");
      if (!selected) return;
      column.scrollTop =
        selected.offsetTop -
        column.clientHeight / 2 +
        selected.offsetHeight / 2;
    });
    columns[0]
      ?.querySelector<HTMLElement>('button[tabindex="0"]')
      ?.focus({ preventScroll: true });
  };

  /** Returns focus to the trigger so it isn't lost when the columns hide. */
  private onTimeDismissStart = () => {
    this.timeOpen = false;
    this.focusedTime = {};
    const active = this.el.shadowRoot.activeElement;
    if (active?.closest(".timepicker-content")) this.triggerEl?.focus();
  };

  private renderCalendar() {
    const firstDayOfMonth = startOfMonth(this.currentDate);
    const lastDayOfMonth = endOfMonth(this.currentDate);
    const daysInMonth = eachDayOfInterval({
      start: firstDayOfMonth,
      end: lastDayOfMonth,
    });

    // Days from the neighboring months that fill out the first and last weeks.
    const leadingCount = getDay(firstDayOfMonth);
    const leadingDays = Array.from({ length: leadingCount }, (_, i) =>
      addDays(firstDayOfMonth, i - leadingCount),
    );
    const trailingDays = Array.from(
      { length: 6 - getDay(lastDayOfMonth) },
      (_, i) => addDays(lastDayOfMonth, i + 1),
    );
    const selected = this.selectedDate;
    const tabbable = this.tabbableDay;

    return (
      <Fragment>
        <div part="header" class="header">
          <orb-button
            fill="clear"
            size="sm"
            class="icon-only"
            aria-label="Previous year"
            onClick={this.prevYear}
          >
            <DoubleChevronLeftIcon />
          </orb-button>
          <orb-button
            fill="clear"
            size="sm"
            class="icon-only"
            aria-label="Previous month"
            onClick={this.prevMonth}
          >
            <ChevronLeftIcon />
          </orb-button>
          <span aria-live="polite">{format(this.currentDate, "MMMM yyyy")}</span>
          <orb-button
            fill="clear"
            size="sm"
            class="icon-only"
            aria-label="Next month"
            onClick={this.nextMonth}
          >
            <ChevronRightIcon />
          </orb-button>
          <orb-button
            fill="clear"
            size="sm"
            class="icon-only"
            aria-label="Next year"
            onClick={this.nextYear}
          >
            <DoubleChevronRightIcon />
          </orb-button>
        </div>

        <orb-divider spacing="sm" />

        <div part="weekdays" class="weekdays-grid" aria-hidden="true">
          {daysOfWeek.map((day) => (
            <div>{day}</div>
          ))}
        </div>

        <orb-divider spacing="sm" />

        <div part="days" class="days-grid">
          {leadingDays.map((day) => (
            <span class="day outside" aria-hidden="true">
              {format(day, "d")}
            </span>
          ))}

          {daysInMonth.map((day) => {
            const isSelected = !!selected && isSameDay(day, selected);
            const today = isToday(day);
            // aria-disabled instead of disabled keeps the day focusable, so
            // arrow keys can move across it.
            const disabled = this.isDisabled(day);
            return (
              <button
                type="button"
                part="day"
                class={{ day: true, selected: isSelected, today }}
                tabindex={isSameDay(day, tabbable) ? 0 : -1}
                aria-disabled={disabled ? "true" : undefined}
                aria-label={format(day, "EEEE, MMMM d, yyyy")}
                aria-pressed={isSelected ? "true" : "false"}
                aria-current={today ? "date" : undefined}
                onClick={() => this.onDayClick(day)}
                onKeyDown={(e) => this.onDayKeyDown(e, day)}
              >
                {format(day, "d")}
              </button>
            );
          })}

          {trailingDays.map((day) => (
            <span class="day outside" aria-hidden="true">
              {format(day, "d")}
            </span>
          ))}
        </div>
      </Fragment>
    );
  }

  private renderTimeColumn(
    column: TimeColumn,
    count: number,
    selectedValue: number | undefined,
    label: string,
    formatValue: (n: number) => string,
  ) {
    const tabbable = this.focusedTime[column] ?? selectedValue ?? 0;
    return (
      <div
        part="time-column"
        class="time-column"
        data-column={column}
        role="group"
        aria-label={label}
      >
        {Array.from({ length: count }, (_, n) => (
          <button
            type="button"
            class={{ time: true, selected: selectedValue === n }}
            tabindex={n === tabbable ? 0 : -1}
            aria-pressed={selectedValue === n ? "true" : "false"}
            onClick={() => this.onTimeClick(column, n)}
            onKeyDown={(e) => this.onTimeKeyDown(e, column, count, n)}
          >
            {formatValue(n)}
          </button>
        ))}
      </div>
    );
  }

  private renderTimepicker() {
    const selected = this.selectedDate;
    const label = selected
      ? format(selected, this.includeSeconds ? "hh:mm:ss a" : "hh:mm a")
      : "-";

    return (
      <div part="timepicker" class="timepicker">
        <span>Time</span>
        <orb-popover
          arrow
          ref={(el) => (this.popoverEl = el)}
          onOrbPresentStart={() => (this.timeOpen = true)}
          onOrbPresentEnd={this.onTimePresentEnd}
          onOrbDismissStart={this.onTimeDismissStart}
        >
          <button
            slot="trigger"
            type="button"
            part="time-trigger"
            class="time-trigger"
            ref={(el) => (this.triggerEl = el)}
            aria-label={`Time: ${label === "-" ? "not set" : label}`}
            aria-expanded={this.timeOpen ? "true" : "false"}
            tabIndex={0}
          >
            <orb-pill>{label}</orb-pill>
          </button>
          <div class="timepicker-content">
            {this.renderTimeColumn(
              "hour",
              24,
              selected?.getHours(),
              "Hour",
              (hour) => format(new Date().setHours(hour), "hh a"),
            )}
            {this.renderTimeColumn(
              "minute",
              60,
              selected?.getMinutes(),
              "Minute",
              (minute) => String(minute).padStart(2, "0"),
            )}
            {this.includeSeconds &&
              this.renderTimeColumn(
                "second",
                60,
                selected?.getSeconds(),
                "Second",
                (second) => String(second).padStart(2, "0"),
              )}
          </div>
        </orb-popover>
      </div>
    );
  }

  render() {
    const showCalendar = this.type === "date" || this.type === "datetime";
    const showTime = this.type === "time" || this.type === "datetime";

    return (
      <Host>
        {showCalendar && this.renderCalendar()}
        {showCalendar && showTime && <orb-divider spacing="sm" />}
        {showTime && this.renderTimepicker()}
      </Host>
    );
  }
}
