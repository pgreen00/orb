import type { Pipe } from "../../../utils/pipes.js";
import { parseArgs } from "../parse.js";

const DECIMAL_UNITS = ["", "k", "M", "G", "T", "P", "E", "Z", "Y"];
const BINARY_UNITS = ["", "Ki", "Mi", "Gi", "Ti", "Pi", "Ei", "Zi", "Yi"];

/**
 * Formats a byte count using SI units by default.
 *
 * Flags:
 * - `-bit` renders bits (`b`) instead of bytes (`B`).
 * - `-binary` uses 1024-based units (`KiB`, `MiB`, ...).
 *
 * The optional positional argument sets the maximum number of decimal places
 * (default 1). Trailing zeros are trimmed, so 1000 becomes `1 kB`.
 *
 * @example 1200000000 | bytes -bit  // "1.2 Gb"
 * @example 1000 | bytes             // "1 kB"
 */
const bytes: Pipe = (input, ...args) => {
  const { flags, positional } = parseArgs(args);
  const value = typeof input === "number" ? input : Number(String(input ?? "").trim());
  if (!Number.isFinite(value)) return input;

  const binary = flags.has("binary") || flags.has("iec");
  const base = binary ? 1024 : 1000;
  const units = binary ? BINARY_UNITS : DECIMAL_UNITS;
  const symbol = flags.has("bit") || flags.has("bits") ? "b" : "B";

  const digits = positional.length ? Math.trunc(Number(positional[0])) : 1;
  const places = Number.isFinite(digits) ? Math.min(Math.max(digits, 0), 20) : 1;

  const magnitude = Math.abs(value);
  const exponent = magnitude < 1 ? 0 : Math.floor(Math.log(magnitude) / Math.log(base));
  const index = Math.min(exponent, units.length - 1);
  const scaled = value / base ** index;

  // `maximumFractionDigits` trims trailing zeros so whole values stay clean.
  const formatted = scaled.toLocaleString(undefined, {
    maximumFractionDigits: places,
  });

  return `${formatted} ${units[index]}${symbol}`;
};

export default bytes;
