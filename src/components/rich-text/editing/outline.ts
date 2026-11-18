/**
 * Headings as the outline and table of contents see them: their ids, the TOC
 * built from them, and jumping to one.
 */
import { insertSeparator } from "./blocks";

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
const TOC_SELECTOR = "nav[data-toc]";
/** The check the schema applies to a heading id. An id it would drop is never made. */
const ID_PATTERN = /^[A-Za-z][\w-]*$/;

/** The table of contents each nav was last built from, so an unchanged one isn't rebuilt */
const tocSignatures = new WeakMap<Element, string>();

/**
 * The headings in document order. Those inside a table of contents are left out,
 * and so are empty ones, which get their id once they have text.
 */
export function headingsOf(root: HTMLElement): HTMLHeadingElement[] {
  return Array.from(root.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR)).filter(
    (h) => !h.closest(TOC_SELECTOR) && headingText(h) !== "",
  );
}

/** The heading's text on one line, as the outline and the table of contents show it */
export function headingText(heading: Element): string {
  return (heading.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** A slug from the heading's text. An id must start with a letter, so a leading digit gets a prefix. */
function slugOf(heading: Element): string {
  const slug = headingText(heading).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) return "heading";
  return /^[a-z]/.test(slug) ? slug : `heading-${slug}`;
}

/**
 * Gives each heading an id. An id it already has is kept when no other element
 * in the editor shares it. Otherwise the id is made from the text, with -2, -3
 * and so on for repeats. Running it again changes nothing.
 */
export function assignHeadingIds(root: HTMLElement): void {
  const headings = headingsOf(root);
  const headingSet = new Set<Element>(headings);
  const counts = new Map<string, number>();
  const taken = new Set<string>();
  for (const el of Array.from(root.querySelectorAll("[id]"))) {
    counts.set(el.id, (counts.get(el.id) ?? 0) + 1);
    if (!headingSet.has(el)) taken.add(el.id);
  }
  // Kept ids are reserved first, so a slug never takes an id a heading already has
  const kept = new Set<Element>(headings.filter((h) => ID_PATTERN.test(h.id) && counts.get(h.id) === 1));
  for (const h of kept) taken.add(h.id);
  for (const heading of headings) {
    if (kept.has(heading)) continue;
    const base = slugOf(heading);
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    if (heading.id !== id) heading.id = id;
  }
}

/** The level, text and id of each heading in order. It changes when the table of contents must be rebuilt. */
export function tocSignature(root: HTMLElement): string {
  return JSON.stringify(headingsOf(root).map((h) => [h.tagName, headingText(h), h.id]));
}

/**
 * Nests each heading under the item above it, one list deeper per level. A
 * skipped level nests one step under the item above, so no empty item is made.
 */
export function nestHeadings(headings: HTMLElement[], item: (heading: HTMLElement) => HTMLLIElement): HTMLOListElement {
  const top = document.createElement("ol");
  const stack: { level: number; item?: HTMLLIElement; list?: HTMLOListElement }[] = [{ level: 0, list: top }];
  for (const heading of headings) {
    const level = Number(heading.tagName.slice(1));
    while (stack[stack.length - 1].level >= level) stack.pop();
    const parent = stack[stack.length - 1];
    // A sublist is only made once an item needs one, so an item never has an empty list
    if (!parent.list) {
      parent.list = document.createElement("ol");
      parent.item!.append(parent.list);
    }
    const li = item(heading);
    parent.list.append(li);
    stack.push({ level, item: li });
  }
  return top;
}

function tocItem(heading: HTMLElement): HTMLLIElement {
  const li = document.createElement("li");
  const link = document.createElement("a");
  link.setAttribute("href", `#${heading.id}`);
  link.textContent = headingText(heading);
  li.append(link);
  return li;
}

/** The table of contents' list, or nothing when there are no headings */
function tocContents(root: HTMLElement): Node[] {
  const headings = headingsOf(root);
  return headings.length ? [nestHeadings(headings, tocItem)] : [];
}

/**
 * Rebuilds the contents of each table of contents whose headings changed.
 * The nav elements stay, so the change is only to what's inside them.
 * Returns true when any was rebuilt. Ids must be assigned first.
 */
export function refreshToc(root: HTMLElement): boolean {
  const signature = tocSignature(root);
  const stale = Array.from(root.querySelectorAll<HTMLElement>(TOC_SELECTOR)).filter(
    (nav) => tocSignatures.get(nav) !== signature,
  );
  for (const nav of stale) {
    nav.replaceChildren(...tocContents(root));
    tocSignatures.set(nav, signature);
  }
  return stale.length > 0;
}

/**
 * Puts a table of contents at the caret, with a paragraph after it. It takes
 * the place of the rule insertSeparator makes, so both place blocks the same way.
 */
export function insertToc(root: HTMLElement, range: Range): Range {
  assignHeadingIds(root);
  const caret = insertSeparator(root, range);
  const nav = document.createElement("nav");
  nav.setAttribute("data-toc", "");
  // Live edits only clean the blocks they touch, so the nav is marked as a piece here.
  nav.setAttribute("contenteditable", "false");
  nav.append(...tocContents(root));
  (caret.startContainer as Element).previousElementSibling!.replaceWith(nav);
  tocSignatures.set(nav, tocSignature(root));
  return caret;
}

/** The heading a table of contents link points at, so a click on the link can go there in the editor */
export function headingForLink(root: HTMLElement, link: Element): HTMLHeadingElement | null {
  const href = link.getAttribute("href") ?? "";
  return headingsOf(root).find((h) => href === `#${h.id}`) ?? null;
}

/**
 * Scrolls the heading to the top of the scroller and returns a collapsed range
 * at its start. The editor is shadow DOM, so this is done in script, not with a fragment.
 */
export function goToHeading(root: HTMLElement, heading: HTMLElement): Range {
  heading.scrollIntoView({ block: "start" });
  const range = document.createRange();
  // A heading outside the editor has no caret position, so the caret goes to the editor's start
  range.setStart(root.contains(heading) ? heading : root, 0);
  range.collapse(true);
  return range;
}
