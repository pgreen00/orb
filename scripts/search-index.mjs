/**
 * Builds the site search index from Eleventy's rendered pages. Each page's
 * `<main>` is split into sections at its h1, h2, and h3 headings, and every
 * section becomes one searchable record. The browser loads the JSON into
 * DuckDB-WASM and builds a full-text index over it (see docs/public/search.js).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "htmlparser2";

// Never indexed: code that isn't content, icons, and the page's own TOC
const SKIP = new Set([
  "script",
  "style",
  "template",
  "noscript",
  "svg",
  "iconify-icon",
  "orb-toc",
]);

// Elements that sit inside a line of text, so no space is added around them
const INLINE = new Set([
  "a",
  "abbr",
  "b",
  "code",
  "em",
  "i",
  "kbd",
  "mark",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
]);

const isElement = (node) =>
  node.type === "tag" || node.type === "script" || node.type === "style";

function find(node, test) {
  if (isElement(node) && test(node)) return node;
  for (const child of node.children ?? []) {
    const found = find(child, test);
    if (found) return found;
  }
  return null;
}

function textOf(node) {
  if (node.type === "text") return node.data;
  if (!isElement(node) && node.type !== "root") return "";
  if (isElement(node) && SKIP.has(node.name)) return "";
  const text = (node.children ?? []).map(textOf).join("");
  return isElement(node) && !INLINE.has(node.name) ? ` ${text} ` : text;
}

const clean = (text) => text.replace(/\s+/g, " ").trim();

function sectionsOf(html, url) {
  const doc = parseDocument(html);
  const main = find(doc, (el) => el.name === "main");
  if (!main) return [];

  const titleEl = find(doc, (el) => el.name === "title");
  const fallbackTitle = clean(textOf(titleEl ?? { type: "text", data: "" }))
    .replace(/\s*\|\s*Orb Design System$/, "");

  const sections = [];
  let page = fallbackTitle;
  let h2 = "";
  let current = { anchor: "", heading: "", parts: [] };

  const start = (heading, anchor, intro = false) => {
    sections.push(current);
    current = { anchor, heading, parts: [], intro };
  };

  const walk = (node) => {
    if (node.type === "text") {
      current.parts.push(node.data);
      return;
    }
    if (!isElement(node) || SKIP.has(node.name)) return;
    // Opt-out for content that repeats other pages, plus Mermaid source
    if ("data-search-skip" in node.attribs) return;
    if (node.attribs.class?.split(/\s+/).includes("mermaid")) return;

    const level = /^h([1-3])$/.exec(node.name)?.[1];
    if (level) {
      const text = clean(textOf(node));
      const anchor = node.attribs.id ? `#${node.attribs.id}` : current.anchor;
      if (level === "1") {
        page = text || page;
        h2 = "";
        start("", "", true);
      } else if (level === "2") {
        h2 = text;
        start(text, anchor);
      } else {
        start(h2 ? `${h2} › ${text}` : text, anchor);
      }
      return;
    }

    // A live demo renders its HTML and then shows the same HTML as code.
    // Index only the code, so the text isn't counted twice.
    const isDemo = node.name === "div" && node.attribs.id?.startsWith("code-demo-");
    let skippedPreview = false;
    const inline = INLINE.has(node.name);
    if (!inline) current.parts.push(" ");
    for (const child of node.children) {
      if (isDemo && !skippedPreview && isElement(child)) {
        skippedPreview = true;
        continue;
      }
      walk(child);
    }
    if (!inline) current.parts.push(" ");
  };

  walk(main);
  sections.push(current);

  return sections
    .map(({ anchor, heading, parts, intro }) => ({
      url: url + anchor,
      page,
      heading,
      body: clean(parts.join("")),
      intro: !!intro,
    }))
    // The intro is kept even when empty, so a page can always be found by its title
    .filter((s) => s.intro || s.heading || s.body);
}

/**
 * @param {{ url: string, outputPath: string, content: string }[]} results
 *   Eleventy's `eleventy.after` results
 * @param {string} outputDir
 */
export async function buildSearchIndex(results, outputDir) {
  const pages = results
    .filter((r) => typeof r.outputPath === "string" && r.outputPath.endsWith(".html"))
    .sort((a, b) => a.url.localeCompare(b.url));
  const records = pages
    .flatMap((r) => sectionsOf(r.content, r.url))
    .map((record, id) => ({ id, ...record }));
  const file = path.join(outputDir, "search-index.json");
  await fs.writeFile(file, JSON.stringify(records));
  return { file, pages: pages.length, records: records.length };
}
