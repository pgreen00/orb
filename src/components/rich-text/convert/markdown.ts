import type MarkdownIt from "markdown-it";

/** Block syntax at the start of a line, or inline syntax such as bold or a link. Plain prose matches neither. */
const MARKDOWN_HINTS =
  /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|\|.*\|\s*$|[-*_]{3,}\s*$)|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)/m;

let renderer: Promise<MarkdownIt> | undefined;

/** Whether pasted plain text reads as Markdown, so it should be rendered */
export const looksLikeMarkdown = (text: string) => MARKDOWN_HINTS.test(text);

/** Renders Markdown to HTML. markdown-it loads the first time it's needed. Raw HTML in the text is shown as text. */
export function markdownToHtml(text: string): Promise<string> {
  renderer ??= import("markdown-it").then((mod) => new mod.default({ html: false }));
  return renderer.then((md) => md.render(text));
}
