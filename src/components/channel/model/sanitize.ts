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
  // The language of a code block, which the code block's header shows
  if (el.tagName === "CODE") {
    const language = /(?:^|\s)language-[\w+#.-]+/.exec(el.getAttribute("class") ?? "");
    if (language) keep.class = language[0].trim();
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

/** Elements that load or run another document, or restyle the page. A server's fragment can't have them. */
const FRAGMENT_REMOVED = new Set(["IFRAME", "FRAME", "FRAMESET", "OBJECT", "EMBED", "BASE", "META", "LINK", "STYLE"]);

/**
 * Cleans an HTML fragment from a server before it's shown. Event handler
 * attributes, `srcdoc` and `javascript:` URLs are removed, and so are the elements
 * in `FRAGMENT_REMOVED`. The rest is kept, since the fragment is the channel's
 * own markup. Scripts in it don't run, because they're parsed in a template.
 */
export function cleanFragment(content: DocumentFragment): void {
  for (const el of Array.from(content.querySelectorAll("*"))) {
    if (FRAGMENT_REMOVED.has(el.tagName.toUpperCase())) {
      el.remove();
      continue;
    }
    for (const name of el.getAttributeNames()) {
      const value = (el.getAttribute(name) ?? "").replace(/[\u0000-\u0020]/g, "").toLowerCase();
      if (name.startsWith("on") || name === "srcdoc" || value.startsWith("javascript:") || value.startsWith("vbscript:")) {
        el.removeAttribute(name);
      }
    }
  }
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
