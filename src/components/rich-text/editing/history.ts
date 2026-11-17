import { isText } from "./dom";
import { getRange, selectRange } from "./selection";

export interface Change {
  at: number;
  removed: string;
  added: string;
}

/**
 * A point as the path of runs down from the editor, plus an offset. A run is
 * a text node or several adjacent text nodes, since they come back merged
 * after the HTML is saved and parsed again.
 */
export interface Point {
  path: number[];
  offset: number;
}

export interface Selected {
  anchor: Point;
  focus: Point;
}

export interface Step {
  change: Change;
  before: Selected | null;
  after: Selected | null;
}

/** The part of `a` that differs from `b`, by character position */
function diff(a: string, b: string): Change {
  let start = 0;
  const max = Math.min(a.length, b.length);
  while (start < max && a.charCodeAt(start) === b.charCodeAt(start)) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a.charCodeAt(endA - 1) === b.charCodeAt(endB - 1)) {
    endA--;
    endB--;
  }
  return { at: start, removed: a.slice(start, endA), added: b.slice(start, endB) };
}

const revert = (html: string, c: Change) => html.slice(0, c.at) + c.removed + html.slice(c.at + c.added.length);
const reapply = (html: string, c: Change) => html.slice(0, c.at) + c.added + html.slice(c.at + c.removed.length);

/** Children with empty text skipped and adjacent text grouped, the way they'll parse back */
function runs(parent: Node): Node[][] {
  const result: Node[][] = [];
  for (const child of Array.from(parent.childNodes)) {
    if (isText(child) && !child.length) continue;
    const last = result[result.length - 1];
    if (isText(child) && last && isText(last[0])) last.push(child);
    else result.push([child]);
  }
  return result;
}

/** The run indexes from `root` down to `node`, one per level */
function pathTo(root: Node, node: Node): number[] {
  const path: number[] = [];
  for (let n = node; n !== root; n = n.parentNode!) {
    path.unshift(runs(n.parentNode!).findIndex((run) => run[0] === n));
  }
  return path;
}

export const samePoint = (a: Point, b: Point) =>
  a.offset === b.offset && a.path.length === b.path.length && a.path.every((index, i) => index === b.path[i]);

export function toPoint(root: Node, node: Node, offset: number): Point {
  if (isText(node) && node.length) {
    const parent = node.parentNode!;
    const list = runs(parent);
    const index = list.findIndex((run) => run.includes(node));
    let chars = offset;
    for (const text of list[index]) {
      if (text === node) break;
      chars += (text as Text).length;
    }
    return { path: [...pathTo(root, parent), index], offset: chars };
  }
  // An element, or an empty text node: the offset is counted in child nodes, then in runs.
  const element = isText(node) ? node.parentNode! : node;
  const children = Array.from(element.childNodes);
  const domOffset = isText(node) ? children.indexOf(node as ChildNode) : offset;
  const count = runs(element).filter((run) => children.indexOf(run[0] as ChildNode) < domOffset).length;
  return { path: pathTo(root, element), offset: count };
}

/** The DOM position a point stands for. A text run resolves to a text node and an offset in it. */
export function fromPoint(root: Node, { path, offset }: Point): [Node, number] {
  let node: Node = root;
  for (const index of path) {
    const run = runs(node)[index];
    if (!run) return [root, root.childNodes.length];
    if (isText(run[0])) {
      let rest = offset;
      for (const text of run) {
        const length = (text as Text).length;
        if (rest <= length) return [text, rest];
        rest -= length;
      }
      const last = run[run.length - 1] as Text;
      return [last, last.length];
    }
    node = run[0];
  }
  const children = runs(node);
  if (offset >= children.length) return [node, node.childNodes.length];
  return [node, Array.prototype.indexOf.call(node.childNodes, children[offset][0])];
}

/** The editor's HTML, without the selection marking on a piece, which isn't content */
function htmlOf(root: HTMLElement): string {
  if (!root.querySelector("[data-selected]")) return root.innerHTML;
  const copy = root.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[data-selected]").forEach((el) => el.removeAttribute("data-selected"));
  return copy.innerHTML;
}

function takeSelected(root: HTMLElement): Selected | null {
  const range = getRange(root);
  if (!range) return null;
  return {
    anchor: toPoint(root, range.startContainer, range.startOffset),
    focus: toPoint(root, range.endContainer, range.endOffset),
  };
}

function restoreSelected(root: HTMLElement, { anchor, focus }: Selected): Range | null {
  const range = document.createRange();
  try {
    range.setStart(...fromPoint(root, anchor));
    range.setEnd(...fromPoint(root, focus));
    return range;
  } catch {
    return null;
  }
}

/**
 * Undo and redo. The full HTML is kept once. Each step keeps only the slice
 * that changed, so a long document with many steps doesn't store many copies
 * of it.
 */
export class History {
  private html = "";
  private done: Step[] = [];
  private undone: Step[] = [];
  private selected: Selected | null = null;
  /** Called with each new step, for saving history across a refresh */
  onRecord?: (step: Step, html: string) => void;

  constructor(
    private root: HTMLElement,
    private limit = 200,
  ) {}

  /** Starts over with the current content as the only state. */
  reset() {
    this.html = htmlOf(this.root);
    this.done = [];
    this.undone = [];
    this.selected = takeSelected(this.root);
  }

  /** Saves the current content as a new step, dropping anything to redo. */
  record() {
    const html = htmlOf(this.root);
    const selected = takeSelected(this.root);
    if (html === this.html) {
      this.selected = selected;
      return;
    }
    const step: Step = { change: diff(this.html, html), before: this.selected, after: selected };
    this.done.push(step);
    if (this.done.length > this.limit) this.done.shift();
    this.undone = [];
    this.html = html;
    this.selected = selected;
    this.onRecord?.(step, html);
  }

  undo(): boolean {
    const step = this.done.pop();
    if (!step) return false;
    this.html = revert(this.html, step.change);
    this.undone.push(step);
    this.show(step.before);
    return true;
  }

  redo(): boolean {
    const step = this.undone.pop();
    if (!step) return false;
    this.html = reapply(this.html, step.change);
    this.done.push(step);
    this.show(step.after);
    return true;
  }

  private show(selected: Selected | null) {
    this.root.innerHTML = this.html;
    this.selected = selected;
    const range =
      (selected && restoreSelected(this.root, selected)) ?? endOf(this.root);
    this.root.focus({ preventScroll: true });
    selectRange(range);
  }
}

function endOf(root: HTMLElement): Range {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  return range;
}
