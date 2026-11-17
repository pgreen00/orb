import { closestIn, isBlock, isTaskItem } from "./dom";
import { blocksIn } from "./blocks";
import { keep, restore } from "./selection";

export type ListType = "ol" | "ul";

/** The list items the range touches. A heading in an item counts as its item. */
export function listItems(root: HTMLElement, range: Range): HTMLElement[] {
  const items = blocksIn(root, range).map((block) => closestIn(block, root, ["LI"]) ?? block);
  return Array.from(new Set(items));
}

const inList = (item: HTMLElement, type: ListType) =>
  item.tagName === "LI" && item.parentElement?.tagName === type.toUpperCase();

export function listType(root: HTMLElement, range: Range): ListType | null {
  const items = listItems(root, range);
  if (!items.length) return null;
  if (items.every((i) => inList(i, "ol"))) return "ol";
  if (items.every((i) => inList(i, "ul"))) return "ul";
  return null;
}

/** Joins a list to matching lists right before or after it. */
function mergeAdjacent(list: HTMLElement) {
  const previous = list.previousElementSibling;
  if (previous?.tagName === list.tagName) {
    previous.append(...Array.from(list.childNodes));
    list.remove();
    list = previous as HTMLElement;
  }
  const next = list.nextElementSibling;
  if (next?.tagName === list.tagName) {
    list.append(...Array.from(next.childNodes));
    next.remove();
  }
}

/** Takes an item out of its list as a paragraph, splitting the list around it. Returns the block that holds its content now. */
function unwrapListItem(item: HTMLElement): HTMLElement {
  const list = item.parentElement!;
  const rest: Node[] = [];
  for (let n = item.nextSibling; n; n = n.nextSibling) rest.push(n);
  if (rest.length) {
    const after = list.cloneNode(false) as HTMLElement;
    after.append(...rest);
    list.after(after);
  }
  let holder: HTMLElement;
  if (Array.from(item.childNodes).some(isBlock)) {
    holder = Array.from(item.childNodes).find(isBlock) as HTMLElement;
    list.after(...Array.from(item.childNodes));
  } else {
    holder = document.createElement("p");
    if (item.style.textAlign) holder.style.textAlign = item.style.textAlign;
    holder.append(...Array.from(item.childNodes));
    list.after(holder);
  }
  item.remove();
  if (!list.children.length) list.remove();
  return holder;
}

/**
 * Moves an item out one level, under the item it was in. Items after it
 * become its children, so nothing changes order. Top-level items become
 * paragraphs. Returns the element that holds the item's content now.
 */
export function outdentItem(item: HTMLElement): HTMLElement {
  const list = item.parentElement!;
  const parentItem = list.parentElement;
  if (parentItem?.tagName !== "LI") return unwrapListItem(item);
  const following: Element[] = [];
  for (let n = item.nextElementSibling; n; n = n.nextElementSibling) following.push(n);
  if (following.length) {
    let sub = Array.from(item.children).find((c) => c.tagName === list.tagName) as HTMLElement | undefined;
    if (!sub) item.append((sub = document.createElement(list.tagName)));
    sub.append(...following);
  }
  parentItem.after(item);
  if (!list.children.length) list.remove();
  return item;
}

/** Outdents each selected item, in document order */
export function outdentItems(root: HTMLElement, range: Range): Range {
  const saved = keep(range);
  for (const item of listItems(root, range)) {
    if (item.isConnected) outdentItem(item);
  }
  return restore(saved, root) ?? range;
}

/**
 * Nests the selected items under the item before them. A run of selected
 * items moves together, under the same item, so their order is kept.
 */
export function indentItems(root: HTMLElement, range: Range): Range {
  const saved = keep(range);
  const items = listItems(root, range);
  const selected = new Set(items);
  // Found before anything moves, since moving changes the siblings.
  const targets = new Map<HTMLElement, HTMLElement>();
  for (const item of items) {
    const previous = item.previousElementSibling as HTMLElement | null;
    if (previous?.tagName !== "LI") continue;
    const target = selected.has(previous) ? targets.get(previous) : previous;
    if (target) targets.set(item, target);
  }
  for (const [item, target] of targets) {
    const tag = item.parentElement!.tagName;
    let sub = target.lastElementChild;
    if (sub?.tagName !== tag) target.append((sub = document.createElement(tag)));
    sub.append(item);
  }
  return restore(saved, root) ?? range;
}

/**
 * Puts the selected blocks in a list. If they're all in a list of this type
 * already, takes them out. Lists of the other type switch to this type.
 */
export function toggleList(root: HTMLElement, range: Range, type: ListType): Range {
  const saved = keep(range);
  const replaced = new Map<Node, Node>();
  const items = listItems(root, range);
  if (items.every((item) => inList(item, type))) {
    for (const item of items) {
      if (item.parentElement?.parentElement?.tagName === "LI") outdentItem(item);
      else unwrapListItem(item);
    }
    return restore(saved, root, replaced) ?? range;
  }
  for (const item of items) {
    const list = item.parentElement;
    if (item.tagName === "LI" && list && !inList(item, type) && root.contains(list)) {
      mergeAdjacent(renameList(list, type, replaced));
    }
  }
  const loose = items.filter((item) => item.tagName !== "LI");
  if (loose.length) {
    const list = document.createElement(type);
    loose[0].before(list);
    for (const block of loose) {
      const item = document.createElement("li");
      if (block.style.textAlign) item.style.textAlign = block.style.textAlign;
      // Headings stay headings inside the item. Paragraphs become the item.
      if (/^H\d$/.test(block.tagName)) item.append(block);
      else {
        item.append(...Array.from(block.childNodes));
        replaced.set(block, item);
        block.remove();
      }
      list.append(item);
    }
    mergeAdjacent(list);
  }
  return restore(saved, root, replaced) ?? range;
}

/** Turns a list into one of the other type, keeping its items */
function renameList(list: HTMLElement, type: ListType, replaced: Map<Node, Node>) {
  const next = document.createElement(type);
  for (const attr of Array.from(list.attributes)) next.setAttribute(attr.name, attr.value);
  next.append(...Array.from(list.childNodes));
  list.replaceWith(next);
  replaced.set(list, next);
  return next;
}

/** The lists the selected items belong to, each once */
function listsOf(root: HTMLElement, range: Range): HTMLElement[] {
  const lists = listItems(root, range).map((item) => item.parentElement as HTMLElement | null);
  return Array.from(new Set(lists.filter((list): list is HTMLElement => !!list)));
}

/** Sets the list style of the lists holding the selection. Null restores the default. */
export function setListStyle(root: HTMLElement, range: Range, style: string | null): Range {
  const saved = keep(range);
  for (const list of listsOf(root, range)) {
    if (style) list.style.listStyleType = style;
    else list.style.removeProperty("list-style-type");
    if (!list.getAttribute("style")) list.removeAttribute("style");
  }
  return restore(saved, root) ?? range;
}

/** The list style of the selection's lists, or null when they differ */
export function listStyleOf(root: HTMLElement, range: Range): string | null {
  const values = new Set(listsOf(root, range).map((list) => list.style.getPropertyValue("list-style-type")));
  return values.size === 1 ? [...values][0] : null;
}

/** Checks or unchecks a task. The attribute is what gets saved. */
export function toggleTask(box: HTMLInputElement): Range {
  const on = !box.hasAttribute("checked");
  box.toggleAttribute("checked", on);
  box.checked = on;
  const after = document.createRange();
  after.setStartAfter(box);
  after.collapse(true);
  return after;
}

/** Checks or unchecks the task the caret is in. Returns null outside a task. */
export function toggleTaskAt(root: HTMLElement, range: Range): Range | null {
  const item = closestIn(range.startContainer, root, ["LI"]);
  const box = item && isTaskItem(item) ? item.querySelector<HTMLInputElement>(":scope > input") : null;
  return box ? toggleTask(box) : null;
}

/**
 * Makes the selected items a task list. If they're all tasks already, the
 * checkboxes are removed instead, and the items stay a bulleted list.
 */
export function toggleTaskList(root: HTMLElement, range: Range): Range {
  const items = listItems(root, range);
  if (items.length && items.every(isTaskItem)) {
    for (const item of items) item.querySelector(":scope > input")?.remove();
    return range;
  }
  const target = listType(root, range) === "ul" ? range : toggleList(root, range, "ul");
  for (const item of listItems(root, target)) {
    if (isTaskItem(item)) continue;
    const box = document.createElement("input");
    box.type = "checkbox";
    item.prepend(box);
  }
  return target;
}

/** Whether every selected item is a task, which is what the task list toggle shows */
export function inTaskList(root: HTMLElement, range: Range): boolean {
  const items = listItems(root, range);
  return items.length > 0 && items.every(isTaskItem);
}

