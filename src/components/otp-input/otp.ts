export type OtpType = "numeric" | "alpha" | "alphanumeric";
export type OtpCase = "preserve" | "upper" | "lower";
export type FormatPart = { type: "segment" } | { type: "literal"; char: string };

const DISALLOWED: Record<OtpType, RegExp> = {
  numeric: /\D/g,
  alpha: /[^a-zA-Z]/g,
  alphanumeric: /[^a-zA-Z0-9]/g,
};

/** Splits `format` into segments and literal separators. Without a `#`, `length` segments are used. */
export function parseFormat(format: string, length: number): FormatPart[] {
  const count = Math.max(1, Math.floor(length) || 0);
  const source = format.includes("#") ? format : "#".repeat(count);
  return [...source].map((char): FormatPart =>
    char === "#" ? { type: "segment" } : { type: "literal", char },
  );
}

export function segmentCount(format: string, length: number): number {
  return parseFormat(format, length).filter((part) => part.type === "segment").length;
}

/**
 * Drops characters the type doesn't allow and applies the case. Text is
 * normalized first, so full-width digits such as "１" are kept as "1".
 */
export function sanitize(raw: string, type: OtpType, letterCase: OtpCase): string {
  const kept = raw.normalize("NFKC").replace(DISALLOWED[type], "");
  if (letterCase === "upper") return kept.toUpperCase();
  if (letterCase === "lower") return kept.toLowerCase();
  return kept;
}

/** How many kept characters come before `cursor`, so the caret stays with its character after filtering. */
export function caretAfterFilter(raw: string, cursor: number, type: OtpType, letterCase: OtpCase): number {
  return sanitize(raw.slice(0, cursor), type, letterCase).length;
}

/** Writes `text` over `value` from `at`, like pasting over characters. The result stays dense. */
export function overlay(value: string, text: string, at: number, max: number): string {
  const chars = [...value];
  for (let i = 0; i < text.length && at + i < max; i++) chars[at + i] = text[i];
  return chars.slice(0, max).join("");
}

/** Removes the characters from `start` up to `end`. Later characters shift left. */
export function splice(value: string, start: number, end = start + 1): string {
  return value.slice(0, start) + value.slice(end);
}
