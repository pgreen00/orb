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
  h,
} from "@stencil/core";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  format,
  getDay,
  set,
} from "date-fns";

const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"] as const;

@Component({
  tag: "je-datepicker",
  styleUrl: "je-datepicker.css",
  shadow: true,
})
export class JeDatepicker {
  @Element() el!: HTMLJeDatepickerElement;
  @State() currentDate = new Date();
  @Prop() type: "date" | "datetime" | "time" = "datetime";
  @Prop() includeSeconds = false;
  @Prop() min?: number;
  @Prop() max?: number;
  @Prop() isDateDisabled?: (date: Date) => boolean;
  @Prop({ mutable: true }) value?: number;
  @Event() valueChange: EventEmitter<number>;

  componentWillLoad() {
    if (this.value) {
      this.currentDate = new Date(this.value);
    }
  }

  @Watch("value")
  valueChangeHandler() {
    if (this.value) {
      this.currentDate = new Date(this.value);
    }
  }

  nextMonth = () => {
    this.currentDate = addMonths(this.currentDate, 1);
  };

  prevMonth = () => {
    this.currentDate = subMonths(this.currentDate, 1);
  };

  nextYear = () => {
    this.currentDate = addMonths(this.currentDate, 12);
  };

  prevYear = () => {
    this.currentDate = subMonths(this.currentDate, 12);
  };

  setValue = (opts: {
    day?: Date;
    hour?: number;
    minute?: number;
    second?: number;
  }) => {
    const newValue = set(this.value ?? new Date(), {
      year: opts.day?.getFullYear(),
      month: opts.day?.getMonth(),
      date: opts.day?.getDate(),
      hours: opts.hour,
      minutes: opts.minute,
      seconds: opts.second,
    });
    this.value = newValue.getTime();
    this.valueChange.emit(this.value);
  };

  scrollTimeIntoView = () => {
    this.el.shadowRoot
      .querySelectorAll(".timepicker-column")
      .forEach((column) => {
        column
          .querySelector('je-button[color="primary"][fill="solid"]')
          ?.shadowRoot.querySelector("button")
          ?.scrollIntoView({ block: "center", behavior: "instant" });
      });
  };

  render() {
    const firstDayOfMonth = startOfMonth(this.currentDate);
    const lastDayOfMonth = endOfMonth(this.currentDate);
    const daysInMonth = eachDayOfInterval({
      start: firstDayOfMonth,
      end: lastDayOfMonth,
    });

    const prevMonth = subMonths(this.currentDate, 1);
    const prevMonthEnd = endOfMonth(prevMonth);

    const firstDayOfWeek = getDay(firstDayOfMonth);
    const daysBefore = Array.from({ length: firstDayOfWeek }).map((_, i) =>
      subMonths(this.currentDate, 1).setDate(
        prevMonthEnd.getDate() - (firstDayOfWeek - i - 1)
      )
    );

    const lastDayOfWeek = getDay(lastDayOfMonth);
    const daysAfter = Array.from({ length: 6 - lastDayOfWeek }).map((_, i) =>
      addMonths(this.currentDate, 1).setDate(i + 1)
    );

    return (
      <Host>
        {(this.type == "date" || this.type == "datetime") && (
          <Fragment>
            <div class="header">
              <je-button onClick={this.prevYear}>
                <je-icon>keyboard_double_arrow_left</je-icon>
              </je-button>
              <je-button onClick={this.prevMonth}>
                <je-icon>keyboard_arrow_left</je-icon>
              </je-button>
              <span>{format(this.currentDate, "MMMM yyyy")}</span>
              <je-button onClick={this.nextMonth}>
                <je-icon>keyboard_arrow_right</je-icon>
              </je-button>
              <je-button onClick={this.nextYear}>
                <je-icon>keyboard_double_arrow_right</je-icon>
              </je-button>
            </div>

            <div class="weekdays-grid">
              {daysOfWeek.map((day) => (
                <div>{day}</div>
              ))}
            </div>

            <div class="days-grid">
              {daysBefore.map((day) => (
                <je-button
                  expand={true}
                  disabled={true}
                  fill="clear"
                  class="day"
                >
                  {format(day, "d")}
                </je-button>
              ))}

              {daysInMonth.map((day) => {
                const selected = this.value && isSameDay(day, this.value);
                const today = isToday(day);
                const isDisabled =
                  (this.isDateDisabled && this.isDateDisabled(day)) ||
                  (this.min && day < new Date(this.min)) ||
                  (this.max && day > new Date(this.max));
                return (
                  <je-button
                    expand={true}
                    disabled={isDisabled}
                    color={selected || today ? "primary" : undefined}
                    fill={selected ? "solid" : "clear"}
                    class="day"
                    onClick={() => this.setValue({ day })}
                  >
                    {format(day, "d")}
                  </je-button>
                );
              })}

              {daysAfter.map((day) => (
                <je-button
                  expand={true}
                  disabled={true}
                  fill="clear"
                  class="day"
                >
                  {format(day, "d")}
                </je-button>
              ))}
            </div>
          </Fragment>
        )}
        {(this.type == "time" || this.type == "datetime") && (
          <div class="timepicker">
            <span>Time</span>
            <je-popover arrow={true} onPresentEnd={this.scrollTimeIntoView}>
              <je-pill role="button" {...{ tabindex: 0 }} slot="trigger">
                {this.value
                  ? this.includeSeconds
                    ? format(this.value, "hh:mm:ss a")
                    : format(this.value, "hh:mm a")
                  : "-"}
              </je-pill>
              <div class="timepicker-content">
                <div class="timepicker-column">
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <je-button
                      size="sm"
                      color={
                        this.currentDate.getHours() === hour
                          ? "primary"
                          : undefined
                      }
                      fill={
                        this.currentDate.getHours() === hour ? "solid" : "clear"
                      }
                      onClick={() => this.setValue({ hour })}
                    >
                      {format(new Date().setHours(hour), "hh a")}
                    </je-button>
                  ))}
                </div>
                <div class="timepicker-column">
                  {Array.from({ length: 60 }).map((_, minute) => (
                    <je-button
                      size="sm"
                      color={
                        this.currentDate.getMinutes() === minute
                          ? "primary"
                          : undefined
                      }
                      fill={
                        this.currentDate.getMinutes() === minute
                          ? "solid"
                          : "clear"
                      }
                      onClick={() => this.setValue({ minute })}
                    >
                      {format(new Date().setMinutes(minute), "mm")}
                    </je-button>
                  ))}
                </div>
                {this.includeSeconds && (
                  <div class="timepicker-column">
                    {Array.from({ length: 60 }).map((_, second) => (
                      <je-button
                        size="sm"
                        color={
                          this.currentDate.getSeconds() === second
                            ? "primary"
                            : undefined
                        }
                        fill={
                          this.currentDate.getSeconds() === second
                            ? "solid"
                            : "clear"
                        }
                        onClick={() => this.setValue({ second })}
                      >
                        {format(new Date().setSeconds(second), "ss")}
                      </je-button>
                    ))}
                  </div>
                )}
              </div>
            </je-popover>
          </div>
        )}
      </Host>
    );
  }
}
