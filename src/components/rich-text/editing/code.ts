/** Prism component files to load, in dependency order, for each supported language. */
export const CODE_LANGUAGES: Record<string, string[]> = {
  javascript: ["clike", "javascript"],
  typescript: ["clike", "javascript", "typescript"],
  python: ["python"],
  css: ["css"],
  markup: ["markup"],
  json: ["json"],
  bash: ["bash"],
};

export const DEFAULT_LANGUAGES = ["javascript", "typescript", "python", "css", "markup", "json", "bash"];

type Token = string | { type: string; content: Token | Token[] };

type PrismLike = {
  languages: Record<string, unknown>;
  tokenize(text: string, grammar: unknown): Token[];
};

type Leaf = { start: number; end: number; type: string };

/**
 * Each component file is imported by its literal path, since the bundler can't
 * follow a computed path and would leave the import for the browser to fail on.
 */
const COMPONENTS: Record<string, () => Promise<unknown>> = {
  clike: () => import("prismjs/components/prism-clike"),
  javascript: () => import("prismjs/components/prism-javascript"),
  typescript: () => import("prismjs/components/prism-typescript"),
  python: () => import("prismjs/components/prism-python"),
  css: () => import("prismjs/components/prism-css"),
  markup: () => import("prismjs/components/prism-markup"),
  json: () => import("prismjs/components/prism-json"),
  bash: () => import("prismjs/components/prism-bash"),
};

let core: Promise<PrismLike | null> | undefined;
const loaded = new Map<string, Promise<boolean>>();

/**
 * Prism's core reads `Prism.manual` from the global when it initializes, so the
 * flag must be set before the import; otherwise Prism highlights the whole page.
 */
function loadCore(): Promise<PrismLike | null> {
  core ??= (async () => {
    try {
      const scope = globalThis as { Prism?: PrismLike };
      scope.Prism ??= { manual: true } as unknown as PrismLike;
      await import("prismjs");
      // Prism's core replaces the global with itself when it loads. The component files read that global.
      return scope.Prism;
    } catch {
      return null;
    }
  })();
  return core;
}

export function loadLanguage(name: string): Promise<boolean> {
  if (!Object.hasOwn(CODE_LANGUAGES, name)) return Promise.resolve(false);
  let pending = loaded.get(name);
  if (!pending) {
    pending = (async () => {
      try {
        const prism = await loadCore();
        if (!prism) return false;
        for (const part of CODE_LANGUAGES[name]) {
          await COMPONENTS[part]();
        }
        return !!prism.languages[name];
      } catch {
        return false;
      }
    })();
    loaded.set(name, pending);
  }
  return pending;
}

export function languageOf(code: Element): string | null {
  const cls = Array.from(code.classList).find((c) => c.startsWith("language-"));
  return cls ? cls.slice("language-".length) : null;
}

/** Highlight names are global, so each root tracks the ranges it added and removes only those. */
const owned = new WeakMap<HTMLElement, Map<string, Range[]>>();

/** The CSS Custom Highlight API, typed loosely because the project's DOM lib predates it. */
function highlightRegistry(): any {
  const css = (globalThis as any).CSS;
  return css && "highlights" in css ? css.highlights : null;
}

function release(root: HTMLElement) {
  const previous = owned.get(root);
  if (!previous) return;
  owned.delete(root);
  const registry = highlightRegistry();
  for (const [name, ranges] of previous) {
    const highlight = registry?.get(name);
    if (!highlight) continue;
    for (const range of ranges) highlight.delete(range);
    if (highlight.size === 0) registry.delete(name);
  }
}

/** Flattens a Prism token tree into leaves; each leaf takes the type of its innermost token. */
function collectLeaves(tokens: Token[], type: string | undefined, start: number, out: Leaf[]): number {
  let offset = start;
  for (const token of tokens) {
    if (typeof token === "string") {
      if (type && token.length) out.push({ start: offset, end: offset + token.length, type });
      offset += token.length;
    } else {
      const content = Array.isArray(token.content) ? token.content : [token.content];
      offset = collectLeaves(content, token.type, offset, out);
    }
  }
  return offset;
}

/** Maps text offsets within `code` to DOM ranges, grouped by highlight name. */
function addRanges(code: Element, leaves: Leaf[], into: Map<string, Range[]>) {
  const nodes: Text[] = [];
  const starts: number[] = [];
  let total = 0;
  const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
    starts.push(total);
    total += (node as Text).length;
  }
  if (!nodes.length) return;

  // The last text node starting at or before `offset`; a boundary resolves to the start of the next node.
  const locate = (offset: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { node: nodes[lo], offset: offset - starts[lo] };
  };

  for (const leaf of leaves) {
    const from = locate(leaf.start);
    const to = locate(leaf.end);
    const range = document.createRange();
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    const name = `orb-code-${leaf.type}`;
    const list = into.get(name) ?? [];
    list.push(range);
    into.set(name, list);
  }
}

/**
 * Highlights the `pre > code` blocks in `root` whose language is in `languages`.
 * Ranges are built from the DOM as it is when this runs, so call it again after
 * the DOM changes. Each call replaces the ranges this root added before.
 */
export async function highlightCode(root: HTMLElement, languages: string[]): Promise<void> {
  if (!highlightRegistry()) return;
  const blocks = Array.from(root.querySelectorAll("pre > code"))
    .map((code) => ({ code, name: languageOf(code) }))
    .filter((block): block is { code: Element; name: string } => !!block.name && languages.includes(block.name));

  await Promise.all([...new Set(blocks.map((block) => block.name))].map(loadLanguage));
  const prism = await loadCore();
  if (!prism) return;

  const ranges = new Map<string, Range[]>();
  for (const { code, name } of blocks) {
    const grammar = prism.languages[name];
    if (!grammar) continue;
    const leaves: Leaf[] = [];
    collectLeaves(prism.tokenize(code.textContent ?? "", grammar), undefined, 0, leaves);
    addRanges(code, leaves, ranges);
  }

  release(root);
  if (!ranges.size) return;
  owned.set(root, ranges);
  const registry = highlightRegistry();
  for (const [name, list] of ranges) {
    const highlight = registry.get(name);
    if (highlight) for (const range of list) highlight.add(range);
    else registry.set(name, new (globalThis as any).Highlight(...list));
  }
}

export function clearHighlights(root: HTMLElement): void {
  release(root);
}
