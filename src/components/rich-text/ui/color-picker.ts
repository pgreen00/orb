const COLUMNS = 8;

/** Browsers normalize colors when they're set on a style, so #ff0000 and rgb(255, 0, 0) compare equal */
function normalizeColor(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  return probe.style.color || value.toLowerCase();
}

/**
 * Moves focus through a grid of buttons with the arrow, Home and End keys. Only the
 * focused cell has tabIndex 0, so the grid is one Tab stop. `grid` must be the element
 * that holds the cells, and the listener is added once per grid.
 */
export function addGridKeys(grid: HTMLElement, selector: string, columns: number) {
  grid.addEventListener("keydown", (event) => {
    const cells = [...grid.querySelectorAll<HTMLElement>(selector)];
    const current = cells.indexOf(event.target as HTMLElement);
    if (current < 0) return;
    const steps: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      ArrowUp: current - columns,
      ArrowDown: current + columns,
      Home: 0,
      End: cells.length - 1,
    };
    const next = steps[event.key];
    if (next === undefined || next < 0 || next >= cells.length) return;
    event.preventDefault();
    cells.forEach((cell, index) => (cell.tabIndex = index === next ? 0 : -1));
    cells[next].focus();
  });
}

export function createColorPicker({
  colors,
  current,
  onPick,
}: {
  colors: string[];
  current: string | null;
  onPick: (value: string | null) => void;
}): HTMLElement {
  const root = document.createElement("div");
  root.className = "picker color-picker";

  const selected = current === null ? null : normalizeColor(current);
  const isCurrent = (color: string) => selected !== null && normalizeColor(color) === selected;
  const stop = Math.max(0, colors.findIndex(isCurrent));

  const grid = document.createElement("div");
  grid.className = "picker-grid";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "Colors");
  addGridKeys(grid, ".swatch", COLUMNS);

  for (let start = 0; start < colors.length; start += COLUMNS) {
    const row = document.createElement("div");
    row.className = "picker-row";
    colors.slice(start, start + COLUMNS).forEach((color, offset) => {
      const index = start + offset;
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "swatch";
      swatch.style.backgroundColor = color;
      swatch.setAttribute("aria-label", color);
      swatch.setAttribute("aria-pressed", String(isCurrent(color)));
      swatch.tabIndex = index === stop ? 0 : -1;
      swatch.addEventListener("click", () => onPick(color));
      row.append(swatch);
    });
    grid.append(row);
  }

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "picker-default";
  reset.textContent = "Default";
  reset.addEventListener("click", () => onPick(null));

  const custom = document.createElement("label");
  custom.className = "picker-custom";
  const caption = document.createElement("span");
  caption.className = "picker-section-label";
  caption.textContent = "Custom…";
  const input = document.createElement("input");
  input.type = "color";
  if (current) input.value = current;
  input.addEventListener("change", () => onPick(input.value));
  custom.append(caption, input);

  root.append(grid, reset, custom);
  return root;
}
