/**
 * Cleans the HTML of a message before it's rendered. Elements that aren't
 * listed are unwrapped, so their text stays. Scripts and their contents are
 * removed. Attributes not listed are dropped, and so are styles other than the
 * four the rich editor writes: color, background, font family and font size.
 */

const TAGS = new Set([
  "P", "BR", "STRONG", "B", "EM", "I", "U", "S", "DEL", "CODE", "PRE", "BLOCKQUOTE",
  "UL", "OL", "LI", "A", "H1", "H2", "H3", "H4", "H5", "H6", "HR", "SPAN", "IMG",
]);
const REMOVED = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT", "SVG", "MATH"]);
const STYLES = ["color", "background-color", "font-family", "font-size"];
const DATA_ATTRIBUTES = ["data-mention", "data-tag", "data-command", "data-param"];

/** A link may go to web addresses, mail, phone numbers, and relative URLs */
function isSafeHref(value: string) {
  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(value, document.baseURI).protocol);
  } catch {
    return false;
  }
}

function cleanElement(el: Element) {
  const keep: Record<string, string> = {};
  if (el.tagName === "A") {
    const href = el.getAttribute("href") ?? "";
    if (!isSafeHref(href)) return false;
    keep.href = href;
    keep.rel = "noopener noreferrer";
    keep.target = "_blank";
  }
  if (el.tagName === "IMG") {
    const src = el.getAttribute("src") ?? "";
    if (!isSafeHref(src) && !src.startsWith("data:image/")) return false;
    keep.src = src;
    keep.alt = el.getAttribute("alt") ?? "";
  }
  const styles = (el as HTMLElement).style;
  const kept = STYLES.map((prop) => [prop, styles.getPropertyValue(prop)] as const).filter(([, value]) => value && !value.includes("url("));
  for (const name of el.getAttributeNames()) el.removeAttribute(name);
  for (const [name, value] of Object.entries(keep)) el.setAttribute(name, value);
  if (el.tagName === "SPAN") {
    for (const name of DATA_ATTRIBUTES) {
      const value = el.getAttribute(name);
      if (value !== null) el.setAttribute(name, value);
    }
  }
  if (kept.length && el.tagName === "SPAN") {
    for (const [prop, value] of kept) (el as HTMLElement).style.setProperty(prop, value);
  }
  return true;
}

/** The safe HTML of a message */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  for (const el of Array.from(body.querySelectorAll("*"))) {
    if (REMOVED.has(el.tagName)) el.remove();
    else if (!TAGS.has(el.tagName) || !cleanElement(el)) el.replaceWith(...Array.from(el.childNodes));
  }
  return body.innerHTML;
}
