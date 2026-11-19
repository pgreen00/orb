/**
 * Converters from the editor's saved HTML to other formats. Each takes a
 * container element holding that HTML, which is already normalized: no runtime
 * attributes, and pieces are the `data-*` spans of the schema.
 */

export type ExportFormat = "html" | "text" | "markdown" | "json";
export type ImportFormat = "html" | "text" | "markdown";

/** One node of the JSON tree from `toJSON`. Text nodes have `text`, others have `children`. */
export interface JsonNode {
  type: string;
  attrs?: Record<string, string>;
  marks?: { type: string; attrs?: Record<string, string> }[];
  text?: string;
  children?: JsonNode[];
}

/*
 * Both converters first read the HTML into the tree below, so what each element
 * means is decided in one place. The export is lossy on purpose: underline,
 * colors, fonts, sizes, backgrounds, sub- and superscript, alignment, indents
 * and the table of contents have no Markdown or JSON form. Their text is kept
 * and their formatting is dropped. Video is dropped too, since neither format
 * has a node for it.
 */

type Mark = "bold" | "italic" | "strike" | "code" | "link";
type MarkInline = Extract<Inline, { t: "mark" }>;

type Inline =
  | { t: "text"; s: string }
  | { t: "break" }
  | { t: "mark"; mark: Mark; href?: string; children: Inline[] }
  | { t: "piece"; kind: "mention" | "tag" | "placeholder"; id: string; label: string }
  | { t: "img"; src: string; alt: string };

type Content = Inline | Block;
type Cell = { header: boolean; children: Inline[] };
type Item = { task: boolean; checked: boolean; children: Content[] };
type ListBlock = { t: "list"; ordered: boolean; start?: string; items: Item[] };
type Row = { cells: Cell[] };

type Block =
  | { t: "paragraph"; children: Inline[] }
  | { t: "heading"; level: number; children: Inline[] }
  | { t: "quote"; children: Block[] }
  | ListBlock
  | { t: "code"; language?: string; text: string }
  | { t: "rule" }
  | { t: "image"; src: string; alt: string }
  | { t: "embed"; provider: string; id: string; href: string }
  | { t: "table"; rows: Row[] };

const INLINE_TYPES = new Set<string>(["text", "break", "mark", "piece", "img"]);
const isInline = (node: Content): node is Inline => INLINE_TYPES.has(node.t);

const PIECE_ATTRS: [string, "mention" | "tag" | "placeholder"][] = [
  ["data-mention", "mention"],
  ["data-tag", "tag"],
  ["data-param", "placeholder"],
];

/** Where a video embed's page is, from its provider and video ID */
const EMBED_LINKS = new Map<string, (id: string) => string>([
  ["youtube", (id) => `https://www.youtube.com/watch?v=${id}`],
  ["vimeo", (id) => `https://vimeo.com/${id}`],
]);

const elementOf = (node: Node | undefined) => (node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : undefined);
const isBlankText = (node: Node) => node.nodeType === Node.TEXT_NODE && !node.textContent?.trim();

/** Whether content has anything to show. Line breaks and blank text don't count, so an empty line has no content. */
const hasContent = (nodes: Content[]): boolean =>
  nodes.some((n) => !isInline(n) || (n.t === "text" ? !!n.s.trim() : n.t === "mark" ? hasContent(n.children) : n.t !== "break"));

/** The blocks in a container. Inline content between blocks is gathered into paragraphs. */
function blocksIn(parent: Element): Block[] {
  const out: Block[] = [];
  let run: Inline[] = [];
  const flush = () => {
    if (hasContent(run)) out.push({ t: "paragraph", children: run });
    run = [];
  };
  for (const node of Array.from(parent.childNodes)) {
    const el = elementOf(node);
    const blocks = el && blocksOf(el);
    if (blocks) {
      flush();
      out.push(...blocks);
    } else {
      run.push(...inlineOf(node));
    }
  }
  flush();
  return out;
}

/** The blocks an element stands for, or undefined when it's inline content */
function blocksOf(el: Element): Block[] | undefined {
  const tag = el.tagName;
  if (tag === "P") return [{ t: "paragraph", children: blockInlines(el) }];
  if (/^H[1-6]$/.test(tag)) return [{ t: "heading", level: Number(tag[1]), children: blockInlines(el) }];
  switch (tag) {
    case "PRE": {
      const language = /\blanguage-([\w+#-]+)/.exec(el.querySelector("code")?.className ?? "")?.[1];
      return [{ t: "code", language, text: el.textContent ?? "" }];
    }
    case "BLOCKQUOTE":
      return [{ t: "quote", children: blocksIn(el) }];
    case "UL":
    case "OL":
      return [listOf(el)];
    case "TABLE":
      return [tableOf(el as HTMLTableElement)];
    case "HR":
      return [{ t: "rule" }];
    case "FIGURE":
      return figureOf(el);
    case "NAV":
      return el.hasAttribute("data-toc") ? [] : undefined;
    default:
      return undefined;
  }
}

/** A figure holds one picture or embed, and its caption, which becomes a paragraph after it */
function figureOf(el: Element): Block[] {
  const blocks: Block[] = [];
  const provider = el.getAttribute("data-embed") ?? "";
  const frame = el.querySelector("iframe");
  const img = el.querySelector("img");
  const link = EMBED_LINKS.get(provider);
  if (link && frame) {
    const id = (frame.getAttribute("src") ?? "").split(/[?#]/)[0].split("/").pop() ?? "";
    blocks.push({ t: "embed", provider, id, href: link(id) });
  } else if (img) {
    blocks.push({ t: "image", src: img.getAttribute("src") ?? "", alt: img.getAttribute("alt") ?? "" });
  }
  const caption = el.querySelector("figcaption");
  const children = caption ? childInlines(caption) : [];
  if (hasContent(children)) blocks.push({ t: "paragraph", children });
  return blocks;
}

function listOf(el: Element): ListBlock {
  const items = Array.from(el.children)
    .filter((li) => li.tagName === "LI")
    .map((li): Item => {
      const nodes = Array.from(li.childNodes);
      // A task item starts with its checkbox, which stands in for the bullet
      const box = elementOf(nodes.find((n) => !isBlankText(n)));
      const task = box?.tagName === "INPUT";
      const children = nodes.filter((n) => !(task && n === box)).flatMap(contentOf);
      const first = children[0];
      if (task && first?.t === "text") children[0] = { t: "text", s: first.s.trimStart() };
      return { task, checked: task && !!box?.hasAttribute("checked"), children: hasContent(children) ? children : [] };
    });
  return { t: "list", ordered: el.tagName === "OL", start: el.getAttribute("start") ?? undefined, items };
}

/** A node inside a list item: a nested block, or inline content */
function contentOf(node: Node): Content[] {
  const el = elementOf(node);
  return (el && blocksOf(el)) || inlineOf(node);
}

function tableOf(table: HTMLTableElement): Block {
  return {
    t: "table",
    rows: Array.from(table.rows, (row) => ({
      cells: Array.from(row.cells, (cell) => ({ header: cell.tagName === "TH", children: blockInlines(cell) })),
    })),
  };
}

function childInlines(el: Element): Inline[] {
  return Array.from(el.childNodes).flatMap((n) => inlineOf(n));
}

/** The content of a text block, where a block with only line breaks in it has none */
function blockInlines(el: Element): Inline[] {
  const children = childInlines(el);
  return hasContent(children) ? children : [];
}

function inlineOf(node: Node): Inline[] {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ? [{ t: "text", s: node.textContent }] : [];
  const el = elementOf(node);
  if (!el) return [];
  const wrap = (mark: Mark, href?: string): Inline[] => [{ t: "mark", mark, href, children: childInlines(el) }];
  switch (el.tagName) {
    case "BR":
      return [{ t: "break" }];
    case "IMG":
      return [{ t: "img", src: el.getAttribute("src") ?? "", alt: el.getAttribute("alt") ?? "" }];
    case "STRONG":
    case "B":
      return wrap("bold");
    case "EM":
    case "I":
      return wrap("italic");
    case "S":
    case "DEL":
    case "STRIKE":
      return wrap("strike");
    case "CODE":
      return [{ t: "mark", mark: "code", children: [{ t: "text", s: el.textContent ?? "" }] }];
    case "A": {
      const href = el.getAttribute("href");
      return href ? wrap("link", href) : childInlines(el);
    }
    case "SPAN": {
      const piece = pieceOf(el);
      return piece ? [piece] : childInlines(el);
    }
    default:
      return childInlines(el);
  }
}

function pieceOf(el: Element): Inline | undefined {
  for (const [attr, kind] of PIECE_ATTRS) {
    const id = el.getAttribute(attr);
    if (id !== null) return { t: "piece", kind, id, label: el.textContent ?? "" };
  }
  return undefined;
}

// Markdown

/**
 * Where the text being written sits. `start` means the next text begins a line,
 * where `#`, `-`, `+` and `1.` would be block syntax. `br` is how a line break
 * is written, and `cell` means inside a table cell, where `|` must be escaped.
 */
interface Ctx {
  start: boolean;
  br: string;
  cell: boolean;
}

const proseCtx = (): Ctx => ({ start: true, br: "\\\n", cell: false });
const headingCtx = (): Ctx => ({ start: false, br: "<br>", cell: false });
const cellCtx = (): Ctx => ({ start: false, br: "<br>", cell: true });

/** Drops the spaces at a line's ends, which Markdown doesn't keep */
const trimLine = (s: string) => s.replace(/^[ \t]+|[ \t]+$/g, "");

/** Escapes the characters that Markdown would read as syntax in plain text */
function escapeText(text: string, start: boolean, cell: boolean): string {
  let out = text.replace(/[\\*_`[\]<>]/g, "\\$&");
  if (cell) out = out.replace(/\|/g, "\\|");
  if (start) out = out.replace(/^(\s*)([#+-])/, "$1\\$2").replace(/^(\s*\d+)\./, "$1\\.");
  return out;
}

/** A link or image address, with the characters that would end it escaped */
const dest = (url: string) => url.replace(/ /g, "%20").replace(/\|/g, "%7C").replace(/[()]/g, "\\$&");

/** A code span, with a backtick fence longer than any run in the code */
function codeSpan(text: string, cell: boolean): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  const pad = /^`|`$/.test(text) || (/^ /.test(text) && / $/.test(text) && !!text.trim()) ? " " : "";
  const body = cell ? text.replace(/\|/g, "\\|") : text;
  return fence + pad + body + pad + fence;
}

function mdInline(nodes: Inline[], ctx: Ctx): string {
  return nodes.map((node) => mdInlineNode(node, ctx)).join("");
}

function mdInlineNode(node: Inline, ctx: Ctx): string {
  switch (node.t) {
    case "text": {
      const out = escapeText(node.s, ctx.start, ctx.cell);
      if (/\S/.test(node.s)) ctx.start = false;
      return out;
    }
    case "break":
      ctx.start = true;
      return ctx.br;
    case "img":
      ctx.start = false;
      return `![${escapeText(node.alt, false, ctx.cell)}](${dest(node.src)})`;
    case "piece": {
      const out = node.kind === "placeholder" ? `{{${node.id}}}` : escapeText(node.label, ctx.start, ctx.cell);
      ctx.start = false;
      return out;
    }
    case "mark":
      return mdMark(node, ctx);
  }
}

function mdMark(node: MarkInline, ctx: Ctx): string {
  if (node.mark === "code") {
    const text = node.children.map((n) => (n.t === "text" ? n.s : "")).join("");
    if (!text) return "";
    ctx.start = false;
    return codeSpan(text, ctx.cell);
  }
  // Spaces inside a delimiter aren't read as emphasis, so they're moved outside it
  const inner = mdInline(node.children, ctx);
  const lead = /^[ \t]*/.exec(inner)![0];
  const trail = /[ \t]*$/.exec(inner)![0];
  const core = inner.slice(lead.length, inner.length - trail.length);
  if (!core) return inner;
  const [open, close] = delimiters(node);
  return lead + open + core + close + trail;
}

function delimiters(node: MarkInline): [string, string] {
  switch (node.mark) {
    case "bold":
      return ["**", "**"];
    case "italic":
      return ["*", "*"];
    case "strike":
      return ["~~", "~~"];
    default:
      return ["[", `](${dest(node.href ?? "")})`];
  }
}

/** Blocks joined the way Markdown separates them: a blank line between each */
function mdBlocks(blocks: Block[]): string {
  return blocks.map(mdBlock).filter(Boolean).join("\n\n");
}

function mdBlock(block: Block): string {
  switch (block.t) {
    case "paragraph":
      return trimLine(mdInline(block.children, proseCtx()));
    case "heading": {
      const text = trimLine(mdInline(block.children, headingCtx()));
      return text ? `${"#".repeat(block.level)} ${text}` : "";
    }
    case "quote": {
      const text = mdBlocks(block.children);
      return text ? text.split("\n").map((line) => (line ? `> ${line}` : ">")).join("\n") : "";
    }
    case "list":
      return block.items.map((item, i) => mdItem(item, block, i)).join("\n");
    case "code": {
      const longest = Math.max(2, ...(block.text.match(/`+/g) ?? []).map((run) => run.length));
      const fence = "`".repeat(longest + 1);
      return `${fence}${block.language ?? ""}\n${block.text ? block.text + "\n" : ""}${fence}`;
    }
    case "rule":
      return "---";
    case "image":
      return `![${escapeText(block.alt, false, false)}](${dest(block.src)})`;
    case "embed":
      return `[${escapeText(block.href, false, false)}](${dest(block.href)})`;
    case "table":
      return mdTable(block.rows);
  }
}

/** A list item. Its lines after the first are indented to the width of its marker. */
function mdItem(item: Item, list: ListBlock, index: number): string {
  const marker = list.ordered ? `${(list.start ? Number(list.start) : 1) + index}. ` : "- ";
  const box = item.task ? (item.checked ? "[x] " : "[ ] ") : "";
  const [first, ...rest] = mdContent(item.children).split("\n");
  const indent = " ".repeat(marker.length);
  return [marker + box + first, ...rest.map((line) => (line ? indent + line : ""))].join("\n").trimEnd();
}

/** Content inside a list item: runs of inline text, and nested blocks, one per line */
function mdContent(content: Content[]): string {
  const parts: string[] = [];
  let run: Inline[] = [];
  const flush = () => {
    const text = trimLine(mdInline(run, proseCtx()));
    if (text) parts.push(text);
    run = [];
  };
  for (const node of content) {
    if (isInline(node)) {
      run.push(node);
    } else {
      flush();
      const text = mdBlock(node);
      if (text) parts.push(text);
    }
  }
  flush();
  return parts.join("\n");
}

/** A GFM table. The first row is the header. Cells are single lines, with `<br>` for breaks. */
function mdTable(rows: Row[]): string {
  const width = Math.max(0, ...rows.map((row) => row.cells.length));
  if (!width) return "";
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  const lines = rows.map((row) => {
    const cells = row.cells.map((cell) => trimLine(mdInline(cell.children, cellCtx())));
    return line([...cells, ...Array(width - cells.length).fill("")]);
  });
  return [lines[0], line(Array(width).fill("---")), ...lines.slice(1)].join("\n");
}

export function toMarkdown(root: HTMLElement): string {
  const text = mdBlocks(blocksIn(root));
  return text ? text + "\n" : "";
}

// JSON

type JsonMark = NonNullable<JsonNode["marks"]>[number];

/** A node with only the attributes and children that have content */
function jsonNode(type: string, attrs: Record<string, string | undefined> = {}, children: JsonNode[] = []): JsonNode {
  const node: JsonNode = { type };
  const kept = Object.entries(attrs).filter((entry): entry is [string, string] => !!entry[1]);
  if (kept.length) node.attrs = Object.fromEntries(kept);
  if (children.length) node.children = children;
  return node;
}

function jsonBlock(block: Block): JsonNode {
  switch (block.t) {
    case "paragraph":
      return jsonNode("paragraph", {}, jsonInline(block.children));
    case "heading":
      return jsonNode("heading", { level: String(block.level) }, jsonInline(block.children));
    case "quote":
      return jsonNode("blockquote", {}, block.children.map(jsonBlock));
    case "list":
      return jsonList(block);
    case "code":
      return jsonNode("codeBlock", { language: block.language }, block.text ? [{ type: "text", text: block.text }] : []);
    case "rule":
      return { type: "horizontalRule" };
    case "image":
      return jsonNode("image", { src: block.src, alt: block.alt });
    case "embed":
      return jsonNode("embed", { provider: block.provider, id: block.id });
    case "table":
      return jsonNode(
        "table",
        {},
        block.rows.map((row) =>
          jsonNode(
            "tableRow",
            {},
            row.cells.map((cell) => jsonNode(cell.header ? "tableHeader" : "tableCell", {}, jsonInline(cell.children))),
          ),
        ),
      );
  }
}

function jsonList(list: ListBlock): JsonNode {
  const allTasks = list.items.length > 0 && list.items.every((item) => item.task);
  const type = list.ordered ? "orderedList" : allTasks ? "taskList" : "bulletList";
  const items = list.items.map((item) =>
    jsonNode("listItem", item.task ? { checked: String(item.checked) } : {}, jsonContent(item.children)),
  );
  return jsonNode(type, { start: list.start }, items);
}

function jsonContent(content: Content[]): JsonNode[] {
  const out: JsonNode[] = [];
  for (const node of content) {
    if (isInline(node)) jsonInline([node], out);
    else out.push(jsonBlock(node));
  }
  return out;
}

/** Inline nodes, with each text node carrying the marks around it. Adjacent text with the same marks is merged. */
function jsonInline(nodes: Inline[], out: JsonNode[] = [], marks: JsonMark[] = []): JsonNode[] {
  for (const node of nodes) {
    switch (node.t) {
      case "text":
        addText(out, node.s, marks);
        break;
      case "break":
        out.push({ type: "hardBreak" });
        break;
      case "img":
        out.push(jsonNode("image", { src: node.src, alt: node.alt }));
        break;
      case "piece":
        out.push(jsonNode(node.kind, { id: node.id, label: node.label }));
        break;
      case "mark": {
        const mark: JsonMark = node.mark === "link" ? { type: "link", attrs: { href: node.href ?? "" } } : { type: node.mark };
        // A mark already around the text isn't added twice, such as bold inside bold
        const nested = marks.some((m) => m.type === mark.type) ? marks : [...marks, mark];
        jsonInline(node.children, out, nested);
        break;
      }
    }
  }
  return out;
}

function addText(out: JsonNode[], text: string, marks: JsonMark[]) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last?.type === "text" && JSON.stringify(last.marks ?? []) === JSON.stringify(marks)) {
    last.text = (last.text ?? "") + text;
  } else {
    out.push(marks.length ? { type: "text", text, marks } : { type: "text", text });
  }
}

export function toJSON(root: HTMLElement): JsonNode[] {
  return blocksIn(root).map(jsonBlock);
}
