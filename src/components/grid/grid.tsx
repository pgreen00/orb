import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  forceUpdate,
  Host,
  Listen,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import { GripVerticalIcon, RadioEmpty, RadioFill } from "../../utils/icons";

type Section = "head" | "body" | "foot";

type Row = {
  section: Section;
  cells: HTMLElement[];
  /** The first row track the row covers, from 0 */
  track: number;
  /** How many row tracks the row covers, which is its tallest cell's rowspan */
  span: number;
};

/** Where a cell sits, in row tracks and columns from 0 */
type Placement = { track: number; col: number; colspan: number; rowspan: number };

type Position = { track: number; col: number };

export type GridActivateDetail = {
  /** The cells of the activated row */
  row: HTMLElement[];
  /** The activated cell. Undefined when a whole row was activated. */
  cell?: HTMLElement;
};

export type GridReorderDetail = {
  /** The cells of the row being moved */
  row: HTMLElement[];
  /** The row's index among the body rows before the move */
  from: number;
  /** The row's index among the body rows after the move */
  to: number;
};

const SECTIONS: Section[] = ["head", "body", "foot"];

/** Cell attributes that change the layout */
const LAYOUT_ATTRIBUTES = ["section", "colspan", "rowspan"];

/** A cell's span, read from the attribute so it works before the cell upgrades */
const spanOf = (el: Element, name: "colspan" | "rowspan") =>
  Math.max(1, parseInt(el.getAttribute(name) ?? "", 10) || 1);

/** Elements inside a cell that can take focus */
const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "iframe",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  "[tabindex]",
].join(", ");

/**
 * A data grid built from markup. Put `orb-cell` elements directly inside it,
 * in reading order, and the grid splits them into rows. The number of columns
 * is set by `columns`, or by the header cells' column spans when it isn't set.
 * Header cells come first, then body cells, then footer cells, whatever their
 * order in the markup.
 *
 * Cells span columns and rows with `colspan` and `rowspan`, the same way table
 * cells do. A cell is placed in the next free slot of the row, skipping slots
 * that cells from rows above span into, and wraps to a new row when it
 * doesn't fit. Row spans stop at the end of their section.
 *
 * The cells stay in the page: each row is a `role="row"` element in the grid's
 * shadow root, with a slot that the row's cells are assigned to.
 *
 * The grid is one Tab stop. The arrow keys move between cells, or between rows
 * with `navigation="row"`. Links, buttons, and fields inside a cell are taken
 * out of the Tab order until the user presses Enter on the cell, or clicks
 * into it. Escape goes back to the cell.
 *
 * With `reorder`, each body row gets a drag handle. Dragging it moves the
 * row's cells to the new position in the page, so the grid's markup always
 * matches what's shown.
 *
 * @slot - `orb-cell` elements. Other elements aren't shown.
 *
 * @part row - Each row
 * @part head-row - Each row of header cells
 * @part body-row - Each row of body cells
 * @part foot-row - Each row of footer cells
 * @part select-cell - The cell holding a row's selection control, when `selection` is set
 * @part select-control - The radio button or `orb-checkbox` that selects a row, and the select all checkbox
 * @part select-all - The select all checkbox, when `select-all` is set
 * @part handle-cell - The cell holding a row's drag handle, when `reorder` is set
 * @part handle - The drag handle button
 * @part drop-indicator - The line that shows where a dragged row will land
 */
@Component({
  tag: "orb-grid",
  styleUrl: "grid.css",
  shadow: {
    slotAssignment: "manual",
  },
})
export class Grid {
  @AttachInternals() internals: ElementInternals;
  @Element() host: HTMLOrbGridElement;

  /**
   * Number of columns. When it isn't set, it's the sum of the header cells'
   * column spans, which assumes a single header row. Set it when the header
   * has more than one row, or when there's no header.
   */
  @Prop() columns?: number;

  /**
   * What the arrow keys move between. `cell` moves focus cell by cell. `row`
   * focuses whole rows, and only the up and down arrows move.
   */
  @Prop() navigation: "cell" | "row" = "cell";

  /**
   * Whether body rows can be selected. `single` allows one selected row at a
   * time, and `multiple` allows any number. The grid adds a first column with
   * a radio button or an `orb-checkbox` in each body row. Space on any cell or
   * row also toggles its row.
   */
  @Prop() selection: "none" | "single" | "multiple" = "none";

  /**
   * Adds a checkbox to the header that selects or clears every body row. Only
   * applies with `selection="multiple"` and a header row.
   */
  @Prop() selectAll = false;

  /**
   * Adds a drag handle to the start of each body row. Drag it with a pointer
   * to move the row. From the keyboard, press Space or Enter on the handle to
   * pick the row up, Up and Down to move it, and Space or Enter to drop it.
   * Alt + Up and Down move the focused row from any cell. Rows only move
   * within the body, and a cell's row span doesn't move with it.
   */
  @Prop() reorder = false;

  /**
   * Emits when the user presses Enter on a cell, or on a row with
   * `navigation="row"`. Call `preventDefault()` to keep focus where it is.
   * Otherwise focus moves to the first focusable element in the cell or row.
   */
  @Event({ cancelable: true }) orbActivate: EventEmitter<GridActivateDetail>;

  /** Emits when the selected rows change. The detail is each selected row's cells. */
  @Event() orbSelectionChange: EventEmitter<HTMLElement[][]>;

  /**
   * Emits before a row moves, with its old and new index among the body rows.
   * Call `preventDefault()` to keep it in place, for example to reorder your
   * own data and render the grid again.
   */
  @Event({ cancelable: true }) orbReorder: EventEmitter<GridReorderDetail>;

  @State() rows: Row[] = [];
  @State() columnCount = 1;
  /** Selected rows, keyed by each row's first cell */
  @State() selected = new Set<HTMLElement>();
  /** The row that's the Tab stop with `navigation="row"`, keyed by its first cell */
  @State() activeRowKey?: HTMLElement;
  /** The row being dragged with a pointer */
  @State() dragKey?: HTMLElement;
  /** Where the drop line is, from the top of the grid's content */
  @State() dropTop?: number;
  /** The row picked up from the keyboard */
  @State() grabbedKey?: HTMLElement;
  /** Text for the live region, describing reordering */
  @State() announcement = "";

  /** The cell that's the Tab stop with `navigation="cell"` */
  private activeCell?: HTMLElement;
  /** Cells whose content is in the Tab order, after Enter or a click inside */
  private openCells: HTMLElement[] = [];
  /** The tabindex content had before the grid took it out of the Tab order */
  private savedTabIndex = new WeakMap<Element, string | null>();
  private rowEls = new Map<HTMLElement, HTMLElement>();
  /** Each body row's selection control, keyed by the row's first cell */
  private controlEls = new Map<HTMLElement, HTMLElement>();
  /** Each body row's drag handle, keyed by the row's first cell */
  private handleEls = new Map<HTMLElement, HTMLElement>();
  /** A row being dragged with the drag and drop API, and where it would land */
  private drag?: { key: HTMLElement; to: number };
  /** The index a row picked up from the keyboard started at */
  private grabFrom = 0;
  /** A shadow element to focus once a moved row has rendered */
  private pendingFocus?: { kind: "handle" | "control" | "row"; key: HTMLElement };
  /** Set while focus is moved back to a moved row's element */
  private refocusing = false;
  private placements = new Map<HTMLElement, Placement>();
  /** The cell covering each slot, by row track and column */
  private matrix: (HTMLElement | undefined)[][] = [];
  /**
   * The slot focus is in. In a spanning cell, it remembers which row and
   * column the user came from, so moving on continues in a straight line.
   */
  private position?: Position;

  /**
   * Re-reads the rows when a cell is added, removed, or moved to another
   * section. When content inside a cell changes, it only updates which
   * elements are in the Tab order.
   */
  private observer = new MutationObserver((mutations) => {
    let rebuild = false;
    let content = false;
    for (const m of mutations) {
      if (m.target === this.host) {
        if (m.type === "childList") rebuild = true;
        continue;
      }
      const isCell = m.target.parentNode === this.host;
      if (m.type === "attributes" && LAYOUT_ATTRIBUTES.includes(m.attributeName)) {
        if (isCell) rebuild = true;
      } else if (!(isCell && m.type === "attributes")) {
        // The grid sets the tabindex of cells itself, so only changes inside
        // a cell count.
        content = true;
      }
    }
    if (rebuild) this.setRows();
    else if (content) {
      this.updateTabStops();
      // The selection controls are named from their row's first cell.
      if (this.selection !== "none") forceUpdate(this.host);
    }
  });

  /**
   * Keeps the selection controls out of the Tab order. `orb-checkbox` sets its
   * own tabindex when it loads, after the grid has rendered it.
   */
  private controlObserver = new MutationObserver(() => this.updateControlTabStops());

  componentWillLoad() {
    this.internals.role = "grid";
    this.onSelectionModeChange();
  }

  connectedCallback() {
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      attributeFilter: [...LAYOUT_ATTRIBUTES, "tabindex"],
    });
    this.setRows();
  }

  componentDidLoad() {
    this.controlObserver.observe(this.host.shadowRoot, {
      subtree: true,
      attributeFilter: ["tabindex"],
    });
  }

  componentDidRender() {
    this.updateControlTabStops();
    // A moved row renders in another row element, so focus follows it there.
    if (this.pendingFocus) {
      const { kind, key } = this.pendingFocus;
      this.pendingFocus = undefined;
      const el =
        kind === "handle"
          ? this.handleEls.get(key)
          : kind === "control"
            ? this.controlEls.get(key)
            : this.rowEls.get(key);
      if (el) {
        this.refocusing = true;
        focusInView(el);
        this.refocusing = false;
      }
    }
  }

  disconnectedCallback() {
    this.observer.disconnect();
    this.controlObserver.disconnect();
  }

  @Watch("columns")
  onColumnsChange() {
    this.setRows();
  }

  @Watch("reorder")
  onReorderChange() {
    this.grabbedKey = undefined;
    this.endDrag();
    this.setRows();
  }

  @Watch("navigation")
  onNavigationChange() {
    this.openCells = [];
    this.updateTabStops();
  }

  @Watch("selection")
  onSelectionChange() {
    this.onSelectionModeChange();
    this.setRows();
  }

  private onSelectionModeChange() {
    this.internals.ariaMultiSelectable =
      this.selection === "multiple" ? "true" : null;
    if (this.selection === "none" && this.selected.size) {
      this.setSelected(new Set());
    } else if (this.selection === "single" && this.selected.size > 1) {
      this.setSelected(new Set([...this.selected].slice(0, 1)));
    }
  }

  private setRows() {
    const cells = Array.from(this.host.children).filter(
      (el): el is HTMLElement => el.localName === "orb-cell",
    );
    // Read from the attribute, so it works before the cells have upgraded.
    const sectionOf = (el: HTMLElement): Section => {
      const section = el.getAttribute("section");
      return section === "head" || section === "foot" ? section : "body";
    };
    const bySection = SECTIONS.map((section) => ({
      section,
      cells: cells.filter((el) => sectionOf(el) === section),
    }));

    const sum = (list: HTMLElement[]) =>
      list.reduce((total, el) => total + spanOf(el, "colspan"), 0);
    const columns = Math.max(1, this.columns || sum(bySection[0].cells) || sum(cells));
    // The selection controls take the first column
    const offset = this.offset;

    const rows: Row[] = [];
    const placements = new Map<HTMLElement, Placement>();
    const matrix: (HTMLElement | undefined)[][] = [];
    let trackOffset = 0;

    // Each section is laid out on its own, like a table's thead, tbody, and
    // tfoot, so row spans don't reach into the next section.
    for (const { section, cells } of bySection) {
      const taken: boolean[][] = [];
      const isFree = (r: number, c: number) => !taken[r]?.[c];
      const placed: (Placement & { cell: HTMLElement })[] = [];
      let r = 0;
      let c = 0;

      for (const cell of cells) {
        const colspan = Math.min(spanOf(cell, "colspan"), columns);
        const rowspan = spanOf(cell, "rowspan");
        // The next slot in reading order where the whole span is free
        for (;;) {
          if (c + colspan > columns) {
            r++;
            c = 0;
            continue;
          }
          let fits = true;
          for (let i = 0; i < colspan; i++) if (!isFree(r, c + i)) fits = false;
          if (fits) break;
          c++;
        }
        placed.push({ cell, track: r, col: c, colspan, rowspan });
        for (let dr = 0; dr < rowspan; dr++) {
          taken[r + dr] ??= [];
          for (let dc = 0; dc < colspan; dc++) taken[r + dr][c + dc] = true;
        }
        c += colspan;
      }

      const rowCount = placed.length ? Math.max(...placed.map((p) => p.track)) + 1 : 0;
      for (const p of placed) {
        p.rowspan = Math.min(p.rowspan, rowCount - p.track);
        p.track += trackOffset;
        p.col += offset;
        placements.set(p.cell, { track: p.track, col: p.col, colspan: p.colspan, rowspan: p.rowspan });
        for (let dr = 0; dr < p.rowspan; dr++) {
          matrix[p.track + dr] ??= [];
          for (let dc = 0; dc < p.colspan; dc++) matrix[p.track + dr][p.col + dc] = p.cell;
        }
      }
      // A row is the cells that start on a track. A track covered entirely by
      // spans from above has no cells of its own, so it has no row.
      for (let i = 0; i < rowCount; i++) {
        const own = placed.filter((p) => p.track === trackOffset + i);
        if (!own.length) continue;
        rows.push({
          section,
          cells: own.map((p) => p.cell),
          track: trackOffset + i,
          span: Math.max(...own.map((p) => p.rowspan)),
        });
      }
      trackOffset += rowCount;
    }

    // Explicit placement, since auto-placement can't see cells from other
    // rows' boxes spanning down into this one.
    for (const [cell, p] of placements) {
      cell.style.setProperty("--_grid-column", `${p.col + 1} / span ${p.colspan}`);
      cell.style.setProperty("--_grid-row", `1 / span ${p.rowspan}`);
    }

    this.columnCount = columns;
    this.placements = placements;
    this.matrix = matrix;
    this.rows = rows;

    // Drop selections whose row is gone
    const bodyKeys = new Set(
      this.rows.filter((r) => r.section === "body").map((r) => r.cells[0]),
    );
    if ([...this.selected].some((key) => !bodyKeys.has(key))) {
      this.selected = new Set([...this.selected].filter((key) => bodyKeys.has(key)));
    }

    this.updateTabStops();
  }

  /**
   * Makes the active cell or row the grid's only Tab stop, and takes the
   * content of every cell out of the Tab order, except for open cells.
   */
  private updateTabStops() {
    const cells = this.rows.flatMap((r) => r.cells);

    if (this.navigation === "cell") {
      const controls = [...this.controlEls.values()];
      if (
        !this.activeCell ||
        !(cells.includes(this.activeCell) || controls.includes(this.activeCell))
      ) {
        this.activeCell = cells[0];
      }
      for (const cell of cells) {
        setAttr(cell, "tabindex", cell === this.activeCell ? "0" : "-1");
      }
      this.updateControlTabStops();
    } else {
      for (const cell of cells) setAttr(cell, "tabindex", null);
      const keys = this.rows.map((r) => r.cells[0]);
      if (!this.activeRowKey || !keys.includes(this.activeRowKey)) {
        this.activeRowKey = keys[0];
      }
    }

    this.openCells = this.openCells.filter((cell) => cells.includes(cell));
    for (const cell of cells) {
      const open = this.openCells.includes(cell);
      cell.querySelectorAll(FOCUSABLE).forEach((el) =>
        open ? this.restoreTabIndex(el) : this.suspendTabIndex(el),
      );
    }
  }

  /** A handle or selection control is a Tab stop only when it's the active cell. */
  private updateControlTabStops() {
    for (const control of [...this.handleEls.values(), ...this.controlEls.values()]) {
      const active = this.navigation === "cell" && control === this.activeCell;
      setAttr(control, "tabindex", active ? "0" : "-1");
    }
  }

  /** The columns before the first data column: the handles, then the selection controls */
  private get offset() {
    return (this.reorder ? 1 : 0) + (this.selection === "none" ? 0 : 1);
  }

  /** The column of the selection controls, from 0 */
  private get selectCol() {
    return this.reorder ? 1 : 0;
  }

  private get bodyRows() {
    return this.rows.filter((r) => r.section === "body");
  }

  /** A row's name, from its first cell, for labels and announcements */
  private rowName(key: HTMLElement) {
    return key.textContent.trim().replace(/\s+/g, " ");
  }

  /** The row a drag handle or selection control belongs to */
  private controlRow(control: HTMLElement) {
    const key = [...this.handleEls, ...this.controlEls].find(([, el]) => el === control)?.[0];
    return key ? this.rows.find((r) => r.cells[0] === key) : undefined;
  }

  /** Where a cell, drag handle, or selection control sits */
  private placementOf(el: HTMLElement): Placement | undefined {
    const p = this.placements.get(el);
    if (p) return p;
    const row = this.controlRow(el);
    const isHandle = [...this.handleEls.values()].includes(el);
    return row && { track: row.track, col: isHandle ? 0 : this.selectCol, colspan: 1, rowspan: 1 };
  }

  private suspendTabIndex(el: Element) {
    const value = el.getAttribute("tabindex");
    if (value === "-1") return;
    this.savedTabIndex.set(el, value);
    el.setAttribute("tabindex", "-1");
  }

  private restoreTabIndex(el: Element) {
    if (!this.savedTabIndex.has(el)) return;
    setAttr(el, "tabindex", this.savedTabIndex.get(el));
    this.savedTabIndex.delete(el);
  }

  private rowIndexOf(cell: HTMLElement) {
    return this.rows.findIndex((r) => r.cells.includes(cell));
  }

  /**
   * Where an event happened: on a row, on a cell, on a selection control, or
   * inside a cell's content
   */
  private locate(ev: globalThis.Event) {
    const path = ev.composedPath();
    const target = path[0];
    const handle = [...this.handleEls.values()].find((el) => path.includes(el));
    if (handle) {
      const row = this.controlRow(handle);
      return { kind: "handle" as const, cell: handle, rowIndex: this.rows.indexOf(row) };
    }
    const control = [...this.controlEls.values()].find((el) => path.includes(el));
    if (control) {
      const row = this.controlRow(control);
      return { kind: "control" as const, cell: control, rowIndex: this.rows.indexOf(row) };
    }
    const rowEntry = [...this.rowEls].find(([, el]) => el === target);
    if (rowEntry) {
      const rowIndex = this.rows.findIndex((r) => r.cells[0] === rowEntry[0]);
      return { kind: "row" as const, rowIndex };
    }
    const node = target as Node;
    const cell = this.rows
      .flatMap((r) => r.cells)
      .find((c) => c === node || c.contains(node));
    if (!cell) return null;
    return {
      kind: cell === node ? ("cell" as const) : ("content" as const),
      cell,
      rowIndex: this.rowIndexOf(cell),
    };
  }

  private at(track: number, col: number) {
    if (col < this.offset) {
      const els = this.reorder && col === 0 ? this.handleEls : this.controlEls;
      const row = this.rows.find((r) => r.track === track && els.has(r.cells[0]));
      return row && els.get(row.cells[0]);
    }
    return this.matrix[track]?.[col];
  }

  /** The cell at a slot, or the nearest one before it in the same track */
  private nearestIn(track: number, col: number) {
    for (let c = col; c >= 0; c--) {
      const cell = this.at(track, c);
      if (cell) return cell;
    }
    return undefined;
  }

  /** Remembers a slot inside the cell, defaulting to its top start slot */
  private setPosition(cell: HTMLElement, track?: number, col?: number) {
    const p = this.placementOf(cell);
    if (!p) return;
    const clamp = (v: number, min: number, size: number) =>
      Math.min(Math.max(v, min), min + size - 1);
    this.position = {
      track: clamp(track ?? p.track, p.track, p.rowspan),
      col: clamp(col ?? p.col, p.col, p.colspan),
    };
  }

  private focusCell(cell?: HTMLElement, track?: number, col?: number) {
    if (!cell) return;
    this.setPosition(cell, track, col);
    this.activeCell = cell;
    this.openCells = [];
    this.updateTabStops();
    focusInView(cell);
  }

  private focusRow(index: number) {
    const key = this.rows[index]?.cells[0];
    if (!key) return;
    this.activeRowKey = key;
    this.openCells = [];
    this.updateTabStops();
    const row = this.rowEls.get(key);
    if (row) focusInView(row);
  }

  private setSelected(next: Set<HTMLElement>) {
    this.selected = next;
    this.orbSelectionChange.emit(
      this.rows
        .filter((r) => r.section === "body" && next.has(r.cells[0]))
        .map((r) => r.cells),
    );
  }

  /** Selects or deselects a row, from its selection control */
  private setRowSelected(key: HTMLElement, on: boolean) {
    if (this.selected.has(key) === on) return;
    const next =
      this.selection === "single" ? new Set<HTMLElement>(on ? [key] : []) : new Set(this.selected);
    if (this.selection === "multiple") {
      if (on) next.add(key);
      else next.delete(key);
    }
    this.setSelected(next);
  }

  private toggleSelection(rowIndex: number) {
    const row = this.rows[rowIndex];
    if (!row || row.section !== "body") return;
    const key = row.cells[0];
    const isSelected = this.selected.has(key);
    const next =
      this.selection === "single"
        ? new Set<HTMLElement>(isSelected ? [] : [key])
        : new Set(this.selected);
    if (this.selection === "multiple") {
      if (isSelected) next.delete(key);
      else next.add(key);
    }
    this.setSelected(next);
  }

  /** Sets the live region text, so screen readers hear each reordering step. */
  private announce(message: string) {
    // Repeating the same text wouldn't be announced again.
    this.announcement = this.announcement === message ? `${message}\u00a0` : message;
  }

  private bodyIndexOf(key: HTMLElement) {
    return this.bodyRows.findIndex((r) => r.cells[0] === key);
  }

  /**
   * Moves a body row to a new index among the body rows by moving its cells
   * in the page. Emits `orbReorder` first, and does nothing if it's canceled.
   */
  private moveRow(key: HTMLElement, to: number) {
    const body = this.bodyRows;
    const from = body.findIndex((r) => r.cells[0] === key);
    if (from < 0 || to < 0 || to >= body.length || to === from) return false;
    const row = body[from];
    if (this.orbReorder.emit({ row: row.cells, from, to }).defaultPrevented) return false;

    // Focus stays with the moved row. A cell blurs when it's moved in the
    // page, and the grid's own elements are reused by whichever row renders in
    // their place.
    const focusedCell = row.cells.find((c) => c === document.activeElement);
    const shadowFocus = this.host.shadowRoot.activeElement;
    if (shadowFocus && shadowFocus === this.handleEls.get(key)) {
      this.pendingFocus = { kind: "handle", key };
    } else if (shadowFocus && shadowFocus === this.controlEls.get(key)) {
      this.pendingFocus = { kind: "control", key };
    } else if (shadowFocus && shadowFocus === this.rowEls.get(key)) {
      this.activeRowKey = key;
      this.pendingFocus = { kind: "row", key };
    }

    const others = body.filter((r) => r !== row);
    if (to < others.length) {
      others[to].cells[0].before(...row.cells);
    } else {
      const last = others[others.length - 1].cells;
      last[last.length - 1].after(...row.cells);
    }
    // Rebuild now, not when the observer runs, so focus and announcements
    // see the new order.
    this.observer.takeRecords();
    this.setRows();
    if (focusedCell) {
      this.refocusing = true;
      focusInView(focusedCell);
      this.refocusing = false;
    }
    return true;
  }

  /** Moves a row one step up or down, and announces where it is. */
  private stepRow(key: HTMLElement, down: boolean) {
    const to = this.bodyIndexOf(key) + (down ? 1 : -1);
    if (this.moveRow(key, to)) {
      this.announce(`${this.rowName(key)}, row ${to + 1} of ${this.bodyRows.length}.`);
    }
  }

  private grab(key: HTMLElement) {
    const index = this.bodyIndexOf(key);
    this.grabbedKey = key;
    this.grabFrom = index;
    this.announce(
      `Picked up ${this.rowName(key)}, row ${index + 1} of ${this.bodyRows.length}. ` +
        "Press Up or Down to move it, Space to drop it, or Escape to cancel.",
    );
  }

  private drop() {
    const key = this.grabbedKey;
    if (!key) return;
    this.grabbedKey = undefined;
    const index = this.bodyIndexOf(key);
    this.announce(`Dropped ${this.rowName(key)} at row ${index + 1} of ${this.bodyRows.length}.`);
  }

  private cancelGrab() {
    const key = this.grabbedKey;
    if (!key) return;
    this.grabbedKey = undefined;
    this.moveRow(key, this.grabFrom);
    const index = this.bodyIndexOf(key);
    this.announce(`Canceled. ${this.rowName(key)} is at row ${index + 1} of ${this.bodyRows.length}.`);
  }

  /**
   * Starts a native drag from a handle. The drag image is the whole row, so
   * the browser shows the row following the pointer, from where it was
   * grabbed. The row left behind fades once the image is taken.
   */
  private onHandleDragStart(ev: DragEvent, key: HTMLElement) {
    const rowEl = this.rowEls.get(key);
    if (this.grabbedKey || !rowEl || !ev.dataTransfer) {
      ev.preventDefault();
      return;
    }
    this.drag = { key, to: this.bodyIndexOf(key) };
    ev.dataTransfer.effectAllowed = "move";
    // Some browsers only start a drag that carries data.
    ev.dataTransfer.setData("text/plain", this.rowName(key));
    // The image is taken from how the row looks now, so give it an opaque
    // background first.
    rowEl.classList.add("drag-image");
    const rect = rowEl.getBoundingClientRect();
    ev.dataTransfer.setDragImage(rowEl, ev.clientX - rect.left, ev.clientY - rect.top);
    requestAnimationFrame(() => {
      rowEl.classList.remove("drag-image");
      if (this.drag?.key === key) this.dragKey = key;
    });
  }

  /** Finds where the dragged row would land, and draws the drop line there. */
  // Not passive, so preventDefault() allows the drop
  @Listen("dragover", { passive: false })
  onDragOver(ev: DragEvent) {
    const drag = this.drag;
    // Only this grid's own rows can be dropped here.
    if (!drag) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";

    const others = this.bodyRows.filter((r) => r.cells[0] !== drag.key);
    if (!others.length) return;
    const rects = others.map((r) => this.rowEls.get(r.cells[0]).getBoundingClientRect());
    drag.to = rects.filter((rect) => ev.clientY > rect.top + rect.height / 2).length;

    const edge = drag.to < rects.length ? rects[drag.to].top : rects[rects.length - 1].bottom;
    const hostRect = this.host.getBoundingClientRect();
    const top = edge - hostRect.top - this.host.clientTop + this.host.scrollTop;
    if (top !== this.dropTop) this.dropTop = top;
  }

  @Listen("drop", { passive: false })
  onDrop(ev: DragEvent) {
    const drag = this.drag;
    if (!drag) return;
    // Keeps the browser from opening the dragged text
    ev.preventDefault();
    this.endDrag();
    if (this.moveRow(drag.key, drag.to)) {
      this.announce(
        `Moved ${this.rowName(drag.key)} to row ${drag.to + 1} of ${this.bodyRows.length}.`,
      );
    }
  }

  /** Runs after a drop, and when a drag is canceled, such as with Escape. */
  private endDrag() {
    this.drag = undefined;
    this.dragKey = undefined;
    this.dropTop = undefined;
  }

  /** Emits `orbActivate`, then moves focus into the cell's or row's content. */
  private activate(rowIndex: number, cell?: HTMLElement) {
    const row = this.rows[rowIndex];
    const event = this.orbActivate.emit({ row: row.cells, cell });
    if (event.defaultPrevented) return;

    const region = cell ? [cell] : row.cells;
    this.openCells = region;
    this.updateTabStops();
    const candidates = region.flatMap((c) =>
      Array.from(c.querySelectorAll<HTMLElement>(FOCUSABLE)),
    );
    for (const el of candidates) {
      if (el.matches(":disabled") || el.closest("[inert]")) continue;
      el.focus();
      if (region.some((c) => c.contains(document.activeElement))) return;
    }
    // Nothing inside could take focus, so the content stays closed.
    this.openCells = [];
    this.updateTabStops();
  }

  @Listen("focusin")
  onFocusIn(ev: FocusEvent) {
    const where = this.locate(ev);
    if (!where) return;

    if (where.kind === "row") {
      this.activeRowKey = this.rows[where.rowIndex].cells[0];
      if (this.openCells.length) {
        this.openCells = [];
        this.updateTabStops();
      }
    } else if (where.kind === "cell" || where.kind === "control" || where.kind === "handle") {
      // Keep the remembered slot when it's inside this cell, such as after
      // moving with the arrow keys.
      if (!this.position || this.at(this.position.track, this.position.col) !== where.cell) {
        this.setPosition(where.cell);
      }
      this.activeCell = where.cell;
      this.openCells = [];
      this.updateTabStops();
    } else {
      // Focus moved into a cell's content, from Enter or a click
      const region =
        this.navigation === "row" ? this.rows[where.rowIndex].cells : [where.cell];
      if (region[0] === this.openCells[0]) return;
      this.openCells = region;
      if (this.navigation === "row") this.activeRowKey = region[0];
      else this.activeCell = where.cell;
      this.updateTabStops();
    }
  }

  @Listen("focusout")
  onFocusOut(ev: FocusEvent) {
    const next = ev.relatedTarget as Node | null;
    if (next && (this.host.contains(next) || this.host.shadowRoot.contains(next))) return;
    // Focus left the grid, so open content goes back out of the Tab order.
    if (this.openCells.length) {
      this.openCells = [];
      this.updateTabStops();
    }
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    const where = this.locate(ev);
    if (!where) return;

    if (where.kind === "handle" && this.handleKey(ev, this.rows[where.rowIndex].cells[0])) return;

    // A selection control handles Space and Enter itself, so the row isn't
    // toggled twice.
    if (where.kind === "control" && (ev.key === " " || ev.key === "Enter")) return;

    // Inside a cell's content, keys belong to the content, except Escape.
    if (where.kind === "content") {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        if (this.navigation === "row") this.focusRow(where.rowIndex);
        else this.focusCell(where.cell);
      }
      return;
    }

    const onRow = where.kind === "row";
    const { rowIndex } = where;

    // Alt + Up and Down move the focused body row
    if (
      this.reorder &&
      ev.altKey &&
      (ev.key === "ArrowUp" || ev.key === "ArrowDown") &&
      this.rows[rowIndex]?.section === "body"
    ) {
      ev.preventDefault();
      this.stepRow(this.rows[rowIndex].cells[0], ev.key === "ArrowDown");
      return;
    }

    const rtl = getComputedStyle(this.host).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const ctrl = ev.ctrlKey || ev.metaKey;

    // In cell navigation, moves go by slot, so a spanning cell is passed over
    // in one step, and moving on continues from the slot the user came from.
    const cell = onRow ? undefined : where.cell;
    const p = cell ? this.placementOf(cell)! : undefined;
    const pos =
      cell && this.position && this.at(this.position.track, this.position.col) === cell
        ? this.position
        : p && { track: p.track, col: p.col };
    const tracks = this.matrix.length;
    const columns = this.columnCount + this.offset;
    /** Focuses the first cell found, scanning slots in order. Stays put on the current cell. */
    const scan = (slots: Iterable<[number, number]>, nearest = false) => {
      for (const [t, c] of slots) {
        const next = nearest ? this.nearestIn(t, c) : this.at(t, c);
        if (!next) continue;
        if (next !== cell) this.focusCell(next, t, c);
        return;
      }
    };
    function* range(from: number, to: number, fixed: number, axis: "track" | "col") {
      const step = from <= to ? 1 : -1;
      for (let i = from; step > 0 ? i <= to : i >= to; i += step) {
        yield (axis === "track" ? [i, fixed] : [fixed, i]) as [number, number];
      }
    }

    switch (ev.key) {
      case "ArrowDown":
      case "ArrowUp": {
        const down = ev.key === "ArrowDown";
        if (onRow) {
          const next = rowIndex + (down ? 1 : -1);
          if (this.rows[next]) this.focusRow(next);
        } else if (down) {
          scan(range(p.track + p.rowspan, tracks - 1, pos.col, "track"), true);
        } else {
          scan(range(p.track - 1, 0, pos.col, "track"), true);
        }
        break;
      }
      case "ArrowRight":
      case "ArrowLeft":
        if (onRow) return;
        if (ev.key === forward) scan(range(p.col + p.colspan, columns - 1, pos.track, "col"));
        else scan(range(p.col - 1, 0, pos.track, "col"));
        break;
      case "Home":
      case "End": {
        const first = ev.key === "Home";
        if (onRow) {
          this.focusRow(first ? 0 : this.rows.length - 1);
        } else if (ctrl) {
          const track = first ? 0 : tracks - 1;
          scan(first ? range(0, columns - 1, track, "col") : range(columns - 1, 0, track, "col"));
        } else {
          scan(first ? range(0, columns - 1, pos.track, "col") : range(columns - 1, 0, pos.track, "col"));
        }
        break;
      }
      case " ":
        if (this.selection === "none") return;
        this.toggleSelection(rowIndex);
        break;
      case "Enter":
        this.activate(rowIndex, onRow ? undefined : where.cell);
        break;
      default:
        return;
    }
    ev.preventDefault();
  }

  /**
   * Keys on a drag handle. Space or Enter picks the row up or drops it. While
   * it's picked up, Up and Down move it, and Escape puts it back. Returns true
   * when the key was handled.
   */
  private handleKey(ev: KeyboardEvent, key: HTMLElement) {
    if (ev.key === " " || ev.key === "Enter") {
      ev.preventDefault();
      if (this.grabbedKey === key) this.drop();
      else this.grab(key);
      return true;
    }
    if (this.grabbedKey !== key || ev.key === "Tab") return false;
    // While picked up, other keys don't move focus around the grid.
    ev.preventDefault();
    if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
      this.stepRow(key, ev.key === "ArrowDown");
    } else if (ev.key === "Escape") {
      ev.stopPropagation();
      this.cancelGrab();
    }
    return true;
  }

  /**
   * The drag handle cell: a handle in body rows, a labelled header in the
   * first header row, and an empty cell in other rows.
   */
  private renderHandleCell(row: Row) {
    const style = { gridColumn: "1" };
    if (row.section !== "body") {
      const firstHead = row === this.rows.find((r) => r.section === "head");
      return (
        <div
          role={row.section === "head" ? "columnheader" : "gridcell"}
          class="lead-cell"
          part="handle-cell"
          style={style}
        >
          {firstHead && <span class="visually-hidden">Reorder</span>}
        </div>
      );
    }

    const key = row.cells[0];
    return (
      <div role="gridcell" class="lead-cell" part="handle-cell" style={style}>
        {/* A div, since Firefox doesn't start drags from a <button>. The grid
            handles its keys, so it doesn't need a button's click. */}
        <div
          role="button"
          class="handle"
          part="handle"
          draggable={true}
          aria-label={`Reorder ${this.rowName(key)}`}
          aria-pressed={String(this.grabbedKey === key)}
          ref={(el?: HTMLElement) => el && this.handleEls.set(key, el)}
          onDragStart={(e: DragEvent) => this.onHandleDragStart(e, key)}
          onDragEnd={() => this.endDrag()}
          onBlur={() => {
            // Leaving a picked-up row, such as with Tab, drops it where it is.
            if (!this.refocusing && this.grabbedKey === key) this.drop();
          }}
        >
          <GripVerticalIcon aria-hidden="true" />
        </div>
      </div>
    );
  }

  /**
   * The selection cell when rows can be selected: a radio button or a
   * checkbox in body rows, a labelled header in header rows, and an empty cell
   * in footer rows.
   */
  private renderSelectCell(row: Row) {
    const style = { gridColumn: String(this.selectCol + 1) };
    if (row.section === "head") {
      // Only the first header row names the column, or holds select all.
      if (row !== this.rows.find((r) => r.section === "head")) {
        return <div role="columnheader" class="lead-cell" part="select-cell" style={style} />;
      }
      if (this.selection === "multiple" && this.selectAll) {
        return (
          <div role="columnheader" class="lead-cell" part="select-cell" style={style}>
            {this.renderSelectAll(row)}
          </div>
        );
      }
      return (
        <div role="columnheader" class="lead-cell" part="select-cell" style={style}>
          <span class="visually-hidden">Selected</span>
        </div>
      );
    }
    if (row.section !== "body") {
      return <div role="gridcell" class="lead-cell" part="select-cell" style={style} />;
    }

    const key = row.cells[0];
    const checked = this.selected.has(key);
    const label = `Select ${key.textContent.trim().replace(/\s+/g, " ")}`;
    const ref = (el?: HTMLElement) => el && this.controlEls.set(key, el);
    return (
      <div role="gridcell" class="lead-cell" part="select-cell" style={style}>
        {this.selection === "multiple" ? (
          <orb-checkbox
            ref={ref}
            part="select-control"
            aria-label={label}
            checked={checked ? "true" : "false"}
            onOrbCheckedChange={(e: CustomEvent<string>) =>
              this.setRowSelected(key, e.detail === "true")
            }
          />
        ) : (
          <button
            ref={ref}
            type="button"
            role="radio"
            class="radio"
            part="select-control"
            aria-label={label}
            aria-checked={String(checked)}
            onClick={() => this.setRowSelected(key, true)}
          >
            {checked ? <RadioFill aria-hidden="true" /> : <RadioEmpty aria-hidden="true" />}
          </button>
        )}
      </div>
    );
  }

  /**
   * Checked when every body row is selected, and mixed when some are. Checking
   * it selects every row, and unchecking it clears them.
   */
  private renderSelectAll(row: Row) {
    const total = this.rows.filter((r) => r.section === "body").length;
    const count = this.selected.size;
    const checked = count === 0 ? "false" : count === total ? "true" : "mixed";
    return (
      <orb-checkbox
        ref={(el?: HTMLElement) => el && this.controlEls.set(row.cells[0], el)}
        part="select-control select-all"
        aria-label="Select all rows"
        checked={checked}
        onOrbCheckedChange={(e: CustomEvent<string>) => {
          const all = this.rows.filter((r) => r.section === "body").map((r) => r.cells[0]);
          this.setSelected(new Set(e.detail === "true" ? all : []));
        }}
      />
    );
  }

  render() {
    this.rowEls = new Map();
    this.controlEls = new Map();
    this.handleEls = new Map();
    const rowNav = this.navigation === "row";
    const leadColumns = this.offset ? `--_lead-columns: repeat(${this.offset}, min-content);` : "";
    return (
      <Host>
        <style>{`:host { --_columns: ${this.columnCount}; ${leadColumns} }`}</style>
        {this.rows.map((row) => {
          const key = row.cells[0];
          const selectable = this.selection !== "none" && row.section === "body";
          return (
            <div
              role="row"
              part={`row ${row.section}-row`}
              class={{
                [row.section]: true,
                // A checkbox is enough to show a selected row, so only single
                // selection tints it.
                tint: this.selection === "single",
                moving: key === this.grabbedKey,
                dragging: key === this.dragKey,
              }}
              style={{ gridRow: `${row.track + 1} / span ${row.span}` }}
              tabIndex={rowNav ? (key === this.activeRowKey ? 0 : -1) : undefined}
              aria-selected={selectable ? String(this.selected.has(key)) : undefined}
              ref={(el) => el && this.rowEls.set(key, el)}
            >
              {this.reorder && this.renderHandleCell(row)}
              {this.selection !== "none" && this.renderSelectCell(row)}
              <slot ref={(slot) => slot?.assign(...row.cells)} />
            </div>
          );
        })}
        {this.dropTop != null && (
          <div class="drop-indicator" part="drop-indicator" style={{ top: `${this.dropTop}px` }} />
        )}
        <div class="visually-hidden" role="status">
          {this.announcement}
        </div>
      </Host>
    );
  }
}

/**
 * Focuses an element and scrolls it into view in the grid. Chromium doesn't
 * scroll a cell into view in the grid's own scroll box on focus.
 */
function focusInView(el: HTMLElement) {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** Sets or removes an attribute, only when the value changes */
function setAttr(el: Element, name: string, value: string | null | undefined) {
  if (value == null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}
