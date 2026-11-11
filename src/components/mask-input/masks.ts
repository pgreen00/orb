import {
  compileParts,
  compilePattern,
  concealFirst,
  normalizeMask,
} from "./mask";
import type { Layout, Mask, MaskDefinition, Part, Slot } from "./mask";
import { customMask } from "../../utils/masks";

const digitsOnly = (text: string) => text.replace(/\D/g, "");

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * Digits that stay within `min` and `max`. A first digit too large to start the
 * range gets a leading zero, so typing `4` for a month gives `04`.
 */
function numberField(size: number, min = 0, max = Infinity): Slot {
  return {
    size,
    test: /\d/,
    accept(placed, char) {
      if (!placed && size > 1 && Number(char) * 10 > max) return `0${char}`;
      const next = placed + char;
      if (next.length === size && (Number(next) < min || Number(next) > max)) return null;
      return next;
    },
  };
}

const date: Part[] = [
  numberField(2, 1, 12),
  { literal: "/" },
  numberField(2, 1, 31),
  { literal: "/" },
  numberField(4),
];

/**
 * Dollars and cents typed as digits, where the last two digits are cents. The
 * leading zeros that keep the cents in place are shown but aren't part of the
 * raw value.
 */
function currency(): Mask {
  return {
    extract: digitsOnly,
    inputMode: "numeric",
    unmask: (raw) => {
      if (!raw) return "";
      const padded = raw.padStart(3, "0");
      return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
    },
    layout(candidate): Layout {
      const raw = candidate.replace(/^0+/, "");
      if (!raw) return { raw, display: "", literal: [], complete: null, guide: "" };
      const padded = raw.padStart(3, "0");
      const padding = padded.length - raw.length;
      const whole = padded.length - 2;
      let display = "$";
      const literal = [true];
      padded.split("").forEach((digit, i) => {
        if (i === whole) {
          display += ".";
          literal.push(true);
        } else if (i > 0 && i < whole && (whole - i) % 3 === 0) {
          display += ",";
          literal.push(true);
        }
        display += digit;
        literal.push(i < padding);
      });
      return { raw, display, literal, complete: null, guide: display };
    },
  };
}

const builtins = new Map<string, Mask>([
  ["phone", compilePattern("(###) ###-####", "tel")],
  ["zip", compilePattern("#####", "numeric")],
  // Only the last four digits show. The value and the form still get all nine.
  ["ssn", concealFirst(compilePattern("###-##-####", "numeric"), 5)],
  ["credit-card", compilePattern("#### #### #### ####", "numeric")],
  [
    "time",
    compileParts([numberField(2, 0, 23), { literal: ":" }, numberField(2, 0, 59)], "numeric"),
  ],
  ["date", compileParts(date, "numeric")],
  [
    "datetime",
    compileParts(
      [...date, { literal: " " }, numberField(2, 0, 23), { literal: ":" }, numberField(2, 0, 59)],
      "numeric",
    ),
  ],
  ["daterange", compileParts([...date, { literal: " - " }, ...date], "numeric")],
  [
    "number",
    normalizeMask({
      extract: digitsOnly,
      format: (raw) => group(raw.replace(/^0+(?=\d)/, "")),
      inputMode: "numeric",
    }),
  ],
  ["currency", currency()],
]);

/** Without a `mask`, the field is plain text */
const plain = normalizeMask({
  extract: (text) => text.replace(/[\r\n]+/g, " "),
  format: (raw) => raw,
});

/**
 * Resolves the `mask` prop. Names registered with `registerMask` win over the
 * built-in names, and anything else is read as a pattern. A lazily registered
 * mask that hasn't loaded yet comes back as a promise.
 */
export function resolveMask(mask: string | MaskDefinition | undefined): Mask | Promise<Mask> {
  if (!mask) return plain;
  if (typeof mask !== "string") return normalizeMask(mask);
  return customMask(mask) ?? builtins.get(mask) ?? compilePattern(mask);
}
