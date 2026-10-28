import { format } from "date-fns";
import { OrbCalendarOccurrence } from "../utils/types";
import { nextDay, sameDay } from "../utils/datetime";
import {
  isSpanningBar,
  layoutDayColumn,
  layoutSpanningBars,
} from "../utils/layout";

export interface TimeGridProps {
  /** Consecutive day starts (epoch ms): one for day view, seven for week view. */
  days: number[];
  occurrences: OrbCalendarOccurrence[];
  colorFor: (occ: OrbCalendarOccurrence) => string;
  now: number;
  dayStartHour: number;
  dayEndHour: number;
  onSlotClick: (start: number, ev: MouseEvent) => void;
  onEventClick: (occ: OrbCalendarOccurrence, ev: MouseEvent) => void;
  /** Receives the scroll container, so the calendar can scroll to `scrollToHour`. */
  registerScroll: (el: HTMLElement | null) => void;
}

export function TimeGrid(props: TimeGridProps) {
  const { days, occurrences, colorFor, now, dayStartHour, dayEndHour } = props;
  const hourCount = dayEndHour - dayStartHour;
  const hours = Array.from({ length: hourCount }, (_, i) => dayStartHour + i);
  const gridStartMin = dayStartHour * 60;

  const { bars, lanes } = layoutSpanningBars(days, occurrences);

  const topFor = (epoch: number, dayStart: number) =>
    `calc((${(epoch - dayStart) / 60000 - gridStartMin} / 60) * var(--orb-calendar-hour-height))`;
  const heightFor = (start: number, end: number) =>
    `calc((${(end - start) / 60000} / 60) * var(--orb-calendar-hour-height))`;

  return (
    <div class="time-grid" part="grid">
      <div class="tg-header">
        <div class="tg-corner" />
        {days.map((dayStart) => {
          const isToday = sameDay(dayStart, now);
          return (
            <div class={{ "tg-day-head": true, today: isToday }}>
              <span class="tg-day-name">{format(dayStart, "EEE")}</span>
              <span class={{ "tg-day-num": true, today: isToday }}>
                {format(dayStart, "d")}
              </span>
            </div>
          );
        })}
      </div>

      <div class="tg-allday" part="all-day-row" style={{ "--lanes": `${lanes}` }}>
        <div class="tg-allday-label">all-day</div>
        <div class="tg-allday-track">
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
                  left: `calc(${bar.colStart} / ${days.length} * 100% + ${insetL}px)`,
                  width: `calc(${bar.colSpan} / ${days.length} * 100% - ${insetL + insetR}px)`,
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

      <div class="tg-body" ref={(el) => props.registerScroll(el)}>
        <div class="tg-body-inner" style={{ "--hours": `${hourCount}` }}>
          <div class="tg-gutter" aria-hidden="true">
            {hours.map((hour) => (
              <div class="tg-hour-label">
                {hour === 0 ? "" : format(new Date(2000, 0, 1, hour), "h a")}
              </div>
            ))}
          </div>
          <div class="tg-columns">
            {days.map((dayStart) => {
              const dayEnd = nextDay(dayStart);
              const timed = occurrences.filter(
                (o) => !isSpanningBar(o) && o.start < dayEnd && o.end > dayStart,
              );
              const positioned = layoutDayColumn(timed);
              const isToday = sameDay(dayStart, now);
              return (
                <div
                  class="tg-col"
                  onClick={(ev) => {
                    // Snaps the clicked point to the 15-minute slot above it.
                    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                    const y = ev.clientY - rect.top;
                    const minutes = gridStartMin + (y / rect.height) * (hourCount * 60);
                    const snapped = Math.floor(minutes / 15) * 15;
                    props.onSlotClick(dayStart + snapped * 60000, ev);
                  }}
                >
                  {positioned.map(({ occurrence: occ, leftPct, widthPct }) => {
                    const start = Math.max(occ.start, dayStart);
                    const end = Math.min(occ.end, dayEnd);
                    return (
                      <button
                        type="button"
                        class="tg-event"
                        part="event"
                        data-occ-id={occ.masterId}
                        data-occ-start={`${occ.occurrenceStart}`}
                        data-readonly={occ.event.readonly ? "true" : "false"}
                        style={{
                          top: topFor(start, dayStart),
                          height: heightFor(start, end),
                          left: `calc(${leftPct} * 100% + 1px)`,
                          width: `calc(${widthPct} * 100% - 2px)`,
                          "--bar-color": colorFor(occ),
                        }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          props.onEventClick(occ, ev);
                        }}
                      >
                        <span class="tg-event-time">{format(occ.start, "h:mm a")}</span>
                        <span class="tg-event-title">{occ.event.title}</span>
                        <span class="tg-resize-handle" />
                      </button>
                    );
                  })}
                  {isToday && (
                    <div class="tg-now" part="now-line" style={{ top: topFor(now, dayStart) }}>
                      <span class="tg-now-dot" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
