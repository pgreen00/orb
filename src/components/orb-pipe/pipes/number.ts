import type { Pipe } from "../../../utils/pipes.js";
import { parseArgs } from "../parse.js";

function num(input: unknown): number {
  const value = typeof input === "number" ? input : Number(String(input ?? "").trim());
  return Number.isFinite(value) ? value : NaN;
}

/**
 * Formats a number using `Intl.NumberFormat`.
 *
 * Positional arguments set the minimum and maximum fraction digits. Flags
 * `-percent` and `-compact` switch notation; `-nogroup` disables thousands
 * separators.
 *
 * @example 1234.5 | number 2      // "1,234.50"
 * @example 0.42 | number -percent // "42%"
 */
export const number: Pipe = (input, ...args) => {
  const { flags, positional } = parseArgs(args);
  const value = num(input);
  if (Number.isNaN(value)) return input;

  const min = positional.length ? Math.trunc(Number(positional[0])) : undefined;
  const max = positional.length > 1 ? Math.trunc(Number(positional[1])) : min;

  return value.toLocaleString(undefined, {
    style: flags.has("percent") ? "percent" : "decimal",
    notation: flags.has("compact") ? "compact" : "standard",
    useGrouping: !flags.has("nogroup"),
    minimumFractionDigits: Number.isFinite(min!) ? min : undefined,
    maximumFractionDigits: Number.isFinite(max!) ? max : undefined,
  });
};

/**
 * Formats a number as currency. The first argument is an ISO 4217 code
 * (default USD).
 *
 * @example 1200 | currency EUR // "€1,200.00"
 */
export const currency: Pipe = (input, ...args) => {
  const { flags, positional } = parseArgs(args);
  const value = num(input);
  if (Number.isNaN(value)) return input;

  const code = (positional[0] || "USD").toUpperCase();
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: code,
    notation: flags.has("compact") ? "compact" : "standard",
    // `-round` drops cents for whole-dollar display.
    maximumFractionDigits: flags.has("round") ? 0 : undefined,
  });
};

/** Alias of {@link number} kept for readability in expressions. */
export const decimal = number;
