import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { OrbCalendarRange, OrbCalendarView, OrbWeekStart } from "./types";

/**
 * The epoch-ms range rendered for a view and anchor date, in local time.
 * - month: full weeks covering the month
 * - week: the 7-day week
 * - day: the single day
 */
export function rangeForView(
  date: number,
  view: OrbCalendarView,
  weekStartsOn: OrbWeekStart,
): OrbCalendarRange {
  if (view === "day") {
    return { start: startOfDay(date).getTime(), end: endOfDay(date).getTime() };
  }
  if (view === "week") {
    return {
      start: startOfWeek(date, { weekStartsOn }).getTime(),
      end: endOfWeek(date, { weekStartsOn }).getTime(),
    };
  }
  return {
    start: startOfWeek(startOfMonth(date), { weekStartsOn }).getTime(),
    end: endOfWeek(endOfMonth(date), { weekStartsOn }).getTime(),
  };
}

/** Steps the anchor date forward or back by one unit of the current view. */
export function step(date: number, view: OrbCalendarView, dir: 1 | -1): number {
  if (view === "day") return addDays(date, dir).getTime();
  if (view === "week") return addWeeks(date, dir).getTime();
  return addMonths(date, dir).getTime();
}

/** Day-start epoch-ms for every day in an inclusive range. */
export function daysInRange(range: OrbCalendarRange): number[] {
  const out: number[] = [];
  let cursor = startOfDay(range.start).getTime();
  const last = startOfDay(range.end).getTime();
  while (cursor <= last) {
    out.push(cursor);
    cursor = addDays(cursor, 1).getTime();
  }
  return out;
}

/** The start of the day after `dayStart`. Accounts for DST, unlike adding 24 hours. */
export function nextDay(dayStart: number): number {
  return addDays(dayStart, 1).getTime();
}

/** Minutes from the start of an event's day to its start time. */
export function minutesFromDayStart(eventStart: number): number {
  return differenceInMinutes(eventStart, startOfDay(eventStart));
}

/** Whether two epoch-ms fall on the same day. */
export function sameDay(a: number, b: number): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Whether the half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap. */
export function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Epoch ms to a value for `<input type="date">` or `<input type="datetime-local">`. */
export function toInputValue(epoch: number, allDay: boolean): string {
  const d = new Date(epoch);
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return allDay ? date : `${date}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** An input value to epoch ms. */
export function fromInputValue(value: string, allDay: boolean): number {
  const [datePart, timePart] = value.split("T");
  const [y, mo, da] = datePart.split("-").map(Number);
  const [h, mi] = (allDay ? "0:0" : (timePart ?? "0:0")).split(":").map(Number);
  return new Date(y, mo - 1, da, h, mi).getTime();
}
