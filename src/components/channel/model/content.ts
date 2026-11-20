import type MarkdownIt from "markdown-it";
import { loadMarkdownIt } from "../../../utils/markdown";
import { sanitizeHtml } from "./sanitize";

let parser: MarkdownIt | undefined;
let loading: Promise<void> | undefined;
/** Renders waiting for markdown-it. Each one draws the content again when it loads. */
const waiting = new Set<() => void>();
/** The HTML of each finished block of streamed markdown, so it's rendered once */
const finished = new Map<string, string>();

const FENCE = /^\s*(`{3,}|~{3,})/;

/**
 * Splits markdown after its last blank line that's outside a code fence. What's
 * before it is finished, and it doesn't change while a message streams. An open
 * fence stays in the tail, so it shows as an open code block.
 */
export function splitFinished(source: string): { finished: string; tail: string } {
  const lines = source.split("\n");
  let fence: string | undefined;
  let cut = -1;
  lines.forEach((line, index) => {
    const match = FENCE.exec(line);
    if (match) {
      if (!fence) fence = match[1];
      else if (match[1][0] === fence[0] && match[1].length >= fence.length && line.trim() === match[1]) fence = undefined;
    } else if (!fence && !line.trim()) {
      cut = index;
    }
  });
  if (cut < 0) return { finished: "", tail: source };
  return { finished: lines.slice(0, cut + 1).join("\n"), tail: lines.slice(cut + 1).join("\n") };
}

/**
 * The HTML of a markdown message. Until markdown-it has loaded, it's
 * undefined, and `onReady` runs once it has, so the channel can draw it.
 */
export function markdownHtml(source: string, onReady: () => void): string | undefined {
  if (!parser) {
    waiting.add(onReady);
    loading ??= loadMarkdownIt().then(
      (MarkdownIt) => {
        parser = new MarkdownIt({ html: false, linkify: true, typographer: true });
        for (const draw of waiting) draw();
        waiting.clear();
      },
      () => (loading = undefined),
    );
    return undefined;
  }
  const { finished: done, tail } = splitFinished(source);
  let html = "";
  if (done) {
    let cached = finished.get(done);
    if (cached === undefined) finished.set(done, (cached = sanitizeHtml(parser.render(done))));
    html = cached;
  }
  return html + (tail ? sanitizeHtml(parser.render(tail)) : "");
}

/** Each element's HTML, so content is only written when it changes */
const mounted = new WeakMap<HTMLElement, string>();

/**
 * Writes sanitized HTML into a message's content. Each code block gets a header
 * with its language and a copy button. Called from a `ref`, so the channel doesn't
 * re-render the content.
 */
export function mountHtml(el: HTMLElement | null, html: string) {
  if (!el || mounted.get(el) === html) return;
  mounted.set(el, html);
  el.innerHTML = html;
  for (const pre of Array.from(el.querySelectorAll("pre"))) {
    const language = /(?:^|\s)language-(\S+)/.exec(pre.querySelector("code")?.className ?? "")?.[1] ?? "";
    const block = document.createElement("div");
    block.className = "code-block";
    const header = document.createElement("div");
    header.className = "code-header";
    const name = document.createElement("span");
    name.className = "code-language";
    name.textContent = language;
    const copy = document.createElement("orb-copy-button");
    copy.setAttribute("value", pre.textContent ?? "");
    copy.setAttribute("part", "copy");
    header.append(name, copy);
    pre.replaceWith(block);
    block.append(header, pre);
  }
}
