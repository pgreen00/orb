import { closestIn, emptyCell, rename } from "./dom";
import { hasVisible, wrapLooseText } from "./blocks";
import { closestBlock, keep, restore } from "./selection";

/** The table cell the range is in, if any */
export function closestCell(root: HTMLElement, range: Range): HTMLTableCellElement | null {
  return closestIn(range.startContainer, root, ["TD", "TH"]) as HTMLTableCellElement | null;
}

export const inTable = (root: HTMLElement, range: Range) => !!closestIn(range.startContainer, root, ["TABLE"]);

export const tableOf = (cell: Element) => cell.closest("table") as HTMLTableElement;
const rowsOf = (table: HTMLTableElement) => Array.from(table.rows);
const cellsOf = (table: HTMLTableElement) => rowsOf(table).flatMap((row) => Array.from(row.cells));

/** A collapsed range at the start of `node` */
export function caretIn(node: Node): Range {
  const range = document.createRange();
  range.setStart(node, 0);
  range.collapse(true);
  return range;
}

/**
 * A caret at the start of a cell's text, or before its line break when it's
 * empty. A caret on the cell element itself has no line box, so Up and Down from
 * it can't tell which line it's on, and the browser moves it sideways.
 */
export function cellCaret(cell: Element): Range {
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  let text = walker.nextNode() as Text | null;
  while (text && !text.length) text = walker.nextNode() as Text | null;
  const range = document.createRange();
  if (text) {
    range.setStart(text, 0);
  } else if (cell.querySelector("br")) {
    range.setStartBefore(cell.querySelector("br")!);
  } else {
    range.setStart(cell, 0);
  }
  range.collapse(true);
  return range;
}

function topOf(root: HTMLElement, el: HTMLElement): HTMLElement {
  let top = el;
  while (top.parentElement !== root) top = top.parentElement!;
  return top;
}

function tableRow(cols: number, tag: "td" | "th"): HTMLTableRowElement {
  const row = document.createElement("tr");
  for (let c = 0; c < cols; c++) row.append(emptyCell(document, tag));
  return row;
}

/**
 * Inserts a table with a header row, at the caret. The text after the caret
 * moves below the table, the way a rule splits a paragraph. Returns the caret
 * in the first header cell.
 */
export function insertTable(root: HTMLElement, range: Range, rows: number, cols: number): Range {
  const table = document.createElement("table");
  table.createTHead().append(tableRow(cols, "th"));
  if (rows > 1) {
    const body = table.createTBody();
    for (let r = 1; r < rows; r++) body.append(tableRow(cols, "td"));
  }
  const at = wrapLooseText(root, range);
  const block = closestBlock(at.startContainer, root);
  const after = document.createElement("p");
  if (block === root) {
    root.append(table, after);
  } else {
    const tail = document.createRange();
    tail.setStart(at.startContainer, at.startOffset);
    tail.setEnd(block, block.childNodes.length);
    after.append(tail.extractContents());
    // A list item's table goes after the whole list, so the list stays intact
    if (block.tagName === "LI") topOf(root, block).after(table, after);
    else {
      block.after(table, after);
      if (!hasVisible(block)) block.remove();
    }
  }
  if (!hasVisible(after)) after.append(document.createElement("br"));
  return cellCaret(table.querySelector("th, td")!);
}

/**
 * Inserts an empty row above or below `row`, and returns it. A table has one
 * header row, which stays first. A row added below the header goes to the top
 * of the body. A row added above it takes the header, and the old header becomes
 * the body's first row.
 */
export function insertRow(row: HTMLTableRowElement, where: "above" | "below"): HTMLTableRowElement {
  const section = row.parentElement!;
  const make = (tag: "td" | "th") => {
    const fresh = document.createElement("tr");
    for (let i = 0; i < row.cells.length; i++) fresh.append(emptyCell(document, tag));
    return fresh;
  };
  if (section.tagName !== "THEAD") {
    const fresh = make("td");
    section.insertBefore(fresh, where === "above" ? row : row.nextSibling);
    return fresh;
  }
  const body = tableOf(row).tBodies[0] ?? tableOf(row).createTBody();
  if (where === "below") {
    const fresh = make("td");
    body.prepend(fresh);
    return fresh;
  }
  const fresh = make("th");
  section.insertBefore(fresh, row);
  body.prepend(row);
  for (const cell of Array.from(row.cells)) rename(cell, "td", new Map());
  return fresh;
}

export function addRowAt(cell: HTMLTableCellElement, where: "above" | "below"): Range {
  // Read first, since a header row that moves to the body has its cells replaced
  const index = cell.cellIndex;
  const fresh = insertRow(cell.parentElement as HTMLTableRowElement, where);
  return cellCaret(fresh.cells[index]);
}

/** Inserts an empty column left or right of the cell, in every row, and returns the caret in it */
export function addColumnAt(cell: HTMLTableCellElement, where: "left" | "right"): Range {
  const table = tableOf(cell);
  const at = where === "left" ? cell.cellIndex : cell.cellIndex + 1;
  for (const row of rowsOf(table)) {
    const tag = row.parentElement?.tagName === "THEAD" ? "th" : "td";
    row.insertBefore(emptyCell(document, tag), row.cells[at] ?? null);
  }
  const colgroup = table.querySelector(":scope > colgroup");
  colgroup?.insertBefore(document.createElement("col"), colgroup.children[at] ?? null);
  return cellCaret((cell.parentElement as HTMLTableRowElement).cells[at]);
}

/** Removes the cell's row. The caret goes to the same column in the row after it, or before it. */
export function deleteRowOf(cell: HTMLTableCellElement): Range {
  const table = tableOf(cell);
  const row = cell.parentElement as HTMLTableRowElement;
  const section = row.parentElement!;
  const rows = rowsOf(table);
  if (rows.length === 1) return deleteTableOf(table);
  const target = rows[rows.indexOf(row) + 1] ?? rows[rows.indexOf(row) - 1];
  const column = Math.min(cell.cellIndex, target.cells.length - 1);
  row.remove();
  if (!section.children.length) section.remove();
  return cellCaret(target.cells[column]);
}

/** Removes the cell's column from every row, and its `col` if there is one */
export function deleteColumnOf(cell: HTMLTableCellElement): Range {
  const table = tableOf(cell);
  const row = cell.parentElement as HTMLTableRowElement;
  const index = cell.cellIndex;
  if (row.cells.length === 1) return deleteTableOf(table);
  for (const each of rowsOf(table)) each.cells[index]?.remove();
  table.querySelectorAll(":scope > colgroup > col")[index]?.remove();
  return cellCaret(row.cells[Math.min(index, row.cells.length - 1)]);
}

export function deleteTableOf(table: HTMLTableElement): Range {
  const paragraph = document.createElement("p");
  paragraph.append(document.createElement("br"));
  table.replaceWith(paragraph);
  return caretIn(paragraph);
}

/**
 * Whether the table's first row is a header. The header row is the first row
 * of the table's `thead`.
 */
export function hasHeaderRow(table: HTMLTableElement): boolean {
  return table.rows[0]?.parentElement?.tagName === "THEAD";
}

/**
 * Moves the first row into the header, with header cells, or back into the
 * body, with data cells.
 */
export function toggleHeaderRow(root: HTMLElement, range: Range): Range {
  const cell = closestCell(root, range);
  if (!cell) return range;
  const table = tableOf(cell);
  const first = table.rows[0];
  const saved = keep(range);
  const replaced = new Map<Node, Node>();
  if (hasHeaderRow(table)) {
    (table.tBodies[0] ?? table.createTBody()).prepend(first);
    for (const each of Array.from(first.cells)) rename(each, "td", replaced);
  } else {
    (table.tHead ?? table.createTHead()).append(first);
    for (const each of Array.from(first.cells)) rename(each, "th", replaced);
  }
  table.querySelectorAll("thead, tbody").forEach((section) => {
    if (!section.children.length) section.remove();
  });
  return restore(saved, root, replaced) ?? range;
}

/**
 * Tab moves to the next cell, or Shift+Tab to the previous one. Tab in the last
 * cell starts a new row. Shift+Tab in the first cell leaves the table.
 */
export function tabCell(cell: HTMLTableCellElement, dir: 1 | -1): Range | undefined {
  const cells = cellsOf(tableOf(cell));
  const next = cells[cells.indexOf(cell) + dir];
  if (next) return cellCaret(next);
  if (dir < 0) return undefined;
  const fresh = insertRow(cell.parentElement as HTMLTableRowElement, "below");
  return cellCaret(fresh.cells[0]);
}

/** The caret's top, against the cell's, in the first line of the cell or the last line */
function onEdgeLine(cell: HTMLElement, range: Range, edge: "first" | "last"): boolean {
  const style = getComputedStyle(cell);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 20;
  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
  const box = cell.getBoundingClientRect();
  return edge === "first" ? rect.top - box.top < lineHeight : box.bottom - rect.bottom < lineHeight;
}

/**
 * Up and down move between rows, in the same column, from the first or last
 * line of a cell. Elsewhere, and at the table's edges, the browser moves the caret.
 */
export function verticalCell(cell: HTMLTableCellElement, range: Range, dir: 1 | -1): Range | undefined {
  if (!onEdgeLine(cell, range, dir < 0 ? "first" : "last")) return undefined;
  const table = tableOf(cell);
  const rows = rowsOf(table);
  const target = rows[rows.indexOf(cell.parentElement as HTMLTableRowElement) + dir]?.cells[cell.cellIndex];
  return target ? cellCaret(target) : undefined;
}
