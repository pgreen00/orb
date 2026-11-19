/**
 * The elements the editor keeps and what each one means. Sanitizing,
 * normalizing, the toolbar's pressed states and the saved HTML all read from
 * this table, so a new element is added here and nowhere else.
 */

export type NodeKind =
  | "mark" // strong, em, u, s, code, a, sub, sup
  | "style" // span with inline styles, such as a color
  | "text-block" // p, h1–h6, li, pre. Holds text and inline content directly.
  | "container" // ul, ol, blockquote. Holds other blocks or items.
  | "atom-inline" // img, br, task checkboxes. Non-editable, except br.
  | "atom-block"; // hr

/** Style properties kept on an element. Each has a check in STYLE_CHECKS. */
export type StyleProp =
  | "text-align"
  | "margin-inline-start"
  | "line-height"
  | "list-style-type"
  | "width"
  | InlineStyleProp;

/** Styles set on a span, which the font and color controls use */
export type InlineStyleProp = "color" | "background-color" | "font-family" | "font-size";

export interface NodeSpec {
  name: string;
  tag: string;
  kind: NodeKind;
  /** Other tags that become this one, such as B becoming STRONG */
  aliases?: string[];
  /** Attributes kept, each with a check that returns the cleaned value, or null to drop it */
  attrs?: Record<string, (value: string) => string | null>;
  styles?: StyleProp[];
  /** Tells apart elements that share a tag, such as a checkbox from other inputs */
  match?: (el: Element) => boolean;
  /** Tags it may be directly inside. Anywhere else it's removed. */
  parents?: string[];
}

/** Indents are whole steps of this many ems, up to MAX_INDENT steps */
export const INDENT_EM = 2;
export const MAX_INDENT = 8;

const LIST_STYLES = ["none", "disc", "circle", "square", "decimal", "lower-alpha", "upper-alpha", "lower-roman", "upper-roman"];
const LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

/** Whether a link may go to `url`. Relative URLs count, since they resolve against the page. */
export function isSafeUrl(url: string) {
  try {
    return LINK_PROTOCOLS.includes(new URL(url, document.baseURI).protocol);
  } catch {
    return false;
  }
}

/** A link to a heading in the document. Allowed explicitly, since a page's protocol may not count as a web address. */
const safeHref = (value: string) => (isSafeUrl(value) || /^#[A-Za-z][\w-]*$/.test(value) ? value : null);
/** The value as the browser parses and saves it, or null when it isn't valid for the property */
const parsedBy = (prop: string) => (value: string) => {
  const style = document.createElement("span").style;
  style.setProperty(prop, value);
  return style.getPropertyValue(prop) || null;
};
// A blob: preview is shown while a file uploads, and is never saved (see serialize)
const safeSrc = (value: string) => (/^https?:|^data:(image|video)\/|^blob:/i.test(value) ? value : null);
/**
 * Embeds are only from the providers the schema names. The src is rebuilt from
 * the video ID, so a pasted URL's other parts, such as its query, are dropped.
 */
const EMBED_SOURCES: [RegExp, (id: string) => string][] = [
  [/^https:\/\/(?:www\.)?(?:youtube-nocookie|youtube)\.com\/embed\/([\w-]+)/, (id) => `https://www.youtube-nocookie.com/embed/${id}`],
  [/^https:\/\/player\.vimeo\.com\/video\/([0-9]+)/, (id) => `https://player.vimeo.com/video/${id}`],
];
const safeEmbedSrc = (value: string) => {
  for (const [pattern, build] of EMBED_SOURCES) {
    const match = pattern.exec(value);
    if (match) return build(match[1]);
  }
  return null;
};
const safeWidth = (value: string) => (/^\d{1,4}$/.test(value) ? value : null);
/** The id or key of a mention, tag or placeholder. Anything with spaces or markup is dropped. */
const safeKey = (value: string) => (/^[^\s<>"']{1,200}$/.test(value) ? value : null);
/** A heading id, as the editor makes it. Anything else is dropped, so a pasted id can't collide with the editor's. */
const safeId = (value: string) => (/^[A-Za-z][\w-]*$/.test(value) ? value : null);
const asIs = (value: string) => value;
const safeStart = (value: string) => (/^\d+$/.test(value) ? value : null);
/** The class a code block carries for its language, such as language-typescript */
const codeClass = (value: string) => (/^language-[\w+#-]+$/.test(value) ? value : null);

/** Whole steps of indent, rounded, and no indent at all for zero */
function indentStep(value: string) {
  const match = /^(\d+(?:\.\d+)?)em$/i.exec(value);
  if (!match) return null;
  const level = Math.min(MAX_INDENT, Math.max(0, Math.round(+match[1] / INDENT_EM)));
  return level ? `${level * INDENT_EM}em` : null;
}

export const STYLE_CHECKS: Record<StyleProp, (value: string) => string | null> = {
  "text-align": (value) => (["left", "center", "right", "justify"].includes(value.toLowerCase()) ? value.toLowerCase() : null),
  "margin-inline-start": indentStep,
  "line-height": (value) => (/^\d(\.\d+)?$/.test(value) && +value >= 1 && +value <= 3 ? value : null),
  "list-style-type": (value) => (LIST_STYLES.includes(value.toLowerCase()) ? value.toLowerCase() : null),
  width: (value) => (/^\d+(\.\d+)?%$/.test(value) && +value.slice(0, -1) > 0 && +value.slice(0, -1) <= 100 ? value : null),
  color: parsedBy("color"),
  "background-color": parsedBy("background-color"),
  "font-family": parsedBy("font-family"),
  "font-size": parsedBy("font-size"),
};

const BLOCK_STYLES: StyleProp[] = ["text-align", "margin-inline-start", "line-height"];
const INLINE_STYLES: StyleProp[] = ["color", "background-color", "font-family", "font-size"];

export const NODES: NodeSpec[] = [
  { name: "paragraph", tag: "P", kind: "text-block", aliases: ["DIV"], styles: BLOCK_STYLES },
  // Headings keep their id, which the outline and table of contents link to
  ...[1, 2, 3, 4, 5, 6].map(
    (n): NodeSpec => ({
      name: `heading${n}`,
      tag: `H${n}`,
      kind: "text-block",
      styles: BLOCK_STYLES,
      attrs: { id: safeId },
    }),
  ),
  { name: "codeBlock", tag: "PRE", kind: "text-block" },
  { name: "listItem", tag: "LI", kind: "text-block", styles: ["text-align", "line-height", "list-style-type"] },
  { name: "blockquote", tag: "BLOCKQUOTE", kind: "container" },
  { name: "bulletList", tag: "UL", kind: "container", styles: ["list-style-type"] },
  { name: "orderedList", tag: "OL", kind: "container", styles: ["list-style-type"], attrs: { start: safeStart } },
  // Cells hold text like paragraphs. Spans are split away when pasted, so no span attributes are kept.
  { name: "table", tag: "TABLE", kind: "container" },
  { name: "tableColumnGroup", tag: "COLGROUP", kind: "container" },
  { name: "tableColumn", tag: "COL", kind: "container", styles: ["width"] },
  { name: "tableHead", tag: "THEAD", kind: "container" },
  { name: "tableBody", tag: "TBODY", kind: "container" },
  { name: "tableRow", tag: "TR", kind: "container" },
  { name: "tableHeaderCell", tag: "TH", kind: "text-block", styles: ["text-align"] },
  { name: "tableCell", tag: "TD", kind: "text-block", styles: ["text-align"] },
  { name: "separator", tag: "HR", kind: "atom-block" },
  // A figure holds one picture, video or embed, with an editable caption. It's a non-editable piece.
  { name: "figure", tag: "FIGURE", kind: "atom-block", styles: ["text-align"], attrs: { "data-embed": (v) => (v === "youtube" || v === "vimeo" ? v : null) } },
  { name: "figcaption", tag: "FIGCAPTION", kind: "text-block" },
  { name: "video", tag: "VIDEO", kind: "atom-inline", attrs: { src: safeSrc, controls: () => "" } },
  {
    name: "embed",
    tag: "IFRAME",
    kind: "atom-inline",
    attrs: {
      src: safeEmbedSrc,
      sandbox: () => "allow-scripts allow-same-origin allow-presentation",
      allowfullscreen: () => "",
      loading: () => "lazy",
    },
  },
  // The table of contents. Its links point at heading ids, which are only ever set by the editor.
  { name: "toc", tag: "NAV", kind: "atom-block", match: (el) => el.hasAttribute("data-toc"), attrs: { "data-toc": () => "" } },
  { name: "image", tag: "IMG", kind: "atom-inline", attrs: { src: safeSrc, alt: asIs, width: safeWidth } },
  { name: "lineBreak", tag: "BR", kind: "atom-inline" },
  { name: "bold", tag: "STRONG", kind: "mark", aliases: ["B"] },
  { name: "italic", tag: "EM", kind: "mark", aliases: ["I"] },
  { name: "underline", tag: "U", kind: "mark", aliases: ["INS"] },
  { name: "strike", tag: "S", kind: "mark", aliases: ["STRIKE", "DEL"] },
  { name: "code", tag: "CODE", kind: "mark", attrs: { class: codeClass } },
  { name: "subscript", tag: "SUB", kind: "mark" },
  { name: "superscript", tag: "SUP", kind: "mark" },
  { name: "link", tag: "A", kind: "mark", attrs: { href: safeHref } },
  // Inline objects are pieces the caret steps over. They come before the style span, which matches any span.
  { name: "mention", tag: "SPAN", kind: "atom-inline", match: (el) => el.hasAttribute("data-mention"), attrs: { "data-mention": safeKey } },
  { name: "tag", tag: "SPAN", kind: "atom-inline", match: (el) => el.hasAttribute("data-tag"), attrs: { "data-tag": safeKey } },
  { name: "command", tag: "SPAN", kind: "atom-inline", match: (el) => el.hasAttribute("data-command"), attrs: { "data-command": safeKey } },
  { name: "param", tag: "SPAN", kind: "atom-inline", match: (el) => el.hasAttribute("data-param"), attrs: { "data-param": safeKey } },
  { name: "textStyle", tag: "SPAN", kind: "style", styles: INLINE_STYLES },
  {
    name: "checkbox",
    tag: "INPUT",
    kind: "atom-inline",
    parents: ["LI"],
    match: (el) => el.getAttribute("type")?.toLowerCase() === "checkbox",
    attrs: { type: () => "checkbox", checked: () => "" },
  },
];

/** The spec for an element, or undefined when the schema doesn't keep it */
export function specOf(el: Element): NodeSpec | undefined {
  return NODES.find(
    (n) => (n.tag === el.tagName || n.aliases?.includes(el.tagName)) && (!n.match || n.match(el)),
  );
}

/** The canonical tag and aliases of a spec, such as STRONG and B for bold */
export function tagsOf(name: string): string[] {
  const spec = NODES.find((n) => n.name === name)!;
  return [spec.tag, ...(spec.aliases ?? [])];
}

export const markTag = (name: string) => NODES.find((n) => n.name === name)!.tag;

const tagsOfKind = (...kinds: NodeKind[]) =>
  NODES.filter((n) => kinds.includes(n.kind)).flatMap((n) => [n.tag, ...(n.aliases ?? [])]);

export const TEXT_BLOCK_TAGS = tagsOfKind("text-block");
export const TEXT_BLOCK_SELECTOR = TEXT_BLOCK_TAGS.map((t) => t.toLowerCase()).join(", ");
export const BLOCK_TAGS = new Set(tagsOfKind("text-block", "container", "atom-block"));
/** Marks and styled spans, which wrap text and can be split and merged */
export const FORMAT_SELECTOR = tagsOfKind("mark", "style").map((t) => t.toLowerCase()).join(", ");

export const isFormat = (el: Element) => {
  const kind = specOf(el)?.kind;
  return kind === "mark" || kind === "style";
};

/** The marks and spans Clear formatting removes. Links stay. */
export const CLEARABLE_TAGS = NODES.filter(
  (n) => (n.kind === "mark" && n.name !== "link") || n.kind === "style",
).flatMap((n) => [
  n.tag,
  ...(n.aliases ?? []),
]);

/** A non-editable piece. Line breaks are atoms too, but the caret still goes in them. */
export function isAtom(el: Element) {
  const kind = specOf(el)?.kind;
  return (kind === "atom-inline" || kind === "atom-block") && el.tagName !== "BR";
}

/** An inline piece, such as an image or a task checkbox, that sits in a line of text */
export const isInlineAtom = (el: Element) => specOf(el)?.kind === "atom-inline" && el.tagName !== "BR";
