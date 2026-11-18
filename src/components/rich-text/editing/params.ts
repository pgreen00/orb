/** A placeholder the document can hold, such as a customer's name in a template */
export interface ParamDef {
  key: string;
  label: string;
  sample?: string;
  description?: string;
}

/** A placeholder: its text is the label, so it reads well wherever the document goes */
export function paramNode(key: string, label: string): HTMLElement {
  const span = document.createElement("span");
  span.setAttribute("data-param", key);
  span.textContent = label;
  return span;
}

/** A mention of a person, shown as @Name */
export function mentionNode(id: string, name: string): HTMLElement {
  const span = document.createElement("span");
  span.setAttribute("data-mention", id);
  span.textContent = `@${name}`;
  return span;
}

/** A tag, shown as #name */
export function tagNode(id: string, name: string): HTMLElement {
  const span = document.createElement("span");
  span.setAttribute("data-tag", id);
  span.textContent = `#${name}`;
  return span;
}

/** The placeholder keys in the editor, in order, without repeats */
export function paramKeysIn(root: HTMLElement): string[] {
  const keys = Array.from(root.querySelectorAll("[data-param]"), (el) => el.getAttribute("data-param")!);
  return [...new Set(keys)];
}

/**
 * Marks placeholders whose key isn't in `known`, so they show a warning style.
 * The mark is runtime only, and it's removed when saving.
 */
export function markUnknownParams(root: HTMLElement, known: string[]): void {
  for (const el of Array.from(root.querySelectorAll("[data-param]"))) {
    const unknown = !known.includes(el.getAttribute("data-param")!);
    if (unknown) el.setAttribute("data-unknown", "");
    else el.removeAttribute("data-unknown");
  }
}

/**
 * The HTML with each placeholder replaced by its value, as text. Placeholders
 * with no value, and everything else, stay as they are. The input isn't changed.
 */
export function fillParams(html: string, values: Record<string, string>): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  for (const el of Array.from(template.content.querySelectorAll("[data-param]"))) {
    const key = el.getAttribute("data-param")!;
    if (Object.prototype.hasOwnProperty.call(values, key)) el.replaceWith(document.createTextNode(values[key]));
  }
  return template.innerHTML;
}
