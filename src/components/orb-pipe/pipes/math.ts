import type { Pipe } from "../../../utils/pipes.js";

function num(input: unknown): number {
  const value = typeof input === "number" ? input : Number(String(input ?? "").trim());
  return Number.isFinite(value) ? value : NaN;
}

/** Applies a Math function, passing the original input through when it isn't numeric. */
function mathPipe(fn: (value: number) => number): Pipe {
  return (input) => {
    const value = num(input);
    return Number.isNaN(value) ? input : fn(value);
  };
}

export const ceil = mathPipe(Math.ceil);
export const floor = mathPipe(Math.floor);
export const abs = mathPipe(Math.abs);

/** Rounds to an optional number of decimal places (default 0). */
export const round: Pipe = (input, places) => {
  const value = num(input);
  if (Number.isNaN(value)) return input;
  const digits = Math.max(0, Math.trunc(num(places) || 0));
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
