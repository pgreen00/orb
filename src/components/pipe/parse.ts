export interface PipeCall {
  name: string;
  args: string[];
}

export interface ParsedInput {
  seed: string;
  calls: PipeCall[];
}

/**
 * Splits a raw input string into whitespace-delimited tokens, honoring single
 * and double quotes and backslash escapes. Quotes are stripped from the result
 * so `truncate 10 '...'` yields the literal `...` as an argument.
 */
function tokenize(segment: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let hasContent = false;

  for (let i = 0; i < segment.length; i++) {
    const char = segment[i];

    if (char === "\\") {
      const next = segment[i + 1];
      if (next === undefined) {
        throw new Error("Trailing escape character");
      }
      current += next;
      hasContent = true;
      i++;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      hasContent = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (hasContent) {
        tokens.push(current);
        current = "";
        hasContent = false;
      }
      continue;
    }

    current += char;
    hasContent = true;
  }

  if (quote) {
    throw new Error(`Unterminated ${quote} quote`);
  }

  if (hasContent) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Splits on top-level `|` characters. A pipe inside quotes or preceded by a
 * backslash is treated as literal text rather than a separator.
 */
function splitSegments(input: string): string[] {
  const segments: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === "\\") {
      current += char + (input[i + 1] ?? "");
      i++;
      continue;
    }

    if (quote) {
      if (char === quote) quote = null;
      current += char;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "|") {
      segments.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  segments.push(current);
  return segments;
}

/**
 * Parses a unix-like pipe expression such as `1000 | coalesce 0 | bytes`.
 *
 * The first segment is a literal seed value rather than a pipe call. Remaining
 * segments are `name arg...` pipe invocations.
 *
 * @throws if quoting is unbalanced or a pipe segment is empty.
 */
export function parseInput(input: string): ParsedInput {
  const segments = splitSegments(input ?? "");
  const [seedSegment, ...pipeSegments] = segments;

  const seedTokens = tokenize(seedSegment);
  const seed = seedTokens.join(" ");

  const calls = pipeSegments.map((segment) => {
    const tokens = tokenize(segment);
    if (!tokens.length) {
      throw new Error("Empty pipe segment");
    }
    const [name, ...args] = tokens;
    return { name, args };
  });

  return { seed, calls };
}

export interface ParsedArgs {
  /** Bare flags such as `-bit`, stored without the leading dash. */
  flags: Set<string>;
  /** Everything that isn't a flag, in source order. */
  positional: string[];
}

/**
 * Separates `-flag` style arguments from positional ones so built-in pipes can
 * read their options uniformly. A lone `-` and negative numbers like `-5` are
 * treated as positional values, not flags.
 */
export function parseArgs(args: string[]): ParsedArgs {
  const flags = new Set<string>();
  const positional: string[] = [];

  for (const arg of args) {
    if (arg.length > 1 && arg.startsWith("-") && !/^-?\d/.test(arg.slice(1))) {
      flags.add(arg.replace(/^-+/, ""));
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}
