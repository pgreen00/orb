import type { Pipe } from "../../../utils/pipes.js";
import { parseArgs } from "../parse.js";

const str = (input: unknown) => (input == null ? "" : String(input));

/**
 * Truncates to a maximum length, appending an ellipsis when shortened. The
 * suffix counts toward the limit so output never exceeds it.
 *
 * @example truncate 10 '...'
 */
export const truncate: Pipe = (input, ...args) => {
  const { flags, positional } = parseArgs(args);
  const value = str(input);
  const limit = Math.trunc(Number(positional[0]));
  if (!Number.isFinite(limit) || limit <= 0 || value.length <= limit) {
    return value;
  }
  const suffix = positional[1] ?? "…";
  const cut = value.slice(0, Math.max(0, limit - suffix.length));
  // `-words` avoids slicing through the middle of a word.
  const trimmed = flags.has("words") ? cut.replace(/\s+\S*$/, "") : cut;
  return trimmed + suffix;
};

/**
 * Pads to a target length. Pads the start by default, or the end with `-end`.
 *
 * @example pad 5 0
 */
export const pad: Pipe = (input, ...args) => {
  const { flags, positional } = parseArgs(args);
  const value = str(input);
  const length = Math.trunc(Number(positional[0]));
  if (!Number.isFinite(length) || length <= value.length) return value;
  const filler = positional[1] || " ";
  return flags.has("end")
    ? value.padEnd(length, filler)
    : value.padStart(length, filler);
};

/**
 * Returns the first argument when the input is null, undefined or empty. With
 * `-zero`, a numeric zero also counts as empty.
 *
 * @example coalesce 0
 */
export const coalesce: Pipe = (input, ...args) => {
  const { flags, positional } = parseArgs(args);
  const fallback = positional[0] ?? "";
  if (input == null) return fallback;
  const value = String(input);
  if (value.trim() === "") return fallback;
  if (flags.has("zero") && Number(value) === 0) return fallback;
  return input;
};

/**
 * Appends a plural suffix based on the numeric input. Supply an explicit plural
 * form as the second argument for irregular words.
 *
 * @example pluralize item
 * @example pluralize person people
 */
export const pluralize: Pipe = (input, ...args) => {
  const { flags, positional } = parseArgs(args);
  const [singular = "", plural] = positional;
  const count = Number(str(input).trim());
  const isSingular = Math.abs(count) === 1;
  const word = isSingular ? singular : (plural ?? `${singular}s`);
  // `-bare` omits the count from the output.
  return flags.has("bare") ? word : `${input} ${word}`.trim();
};

/** Removes leading and trailing whitespace. */
export const trim: Pipe = (input) => str(input).trim();
