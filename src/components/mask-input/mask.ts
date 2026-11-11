/**
 * The mask engine behind `orb-mask-input`. Everything here is computation over
 * strings with no DOM access, so the rules can be read and tested apart from
 * the element.
 *
 * A field holds two strings. `raw` is the value without separators, such as
 * `5551234567`. `display` is what the field shows, such as `(555) 123-4567`.
 * Positions are UTF-16 offsets into `display`, the same units as
 * `selectionStart`.
 */

/** A mask as users write it. `extract` and `format` are required. */
export interface MaskDefinition {
  /**
   * Keeps the characters that make up the value and drops the rest, such as
   * separators. Must satisfy `extract(a + b) === extract(a) + extract(b)`.
   */
  extract(text: string): string;
  /**
   * Builds the display from raw characters. It can drop characters that don't
   * fit, and it's where separators get added.
   */
  format(raw: string): string;
  /**
   * The display followed by the unfilled rest of the mask, such as
   * `(555) ___-____`. The display must be a prefix of the result.
   */
  guide?(raw: string, placeholder: string): string;
  /** Whether the raw value is complete. Used for validity and `orbComplete`. */
  complete?(raw: string): boolean;
  /** The value submitted with `unmasked`, such as digits without separators */
  unmask?(raw: string): string;
  /**
   * The text the field shows in place of the display, such as `•••-••-6789`.
   * It must be the same length as the display, so the caret lines up. The
   * value and the form still get the display.
   */
  conceal?(display: string): string;
  /** The keyboard shown on touch devices, such as `numeric` */
  inputMode?: string;
}

export interface Layout {
  /** The characters that make up the value, without separators */
  raw: string;
  /** What the field shows */
  display: string;
  /** For each character of `display`, whether it's a separator rather than part of `raw` */
  literal: boolean[];
  /** Whether the value is complete, or null when the mask has no such rule */
  complete: boolean | null;
  /** `display` followed by the unfilled rest of the mask */
  guide: string;
}

/** The engine's view of a mask. Build one with `normalizeMask` or `compileParts`. */
export interface Mask {
  extract(text: string): string;
  /** Lays out raw characters. Characters that don't fit are dropped. */
  layout(candidate: string, placeholder: string): Layout;
  unmask(raw: string): string;
  /** The text shown in place of the display. See `MaskDefinition.conceal`. */
  conceal?(layout: Layout): string;
  inputMode?: string;
}

/** A change to the display from `start` to `end`. `direction` applies to a collapsed deletion only. */
export interface Edit {
  start: number;
  end: number;
  text: string;
  direction?: "backward" | "forward";
}

/** One character position that takes a raw character */
export interface Slot {
  /** How many characters the slot holds */
  size: number;
  /** Which characters can fill the slot */
  test: RegExp;
  /**
   * What the slot holds after `char` is added to `placed`, or null to reject
   * `char`. Appends when omitted.
   */
  accept?(placed: string, char: string): string | null;
}

/** A piece of a pattern: a separator that's shown only once something follows it, or a slot */
export type Part = { literal: string } | Slot;

const isSlot = (part: Part): part is Slot => "size" in part;

const SLOT_TESTS: Record<string, RegExp> = {
  "#": /\d/,
  A: /\p{L}/u,
  "*": /[\p{L}\d]/u,
};

/** Wraps a definition, filling in the defaults the engine relies on. */
export function normalizeMask(def: MaskDefinition): Mask {
  return {
    extract: (text) => def.extract(text),
    unmask: (raw) => def.unmask?.(raw) ?? raw,
    conceal: def.conceal && ((layout) => def.conceal(layout.display)),
    inputMode: def.inputMode,
    layout(candidate, placeholder) {
      const display = def.format(candidate);
      const raw = def.extract(display);
      return {
        raw,
        display,
        literal: display.split("").map((char) => def.extract(char) === ""),
        complete: def.complete ? def.complete(raw) : null,
        guide: def.guide ? def.guide(raw, placeholder) : display,
      };
    },
  };
}

/**
 * Builds a mask from parts. Characters that match no slot are separators, and
 * a separator only appears once a character follows it, so the field doesn't
 * get stuck behind one when deleting.
 */
export function compileParts(parts: Part[], inputMode?: string): Mask {
  const slots = parts.filter(isSlot);
  return {
    inputMode,
    extract: (text) =>
      text
        .split("")
        .filter((char) => slots.some((slot) => slot.test.test(char)))
        .join(""),
    layout(candidate, placeholder) {
      let raw = "";
      let display = "";
      let pending = "";
      let pos = 0;
      let complete = true;
      let last = -1;
      let lastPlaced = 0;
      const literal: boolean[] = [];

      parts.forEach((part, index) => {
        if (!isSlot(part)) {
          pending += part.literal;
          return;
        }
        let placed = "";
        while (pos < candidate.length && placed.length < part.size) {
          const char = candidate[pos++];
          if (!part.test.test(char)) continue;
          const next = part.accept ? part.accept(placed, char) : placed + char;
          if (next !== null) placed = next;
        }
        if (placed) {
          display += pending + placed;
          literal.push(...pending.split("").map(() => true), ...placed.split("").map(() => false));
          raw += placed;
          pending = "";
          last = index;
          lastPlaced = placed.length;
        }
        if (placed.length < part.size) complete = false;
      });

      let rest = "";
      const lastSlot = last >= 0 ? (parts[last] as Slot) : undefined;
      if (lastSlot && lastPlaced < lastSlot.size) {
        rest += placeholder.repeat(lastSlot.size - lastPlaced);
      }
      for (const part of parts.slice(last + 1)) {
        rest += isSlot(part) ? placeholder.repeat(part.size) : part.literal;
      }

      return { raw, display, literal, complete, guide: display + rest };
    },
    unmask: (raw) => raw,
  };
}

/**
 * Compiles a pattern. `#` takes a digit, `A` a letter, `*` a letter or digit,
 * and a backslash escapes the next character. Anything else is a separator.
 */
export function compilePattern(pattern: string, inputMode?: string): Mask {
  const parts: Part[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "\\" && i + 1 < pattern.length) {
      parts.push({ literal: pattern[++i] });
    } else if (SLOT_TESTS[char]) {
      parts.push({ size: 1, test: SLOT_TESTS[char] });
    } else {
      parts.push({ literal: char });
    }
  }
  return compileParts(parts, inputMode);
}

/**
 * Shows `char` in place of the first `count` raw characters, keeping the
 * separators, such as `•••-••-6789` for a social security number. The hidden
 * positions are fixed, so characters don't change from shown to hidden as more
 * are typed.
 */
export function concealFirst(mask: Mask, count: number, char = "•"): Mask {
  return {
    ...mask,
    conceal({ display, literal }) {
      let seen = 0;
      return display
        .split("")
        .map((c, i) => (literal[i] || seen++ >= count ? c : char))
        .join("");
    },
  };
}

/** How many raw characters come before `offset` */
export function rawIndexAt(literal: boolean[], offset: number): number {
  let count = 0;
  for (let i = 0; i < offset && i < literal.length; i++) {
    if (!literal[i]) count++;
  }
  return count;
}

/**
 * The offset just before raw character `rawIndex`, after any separators in
 * front of it. Past the last character, it's the end of the display.
 */
export function offsetForRaw(literal: boolean[], rawIndex: number): number {
  let best = 0;
  let count = 0;
  for (let offset = 0; offset <= literal.length; offset++) {
    if (count <= rawIndex) best = offset;
    if (offset < literal.length && !literal[offset]) count++;
  }
  return best;
}

/**
 * Applies an edit to the layout. Edits that fall on separators are mapped to
 * raw characters, so a deletion next to a separator removes the character
 * beyond it. Characters that don't fit are dropped, and when the mask is full,
 * an insertion pushes the last character out.
 */
export function applyEdit(
  mask: Mask,
  state: Layout,
  edit: Edit,
  placeholder: string,
): { layout: Layout; caret: number } {
  const inserted = mask.extract(edit.text);
  let from = rawIndexAt(state.literal, edit.start);
  let to = rawIndexAt(state.literal, edit.end);
  if (edit.start === edit.end && edit.text === "") {
    if (edit.direction === "forward") to = Math.min(state.raw.length, from + 1);
    else from = Math.max(0, to - 1);
  }

  const candidate = state.raw.slice(0, from) + inserted + state.raw.slice(to);
  const layout = mask.layout(candidate, placeholder);
  // Formatting can add characters the user didn't type, such as a leading zero.
  // The caret goes after everything that was gained, so it doesn't land short.
  const kept = state.raw.length - (to - from);
  const gained = layout.raw.length - kept;
  const caretRaw = Math.min(from + Math.max(inserted.length, gained), layout.raw.length);
  return { layout, caret: offsetForRaw(layout.literal, caretRaw) };
}

/**
 * The single edit that turns `before` into `after`. Used to pick up changes
 * the browser made itself, such as an IME composition or a drop.
 */
export function diffEdit(before: string, after: string): Edit {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) {
    start++;
  }
  let endBefore = before.length;
  let endAfter = after.length;
  while (
    endBefore > start &&
    endAfter > start &&
    before[endBefore - 1] === after[endAfter - 1]
  ) {
    endBefore--;
    endAfter--;
  }
  return { start, end: endBefore, text: after.slice(start, endAfter) };
}
