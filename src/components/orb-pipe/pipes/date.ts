import { format, parseISO } from "date-fns";
import type { Pipe } from "../../../utils/pipes.js";
import { parseArgs } from "../parse.js";

/**
 * Coerces pipe input into a Date. Numeric input is treated as a unix timestamp
 * (seconds when small enough to predate 1973, otherwise milliseconds).
 */
function toDate(input: unknown): Date | null {
  if (input instanceof Date) return input;

  const raw = String(input ?? "").trim();
  if (!raw) return null;

  if (/^-?\d+$/.test(raw)) {
    const stamp = Number(raw);
    const ms = Math.abs(stamp) < 1e11 ? stamp * 1000 : stamp;
    const fromStamp = new Date(ms);
    return Number.isNaN(fromStamp.getTime()) ? null : fromStamp;
  }

  const parsed = parseISO(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats a date using a date-fns format string (default `PP`, e.g.
 * "Apr 29, 2025"). Non-date input passes through untouched.
 *
 * @example 1745971200 | date 'yyyy-MM-dd'
 */
// Note: relative ("3 months ago") rendering is deliberately absent. It depends
// on the current time, so it would silently go stale after render -- pipes are
// pure transforms of their input. That belongs in a component with a lifecycle.
export const date: Pipe = (input, ...args) => {
  const { positional } = parseArgs(args);
  const value = toDate(input);
  if (!value) return input;
  return format(value, positional[0] || "PP");
};
