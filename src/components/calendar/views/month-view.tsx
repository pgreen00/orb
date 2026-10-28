import { addDays, format, isSameMonth } from "date-fns";
import { OrbCalendarOccurrence } from "../utils/types";
import { daysInRange, nextDay, sameDay } from "../utils/datetime";
import { isSpanningBar, layoutSpanningBars } from "../utils/layout";

const MAX_TIMED_PILLS = 3;

export interface MonthViewProps {
  date: number;
  rangeStart: number;
  rangeEnd: number;
  occurrences: OrbCalendarOccurrence[];
  colorFor: (occ: OrbCalendarOccurrence) => string;
  today: number;
  onDayClick: (dayStart: number, ev: MouseEvent) => void;
  onEventClick: (occ: OrbCalendarOccurrence, ev: MouseEvent) => void;
  onMoreClick: (dayStart: number, ev: MouseEvent) => void;
}

export function MonthView(props: MonthViewProps) {
  const { occurrences, colorFor, today, date } = props;
  const allDays = daysInRange({ start: props.rangeStart, end: props.rangeEnd });
  const weeks: number[][] = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    format(addDays(props.rangeStart, i), "EEE"),
  );

  return (
    <div class="month-grid" part="grid">
      <div class="weekday-row" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <div class="weekday">{label}</div>
        ))}
      </div>
      <div class="month-weeks">
        {weeks.map((week) => {
          const { bars, lanes } = layoutSpanningBars(week, occurrences);
          return (
            <div class="week-row" style={{ "--lanes": `${lanes}` }}>
              <div class="day-cells">
                {week.map((dayStart) => {
                  const inMonth = isSameMonth(dayStart, date);
                  const isToday = sameDay(dayStart, today);
                  const dayEnd = nextDay(dayStart);
                  const timed = occurrences
                    .filter(
                      (o) => !isSpanningBar(o) && o.start >= dayStart && o.start < dayEnd,
                    )
                    .sort((a, b) => a.start - b.start);
                  const visible = timed.slice(0, MAX_TIMED_PILLS);
                  const overflow = timed.length - visible.length;
                  return (
                    <div
                      class={{ "day-cell": true, "out-of-month": !inMonth }}
                      part="day-cell"
                      onClick={(ev) => props.onDayClick(dayStart, ev)}
                    >
                      <div
                        class={{ "day-number": true, today: isToday }}
                        aria-label={format(dayStart, "EEEE, MMMM d")}
                      >
                        {format(dayStart, "d")}
                      </div>
                      <div class="timed-pills">
                        {visible.map((occ) => (
                          <button
                            type="button"
                            class="event-pill"
                            part="event"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              props.onEventClick(occ, ev);
                            }}
                          >
                            <span class="pill-dot" style={{ background: colorFor(occ) }} />
                            <span class="pill-time">{format(occ.start, "h a")}</span>
                            <span class="pill-title">{occ.event.title}</span>
                          </button>
                        ))}
                        {overflow > 0 && (
                          <button
                            type="button"
                            class="more-link"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              props.onMoreClick(dayStart, ev);
                            }}
                          >
                            +{overflow} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div class="bars-overlay">
                {bars.map((bar) => {
                  const insetL = bar.continuesLeft ? 0 : 2;
                  const insetR = bar.continuesRight ? 0 : 2;
                  return (
                    <button
                      type="button"
                      class={{
                        "event-bar": true,
                        "continues-left": bar.continuesLeft,
                        "continues-right": bar.continuesRight,
                      }}
                      part="event event--all-day"
                      style={{
                        left: `calc(${bar.colStart} / 7 * 100% + ${insetL}px)`,
                        width: `calc(${bar.colSpan} / 7 * 100% - ${insetL + insetR}px)`,
                        top: `calc(${bar.lane} * var(--orb-calendar-lane-h) + 1px)`,
                        "--bar-color": colorFor(bar.occ),
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        props.onEventClick(bar.occ, ev);
                      }}
                    >
                      <span class="bar-title">{bar.occ.event.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
