import type MarkdownIt from "markdown-it";

let markdownIt: Promise<typeof MarkdownIt> | undefined;

/** Loads markdown-it on first use so pages without markdown don't pay for it. */
export function loadMarkdownIt(): Promise<typeof MarkdownIt> {
  markdownIt ??= import("markdown-it").then((mod) => mod.default);
  return markdownIt;
}
