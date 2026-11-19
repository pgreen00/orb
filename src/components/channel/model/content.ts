import { loadMarkdownIt } from "../../../utils/markdown";
import { sanitizeHtml } from "./sanitize";

const rendered = new Map<string, string>();
const loading = new Map<string, Promise<string>>();

/**
 * The HTML of a markdown message. Until markdown-it has loaded, it's
 * undefined, and `onReady` runs when it's rendered, so the channel can draw it.
 */
export function markdownHtml(source: string, onReady: () => void): string | undefined {
  const done = rendered.get(source);
  if (done !== undefined) return done;
  if (!loading.has(source)) {
    const promise = loadMarkdownIt().then((MarkdownIt) => {
      const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
      const html = sanitizeHtml(md.render(source));
      rendered.set(source, html);
      return html;
    });
    loading.set(source, promise);
    promise.then(onReady, () => loading.delete(source));
  }
  return undefined;
}

/** Each element's HTML, so content is only written when it changes */
const mounted = new WeakMap<HTMLElement, string>();

/**
 * Writes sanitized HTML into a message's content. Each code block gets a copy
 * button. Called from a `ref`, so the channel doesn't re-render the content.
 */
export function mountHtml(el: HTMLElement | null, html: string) {
  if (!el || mounted.get(el) === html) return;
  mounted.set(el, html);
  el.innerHTML = html;
  for (const pre of Array.from(el.querySelectorAll("pre"))) {
    const block = document.createElement("div");
    block.className = "code-block";
    const copy = document.createElement("orb-copy-button");
    copy.setAttribute("value", pre.textContent ?? "");
    copy.setAttribute("part", "copy");
    pre.replaceWith(block);
    block.append(pre, copy);
  }
}
