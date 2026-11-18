import { addGridKeys } from "./color-picker";

/** The grid starts this big, and grows as the pointer or focus reaches its edge */
const START = 4;
const MAX = 10;

/**
 * Cells for table sizes, from 1 by 1 up to 10 by 10. The cells up to the one
 * under the pointer or focus are highlighted. Picking a cell sends its size as
 * "rows x columns". The cells reuse the picker grid and its arrow keys.
 */
export function createTablePicker({ onPick }: { onPick: (value: string) => void }): HTMLElement {
  const root = document.createElement("div");
  root.className = "picker table-picker";

  const status = document.createElement("div");
  status.className = "picker-section-label";
  status.setAttribute("role", "status");

  const grid = document.createElement("div");
  grid.className = "picker-grid";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "Table size");

  let shown = { rows: START, cols: START };
  let chosen = { rows: 0, cols: 0 };
  addGridKeys(grid, ".picker-cell", () => shown.cols);

  function highlight() {
    grid.querySelectorAll<HTMLElement>(".picker-cell").forEach((cell) => {
      const on = Number(cell.dataset.row) <= chosen.rows && Number(cell.dataset.col) <= chosen.cols;
      cell.classList.toggle("is-on", on);
    });
    status.textContent = chosen.rows ? `${chosen.rows} × ${chosen.cols} table` : "Choose a size";
  }

  /** Rebuilds the cells at the current size, keeping focus on the same cell */
  function build() {
    const focused = grid.querySelector<HTMLElement>(".picker-cell:focus");
    const keep = focused && { row: focused.dataset.row, col: focused.dataset.col };
    grid.style.gridTemplateColumns = `repeat(${shown.cols}, 1.25rem)`;
    const cells: HTMLElement[] = [];
    for (let r = 1; r <= shown.rows; r++) {
      for (let c = 1; c <= shown.cols; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "picker-cell table-cell";
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.setAttribute("aria-label", `${r} by ${c} table`);
        cell.tabIndex = r === 1 && c === 1 ? 0 : -1;
        cell.addEventListener("pointerenter", () => choose(r, c));
        cell.addEventListener("focus", () => choose(r, c));
        cell.addEventListener("click", () => onPick(`${r}x${c}`));
        cells.push(cell);
      }
    }
    grid.replaceChildren(...cells);
    if (keep) {
      const again = grid.querySelector<HTMLElement>(`[data-row="${keep.row}"][data-col="${keep.col}"]`);
      if (again) {
        again.tabIndex = 0;
        again.focus({ preventScroll: true });
      }
    }
    highlight();
  }

  /** Highlights up to the chosen size, and grows the grid when the choice reaches its edge */
  function choose(rows: number, cols: number) {
    chosen = { rows, cols };
    const next = {
      rows: Math.min(MAX, Math.max(shown.rows, rows + 1)),
      cols: Math.min(MAX, Math.max(shown.cols, cols + 1)),
    };
    if (next.rows !== shown.rows || next.cols !== shown.cols) {
      shown = next;
      build();
    } else {
      highlight();
    }
  }

  build();
  root.append(status, grid);
  return root;
}
