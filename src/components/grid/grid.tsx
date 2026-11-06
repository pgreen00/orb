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
import { ChevronRightIcon, GripVerticalIcon, RadioEmpty, RadioFill } from "../../utils/icons";
import lightStyles from "./grid-light.css";

//todo: filters, style parity, and form submission

/** `details` is the row an open `orb-row-details` shows in, below its row. */
type Section = "head" | "body" | "foot" | "details";

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

export type GridRowToggleDetail = {
  /** The cells of the row whose details are opening or closing */
  row: HTMLElement[];
  /** The row's `orb-row-details` */
  details: HTMLElement;
  /** Whether the details are opening */
  expanded: boolean;
};

export type GridRowExpandDetail = {
  /** The cells of the row that's expanding or collapsing */
  row: HTMLElement[];
  /** Whether the row is expanding */
  expanded: boolean;
};

export type GridFilterDetail = {
  /** The search text */
  search: string;
  /** The headers whose filters have a value, and the value */
  filters: {
    /** The header cell */
    cell: HTMLElement;
    type: "text" | "number" | "date" | "select";
    value: string | { min?: string; max?: string } | string[];
  }[];
  /** How many body rows match, on every page */
  matches: number;
  /** How many body rows there are */
  total: number;
};

export type GridSortDetail = {
  /** The header cell being sorted by */
  cell: HTMLElement;
  /** The new sort direction. `none` puts the rows back in markup order. */
  direction: "ascending" | "descending" | "none";
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

/** Cell attributes that change the layout or the order of the rows */
const LAYOUT_ATTRIBUTES = [
  "section",
  "colspan",
  "rowspan",
  "sortable",
  "sort",
  "value",
  "expanded",
  "depth",
  "expandable",
];

/** A cell's span, read from the attribute so it works before the cell upgrades */
const spanOf = (el: Element, name: "colspan" | "rowspan") =>
  Math.max(1, parseInt(el.getAttribute(name) ?? "", 10) || 1);

const SORTS = ["ascending", "descending"];

/** A row's depth in a tree grid, from its first cell. 0 is the top level. */
const depthOf = (cell: Element) => Math.max(0, parseInt(cell.getAttribute("depth") ?? "", 10) || 0);

/** A body row in the tree, in markup order */
type TreeNode = { cells: HTMLElement[]; parent?: TreeNode; children: TreeNode[] };

/** Where a showing row sits in the tree, for ARIA and the keyboard */
type TreeInfo = {
  /** 1 for top-level rows */
  level: number;
  setsize: number;
  posinset: number;
  /** The parent row's first cell */
  parent?: HTMLElement;
  /** The first child row's first cell, in the order shown */
  firstChild?: HTMLElement;
  /** Whether the row can be expanded */
  hasChildren: boolean;
  /** Whether its children show, from `expanded`, or opened by a filter */
  open: boolean;
};

type Placed = Placement & { cell: HTMLElement };

/**
 * Places one section's cells, from 0. Each cell goes in the next slot in
 * reading order where its whole span is free, and wraps to a new row when it
 * doesn't fit. Row spans stop at the end of the section.
 */
function layoutSection(cells: HTMLElement[], columns: number): Placed[] {
  const taken: boolean[][] = [];
  const isFree = (r: number, c: number) => !taken[r]?.[c];
  const placed: Placed[] = [];
  let r = 0;
  let c = 0;

  for (const cell of cells) {
    const colspan = Math.min(spanOf(cell, "colspan"), columns);
    const rowspan = spanOf(cell, "rowspan");
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
  for (const p of placed) p.rowspan = Math.min(p.rowspan, rowCount - p.track);
  return placed;
}

/** The cells that start on each track, in order */
function groupRows(placed: Placed[]): HTMLElement[][] {
  const rows: HTMLElement[][] = [];
  for (const p of placed) (rows[p.track] ??= []).push(p.cell);
  return rows.filter(Boolean);
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** What a cell sorts and filters by: its `value`, or its text */
function valueOf(cell?: HTMLElement) {
  if (!cell) return "";
  return (
    cell.getAttribute("value") ??
    (cell as HTMLElement & { value?: string }).value ??
    cell.textContent.trim()
  );
}

/** Lowercase, without accents, so "José" matches "jose" */
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** A number in text such as "$95,000" or "48 KB", or NaN */
const toNumber = (text: string) => {
  const digits = text.replace(/[^\d.eE+-]/g, "");
  return /\d/.test(digits) ? Number(digits) : NaN;
};

/** Compares as numbers when both are numbers, otherwise as text with numbers inside */
function compareValues(a: string, b: string) {
  const x = toNumber(a);
  const y = toNumber(b);
  if (Number.isFinite(x) && Number.isFinite(y)) return x - y;
  return collator.compare(a, b);
}

type FilterRule = "contains" | "equals" | "min" | "max";

type FilterType = "text" | "number" | "date" | "select";

type FilterValue = string | { min?: string; max?: string } | string[];

/** One rule of a header's filter. A range is two rules, a min and a max. */
type ActiveFilter = {
  cell: HTMLElement;
  type: FilterType;
  rule: FilterRule;
  value: string | string[];
  /** The header's column, from 0, not counting the lead columns */
  col: number;
};

/** Whether a cell passes a column filter */
function passes(cell: HTMLElement | undefined, filter: ActiveFilter) {
  const value = valueOf(cell);
  const text = cell?.textContent.trim() ?? "";
  const wanted = Array.isArray(filter.value) ? filter.value : [filter.value];
  switch (filter.rule) {
    case "contains":
      return wanted.some((w) => fold(text).includes(fold(w)) || fold(value).includes(fold(w)));
    case "equals":
      return wanted.some((w) => fold(value) === fold(w) || fold(text) === fold(w));
    case "min":
      return !!cell && compareValues(value, wanted[0]) >= 0;
    case "max":
      return !!cell && compareValues(value, wanted[0]) <= 0;
  }
}

/**
 * The rules of every header filter with a value: `text` contains, `number`
 * and `date` within a min and max, and `select` equal to a checked value.
 */
function readFilters(headCells: HTMLElement[], columns: number): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  for (const p of layoutSection(headCells, columns)) {
    const type = p.cell.getAttribute("filter") as FilterType;
    if (!FILTER_TYPES.includes(type)) continue;
    const value = (p.cell as HTMLElement & { filterValue?: FilterValue }).filterValue;
    if (value == null) continue;
    const add = (rule: FilterRule, v: string | string[]) =>
      filters.push({ cell: p.cell, type, rule, value: v, col: p.col });
    if (type === "select") {
      if (Array.isArray(value)) add("equals", value);
    } else if (type === "text") {
      if (typeof value === "string" && value.trim()) add("contains", value.trim());
    } else if (typeof value === "object" && !Array.isArray(value)) {
      if (value.min) add("min", value.min);
      if (value.max) add("max", value.max);
    }
  }
  return filters;
}

const FILTER_TYPES: FilterType[] = ["text", "number", "date", "select"];

/** Paginations whose `total` a grid fills in */
const ownedTotals = new WeakSet<Element>();

/**
 * Search matches are highlighted with the CSS Custom Highlight API, which
 * doesn't change the cells. Every grid shares one highlight, and each adds
 * and removes its own ranges.
 */
const matchHighlight =
  typeof Highlight !== "undefined" && "highlights" in CSS ? new Highlight() : undefined;
if (matchHighlight) CSS.highlights.set("orb-grid-match", matchHighlight);

/** Styles for the grid's cells, which are in the page, not the grid's shadow root */
const lightStylesheet = new CSSStyleSheet();
lightStylesheet.replaceSync(lightStyles());
document.adoptedStyleSheets = [...document.adoptedStyleSheets, lightStylesheet];

/**
 * Sorts body rows by the cell under a header column. Numbers inside text
 * compare as numbers, so "$9" comes before "$10". Equal rows keep their
 * markup order.
 */
function sortRows(
  rows: HTMLElement[][],
  cells: HTMLElement[],
  columns: number,
  col: number,
  direction: string,
) {
  const placed = new Map(layoutSection(cells, columns).map((p) => [p.cell, p]));
  const keyOf = (row: HTMLElement[]) =>
    valueOf(
      row.find((cell) => {
        const p = placed.get(cell);
        return p.col <= col && col < p.col + p.colspan;
      }),
    );
  const sign = direction === "descending" ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index, key: keyOf(row) }))
    .sort((a, b) => sign * compareValues(a.key, b.key) || a.index - b.index)
    .map((entry) => entry.row);
}

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
 * Set `depth` on a row's first cell to make the grid a tree grid. Rows are
 * listed parent first, and each row's parent is the closest row above it with
 * a smaller depth. Rows start collapsed, and `expanded` on the first cell
 * opens one.
 *
 * A body row can have details: put an `orb-row-details` right after its
 * cells, and the grid adds a toggle that shows the details below the row,
 * across every column.
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
 * @part details-row - The row an open `orb-row-details` shows in
 * @part toggle-cell - The cell holding a row's details toggle, when any row has details
 * @part toggle - The button that shows and hides a row's details
 * @part handle-cell - The cell holding a row's drag handle, when `reorder` is set
 * @part handle - The drag handle button
 * @part drop-indicator - The line that shows where a dragged row will land
 * @part empty-row - The row shown when the search and filters hide every row
 * @part empty-cell - The cell in the empty row
 *
 * @slot empty - Replaces "No matching rows" when nothing matches. Give the
 *   element `slot="empty"`.
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
   * The `id` of an `orb-pagination` that pages the body rows. The grid shows
   * the rows on its current page, and follows its page changes. When the
   * pagination has no `total`, the grid sets it to the number of body rows,
   * and keeps it up to date. When it has no `label`, the grid sets one.
   */
  @Prop() pagination?: string;

  /**
   * The `id` of a search field, either an `orb-textbox` or an `input`. The
   * grid shows the body rows that contain every word typed in it, in any
   * column. With an `orb-textbox`, the textbox's `debounce` applies.
   */
  @Prop() searchbox?: string;

  /**
   * The search text. The grid sets it from `searchbox`, and it can be set
   * directly. Matching ignores case and accents, and checks each cell's text
   * and `value`.
   */
  @Prop({ mutable: true }) search = "";

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

  /**
   * Emits before the rows are sorted, when a sortable header is clicked or
   * Enter is pressed on it. Call `preventDefault()` to leave the sort as it is.
   */
  @Event({ cancelable: true }) orbSortChange: EventEmitter<GridSortDetail>;

  /**
   * Emits before a row's details open or close. Call `preventDefault()` to
   * keep them as they are, or use it to load the details' content.
   */
  @Event({ cancelable: true }) orbRowToggle: EventEmitter<GridRowToggleDetail>;

  /**
   * Emits before a tree row expands or collapses. Call `preventDefault()` to
   * keep it as it is, or use it to add the row's children when it first opens.
   */
  @Event({ cancelable: true }) orbRowExpand: EventEmitter<GridRowExpandDetail>;

  /**
   * Emits after the search or a header filter changes and the rows are
   * filtered, with the search, the active filters, and how many rows match.
   */
  @Event() orbFilterChange: EventEmitter<GridFilterDetail>;

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
  /** Every body row in markup order, including rows on other pages */
  private allBodyRows: Row[] = [];
  /** Each body row's `orb-row-details`, keyed by the row's first cell */
  private detailsOf = new Map<HTMLElement, HTMLElement>();
  /** Whether any body row has details, which adds the toggle column */
  private hasDetails = false;
  /** Whether the grid is a tree grid, because a row has a depth */
  private isTree = false;
  /** Every body row in the tree, by its first cell */
  private treeNodes = new Map<HTMLElement, TreeNode>();
  /** Each tree row's children at the last rebuild, to spot children added since */
  private knownChildren = new Map<HTMLElement, Set<HTMLElement>>();
  /** Tree rows with some of their descendants selected, worked out each render */
  private mixed = new Set<HTMLElement>();
  /** Whether a search or a header filter is hiding rows */
  private filtering = false;
  private activeFilters: ActiveFilter[] = [];
  /** How many body rows match the search and filters */
  private matchCount = 0;
  /** Tree rows the user collapsed while a filter was opening them */
  private collapsedWhileFiltering = new Set<HTMLElement>();
  /** The track of the "No matching rows" row, when nothing matches */
  private emptyTrack?: number;
  /** The bound search field */
  private searchEl?: HTMLElement;
  /** This grid's ranges in the shared match highlight */
  private highlightRanges: Range[] = [];
  private announceTimer?: ReturnType<typeof setTimeout>;
  /** Where each showing row sits in the tree, by its first cell */
  private treeInfo = new Map<HTMLElement, TreeInfo>();
  /** Each details toggle button, keyed by its row's first cell */
  private toggleEls = new Map<HTMLElement, HTMLElement>();
  /** Whether a header is sorting the rows */
  private sorted = false;
  /** The bound `orb-pagination` */
  private paginator?: HTMLOrbPaginationElement;
  /** Whether the grid sets the pagination's `total` */
  private ownsTotal = false;
  /** After a page turn from the keyboard, the column to focus on the new page */
  private pendingPageFocus?: number;
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
      // The lead column controls are named from their row's first cell.
      if (this.offset) forceUpdate(this.host);
    }
  });

  /**
   * Keeps the selection controls out of the Tab order. `orb-checkbox` sets its
   * own tabindex when it loads, after the grid has rendered it.
   */
  private controlObserver = new MutationObserver(() => this.updateControlTabStops());

  componentWillLoad() {
    this.internals.role = this.isTree ? "treegrid" : "grid";
    this.onSelectionModeChange();
  }

  connectedCallback() {
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      attributeFilter: [...LAYOUT_ATTRIBUTES, "tabindex"],
    });
    this.setRows();
    this.bindPaginator();
    this.bindSearchbox();
    // Highlight styles reach the cells' text in a shadow root that holds the grid
    const root = this.host.getRootNode();
    if (root instanceof ShadowRoot && !root.adoptedStyleSheets.includes(lightStylesheet)) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, lightStylesheet];
    }
  }

  componentDidLoad() {
    // The pagination may come after the grid in the page, so it might not
    // have been found when the grid connected.
    if (this.pagination && !this.paginator) this.bindPaginator();
    if (this.searchbox && !this.searchEl) this.bindSearchbox();
    this.controlObserver.observe(this.host.shadowRoot, {
      subtree: true,
      attributeFilter: ["tabindex"],
    });
  }

  componentDidRender() {
    this.updateControlTabStops();
    // After a page turn from the keyboard, focus the same column in the new
    // page's first row.
    if (this.pendingPageFocus != null) {
      const col = this.pendingPageFocus;
      this.pendingPageFocus = undefined;
      const index = this.rows.findIndex((r) => r.section === "body");
      if (index >= 0) {
        if (this.navigation === "row") this.focusRow(index);
        else this.focusCell(this.nearestIn(this.rows[index].track, col), this.rows[index].track, col);
      }
    }
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
    this.unbindPaginator();
    this.unbindSearchbox();
    this.setHighlights([]);
  }

  @Watch("searchbox")
  onSearchboxChange() {
    this.bindSearchbox();
  }

  @Watch("search")
  onSearchChange() {
    this.filtersChanged();
  }

  /** Finds the search field by its `id`, and follows what's typed in it. */
  private bindSearchbox() {
    this.unbindSearchbox();
    if (!this.searchbox) return;
    const root = this.host.getRootNode() as Document | ShadowRoot;
    const el = root.getElementById?.(this.searchbox);
    if (!el) return;
    this.searchEl = el;
    const textbox = el.localName === "orb-textbox";
    el.addEventListener(textbox ? "orbValueChange" : "input", this.onSearchInput);
    const field = (textbox ? el.querySelector("input, textarea") : el) as HTMLInputElement | null;
    if (field?.value && field.value !== this.search) this.search = field.value;
  }

  private unbindSearchbox() {
    this.searchEl?.removeEventListener("orbValueChange", this.onSearchInput);
    this.searchEl?.removeEventListener("input", this.onSearchInput);
    this.searchEl = undefined;
  }

  private onSearchInput = (ev: globalThis.Event) => {
    const value =
      ev.type === "orbValueChange"
        ? String((ev as CustomEvent).detail ?? "")
        : (ev.target as HTMLInputElement).value;
    if (value !== this.search) this.search = value;
  };

/** A header's filter value changed, from its popover or from code. */
  @Listen("orbFilterInput")
  onFilterInput(ev: globalThis.Event) {
    const cell = ev.target as HTMLElement;
    if (cell.parentElement === this.host && cell.getAttribute("section") === "head") {
      this.filtersChanged();
    }
  }

  /**
   * Filters again after the search or a filter changed: back to the first
   * page, then reports and announces how many rows match.
   */
  private filtersChanged() {
    this.collapsedWhileFiltering.clear();
    if (this.paginator) this.paginator.page = 1;
    this.setRows();
    const total = this.allBodyRows.length;
    this.orbFilterChange.emit({
      search: this.search ?? "",
      filters: [...new Set(this.activeFilters.map((f) => f.cell))].map((cell) => ({
        cell,
        type: cell.getAttribute("filter") as FilterType,
        value: (cell as HTMLElement & { filterValue?: FilterValue }).filterValue,
      })),
      matches: this.matchCount,
      total,
    });
    // After typing stops, so each keystroke isn't read out
    clearTimeout(this.announceTimer);
    const message = !this.filtering
      ? `Showing all ${total} rows.`
      : this.matchCount === 0
        ? "No rows match."
        : `${this.matchCount} of ${total} rows match.`;
    this.announceTimer = setTimeout(() => this.announce(message), 500);
  }

  /** Replaces this grid's ranges in the shared match highlight. */
  private setHighlights(ranges: Range[]) {
    if (!matchHighlight) return;
    for (const range of this.highlightRanges) matchHighlight.delete(range);
    for (const range of ranges) matchHighlight.add(range);
    this.highlightRanges = ranges;
  }

  /**
   * Highlights the search words in every showing body cell, and each
   * contains filter's text in its own column. Only matches with the same
   * accents are highlighted, though matching ignores them.
   */
  private updateHighlights() {
    if (!matchHighlight) return;
    const words = fold(this.search ?? "").split(/\s+/).filter(Boolean);
    const ranges: Range[] = [];
    for (const row of this.bodyRows) {
      for (const cell of row.cells) {
        const p = this.placements.get(cell);
        const col = p ? p.col - this.offset : -1;
        const terms = [
          ...words,
          ...this.activeFilters
            .filter((f) => f.rule === "contains" && p && f.col >= col && f.col < col + p.colspan)
            .flatMap((f) => (Array.isArray(f.value) ? f.value : [f.value]))
            .map((v) => v.toLowerCase().trim()),
        ].filter(Boolean);
        if (!terms.length) continue;
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
          if (node.parentElement?.closest("input, select, textarea, option")) continue;
          const lower = node.data.toLowerCase();
          // Lowercasing changed the length, so offsets wouldn't line up
          if (lower.length !== node.data.length) continue;
          for (const term of terms) {
            for (let i = lower.indexOf(term); i >= 0; i = lower.indexOf(term, i + term.length)) {
              const range = new Range();
              range.setStart(node, i);
              range.setEnd(node, i + term.length);
              ranges.push(range);
            }
          }
        }
      }
    }
    this.setHighlights(ranges);
  }

  @Watch("pagination")
  onPaginationChange() {
    this.bindPaginator();
  }

  /** Finds the pagination by its `id`, fills in its defaults, and follows its pages. */
  private async bindPaginator() {
    this.unbindPaginator();
    const id = this.pagination;
    if (!id) return this.setRows();
    const root = this.host.getRootNode() as Document | ShadowRoot;
    const el = root.getElementById?.(id) as HTMLOrbPaginationElement | null;
    if (!el) return;
    await customElements.whenDefined("orb-pagination");
    await el.componentOnReady?.();
    // The prop may have changed while waiting
    if (this.pagination !== id) return;

    this.paginator = el;
    // A pagination this grid has already filled in still belongs to it, such
    // as when it's bound again before the first bind finished.
    this.ownsTotal = ownedTotals.has(el) || (!el.hasAttribute("total") && !el.total);
    if (this.ownsTotal) ownedTotals.add(el);
    if (!el.hasAttribute("label") && !el.label) el.label = "Pages";
    el.addEventListener("orbPageChange", this.onPageChange);
    this.setRows();
  }

  private unbindPaginator() {
    this.paginator?.removeEventListener("orbPageChange", this.onPageChange);
    this.paginator = undefined;
  }

  private onPageChange = () => this.setRows();

  /**
   * Turns the page by `delta` from the keyboard. Emits the pagination's own
   * events, so listeners hear about it the same as a click.
   */
  private turnPage(delta: number, col: number) {
    const el = this.paginator;
    const page = Number(el.page) || 1;
    const next = Math.min(Math.max(1, page + delta), Math.max(1, el.totalPages));
    if (next === page) return;
    const detail = { page: next, pageSize: el.pageSize };
    const options = { detail, bubbles: true, composed: true };
    const allowed = el.dispatchEvent(
      new CustomEvent("orbBeforePageChange", { ...options, cancelable: true }),
    );
    if (!allowed) return;
    this.pendingPageFocus = col;
    el.page = next;
    el.dispatchEvent(new CustomEvent("orbPageChange", options));
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
    if (!this.selecting && this.selected.size) {
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

    // The body rows in markup order. Sorting and paging pick which of them
    // show, and in what order, without moving any cells in the page.
    const markupBody = groupRows(layoutSection(bySection[1].cells, columns));
    this.allBodyRows = markupBody.map((cells) => ({ section: "body", cells, track: 0, span: 1 }));

    // An orb-row-details belongs to the body row of the cell just before it.
    const detailsAfter = new Map<HTMLElement, HTMLElement>();
    let previous: HTMLElement | undefined;
    for (const el of Array.from(this.host.children) as HTMLElement[]) {
      if (el.localName === "orb-cell") previous = el;
      else if (el.localName === "orb-row-details" && previous && sectionOf(previous) === "body") {
        if (!detailsAfter.has(previous)) detailsAfter.set(previous, el);
      }
    }
    this.detailsOf = new Map();
    for (const row of markupBody) {
      const details = row.map((cell) => detailsAfter.get(cell)).find(Boolean);
      if (details) this.detailsOf.set(row[0], details);
    }
    this.hasDetails = this.detailsOf.size > 0;

    // The drag handles, details toggles, and selection controls take the
    // first columns
    const offset = this.offset;

    // A tree, when any row has a depth or can be expanded. Each row's parent
    // is the closest row above it with a smaller depth. Without a tree, every
    // row is a top-level node.
    this.isTree = markupBody.some(
      (row) => depthOf(row[0]) > 0 || row[0].hasAttribute("expandable"),
    );
    this.internals.role = this.isTree ? "treegrid" : "grid";
    const treeNodes = new Map<HTMLElement, TreeNode>();
    let roots: TreeNode[] = [];
    const stack: TreeNode[] = [];
    for (const cells of markupBody) {
      const depth = this.isTree ? depthOf(cells[0]) : 0;
      while (stack.length && depthOf(stack[stack.length - 1].cells[0]) >= depth) stack.pop();
      const parent = stack[stack.length - 1];
      const node: TreeNode = { cells, parent, children: [] };
      (parent ? parent.children : roots).push(node);
      treeNodes.set(cells[0], node);
      if (this.isTree) stack.push(node);
    }
    this.treeNodes = treeNodes;

    // Sorting sorts each parent's children, so the tree keeps its shape.
    const sortCell = bySection[0].cells.find(
      (el) => el.hasAttribute("sortable") && SORTS.includes(el.getAttribute("sort")),
    );
    this.sorted = !!sortCell;
    if (sortCell) {
      const head = layoutSection(bySection[0].cells, columns).find((p) => p.cell === sortCell);
      const direction = sortCell.getAttribute("sort");
      const arrange = (nodes: TreeNode[]): TreeNode[] => {
        const order = sortRows(nodes.map((n) => n.cells), bySection[1].cells, columns, head.col, direction);
        return order.map((cells) => {
          const node = treeNodes.get(cells[0]);
          node.children = arrange(node.children);
          return node;
        });
      };
      roots = arrange(roots);
    }

    // The search and header filters. A row matches when every search word is
    // in one of its cells, and its cell in each filtered column passes.
    const words = fold(this.search ?? "").split(/\s+/).filter(Boolean);
    const filters = readFilters(bySection[0].cells, columns);
    this.activeFilters = filters;
    this.filtering = words.length > 0 || filters.length > 0;
    const bodyPlaced = new Map(layoutSection(bySection[1].cells, columns).map((p) => [p.cell, p]));
    const cellAt = (row: HTMLElement[], col: number) =>
      row.find((cell) => {
        const p = bodyPlaced.get(cell);
        return p && p.col <= col && col < p.col + p.colspan;
      });
    const matches = (row: HTMLElement[]) => {
      if (words.length) {
        const text = fold(row.map((c) => `${c.textContent} ${c.getAttribute("value") ?? ""}`).join(" "));
        if (!words.every((word) => text.includes(word))) return false;
      }
      return filters.every((filter) => passes(cellAt(row, filter.col), filter));
    };
    this.matchCount = this.filtering ? markupBody.filter(matches).length : markupBody.length;

    // A select filter lists its column's values, from every body row.
    for (const p of layoutSection(bySection[0].cells, columns)) {
      if (p.cell.getAttribute("filter") !== "select") continue;
      const seen = new Map<string, string>();
      for (const row of markupBody) {
        const cell = cellAt(row, p.col);
        const value = valueOf(cell);
        if (!seen.has(value)) seen.set(value, cell?.textContent.trim() ?? "");
      }
      const options = [...seen]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => compareValues(a.value, b.value));
      const cell = p.cell as HTMLElement & { filterOptions?: { value: string; label: string }[] };
      // Only when they change, so the cell doesn't render for nothing
      if (JSON.stringify(cell.filterOptions ?? []) !== JSON.stringify(options)) cell.filterOptions = options;
    }

    // A row shows when it matches, or a row under it does. Rows under a
    // matching row all show, as they open. A row that only shows for a match
    // under it opens to show the match, without changing its `expanded`.
    type ViewNode = { node: TreeNode; children: ViewNode[]; forced: boolean };
    const keep = (nodes: TreeNode[], matched: boolean): ViewNode[] =>
      nodes.flatMap((node) => {
        const self = matched || !this.filtering || matches(node.cells);
        const children = keep(node.children, self);
        if (!self && !children.length) return [];
        return [{ node, children, forced: !self }];
      });
    let viewRoots = keep(roots, false);

    // Pages hold top-level rows, each with its whole subtree.
    const paginator = this.paginator;
    if (paginator) {
      const total = viewRoots.length;
      // The grid fills in the total when the page didn't set one
      if (this.ownsTotal && paginator.total !== total) paginator.total = total;
      const pageSize = Math.max(1, Number(paginator.pageSize) || 10);
      const pages = Math.max(1, Math.ceil(total / pageSize));
      // Rows were removed, so the page is past the end
      if ((Number(paginator.page) || 1) > pages) paginator.page = pages;
      const page = Math.min(Math.max(1, Number(paginator.page) || 1), pages);
      viewRoots = viewRoots.slice((page - 1) * pageSize, page * pageSize);
    }

    // The rows that show: every top-level row, and the children of open rows
    const viewBody: HTMLElement[][] = [];
    const treeInfo = new Map<HTMLElement, TreeInfo>();
    const walk = (nodes: ViewNode[], level: number) =>
      nodes.forEach(({ node, children, forced }, index) => {
        const key = node.cells[0];
        // Open by its own `expanded`, or opened by a filter to show a match
        // under it, unless the user closed it again.
        const open =
          key.hasAttribute("expanded") ||
          (this.filtering && forced && children.length > 0 && !this.collapsedWhileFiltering.has(key));
        treeInfo.set(key, {
          level,
          setsize: nodes.length,
          posinset: index + 1,
          parent: node.parent?.cells[0],
          firstChild: children[0]?.node.cells[0],
          hasChildren: node.children.length > 0 || key.hasAttribute("expandable"),
          open,
        });
        viewBody.push(node.cells);
        if (open) walk(children, level + 1);
      });
    walk(viewRoots, 1);
    this.treeInfo = treeInfo;

    // The first cell of each tree row shows the chevron and the indent.
    for (const cell of bySection[1].cells) {
      const info = this.isTree && treeInfo.get(cell);
      setAttr(
        cell,
        "tree-node",
        info ? (!info.hasChildren ? "leaf" : info.open ? "open" : "parent") : null,
      );
      if (info) cell.style.setProperty("--_tree-depth", String(info.level - 1));
      else cell.style.removeProperty("--_tree-depth");
    }

    const view: { section: Section; cells: HTMLElement[] }[] = [
      bySection[0],
      { section: "body", cells: viewBody.flat() },
      bySection[2],
    ];

    const rows: Row[] = [];
    const placements = new Map<HTMLElement, Placement>();
    const matrix: (HTMLElement | undefined)[][] = [];
    let trackOffset = 0;
    // When the search and filters hide every row, a row says so, under the header
    const empty = this.filtering && viewBody.length === 0;
    this.emptyTrack = undefined;

    // Each section is laid out on its own, like a table's thead, tbody, and
    // tfoot, so row spans don't reach into the next section.
    for (const { section, cells } of view) {
      const placed = layoutSection(cells, columns);
      const rowCount = placed.length ? Math.max(...placed.map((p) => p.track)) + 1 : 0;

      // A row is the cells that start on a track. A track covered entirely by
      // spans from above has no cells of its own, so it has no row.
      const own: Placed[][] = [];
      for (const p of placed) (own[p.track] ??= []).push(p);

      // Open details get a track of their own, after the last track their
      // row covers. Every later track moves down to make room.
      const openAfter: HTMLElement[][] = [];
      if (section === "body") {
        own.forEach((list, track) => {
          const details = list && this.detailsOf.get(list[0].cell);
          if (!details?.hasAttribute("expanded")) return;
          const last = track + Math.max(...list.map((p) => p.rowspan)) - 1;
          (openAfter[last] ??= []).push(details);
        });
      }
      const shift: number[] = [];
      for (let t = 0, inserted = 0; t <= rowCount; t++) {
        shift[t] = inserted;
        inserted += openAfter[t]?.length ?? 0;
      }
      const display = (t: number) => trackOffset + t + shift[t];

      for (const p of placed) {
        const start = display(p.track);
        const end = display(p.track + p.rowspan - 1);
        p.col += offset;
        p.rowspan = end - start + 1;
        p.track = start;
        placements.set(p.cell, { track: p.track, col: p.col, colspan: p.colspan, rowspan: p.rowspan });
        for (let dr = 0; dr < p.rowspan; dr++) {
          matrix[p.track + dr] ??= [];
          for (let dc = 0; dc < p.colspan; dc++) matrix[p.track + dr][p.col + dc] = p.cell;
        }
      }

      for (let i = 0; i < rowCount; i++) {
        const list = own[i];
        if (list) {
          const start = display(i);
          rows.push({
            section,
            cells: list.map((p) => p.cell),
            track: start,
            span: Math.max(...list.map((p) => p.track + p.rowspan)) - start,
          });
        }
        // The details span every column, including the lead columns.
        (openAfter[i] ?? []).forEach((details, n) => {
          const track = display(i) + n + 1;
          rows.push({ section: "details", cells: [details], track, span: 1 });
          placements.set(details, { track, col: 0, colspan: offset + columns, rowspan: 1 });
          matrix[track] = Array(offset + columns).fill(details);
        });
      }
      trackOffset += rowCount + (shift[rowCount] ?? 0);
      if (section === "head" && empty) this.emptyTrack = trackOffset++;
    }
    rows.sort((a, b) => a.track - b.track);

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

    // Drop selections whose row is gone. Rows on other pages stay selected.
    const bodyKeys = new Set(this.allBodyRows.map((r) => r.cells[0]));
    if ([...this.selected].some((key) => !bodyKeys.has(key))) {
      this.selected = new Set([...this.selected].filter((key) => bodyKeys.has(key)));
    }

    // In a tree, children added under a selected row are selected too, such
    // as children loaded when the row opens. Then each parent is updated from
    // its children, since rows may have been added or removed.
    if (this.cascades) {
      const next = new Set(this.selected);
      for (const [key, node] of this.treeNodes) {
        const known = this.knownChildren.get(key);
        if (!known || !next.has(key)) continue;
        for (const child of node.children) {
          if (!known.has(child.cells[0])) this.cascade(next, child.cells[0], true);
        }
      }
      this.settleParents(next);
      const changed = next.size !== this.selected.size || [...next].some((k) => !this.selected.has(k));
      if (changed) this.setSelected(next);
    }
    this.knownChildren = new Map(
      [...this.treeNodes].map(([key, node]) => [key, new Set(node.children.map((c) => c.cells[0]))]),
    );

    this.updateTabStops();
    this.updateHighlights();
  }

  /**
   * Makes the active cell or row the grid's only Tab stop, and takes the
   * content of every cell out of the Tab order, except for open cells.
   */
  private updateTabStops() {
    const cells = this.rows.flatMap((r) => r.cells);

    if (this.navigation !== "row") {
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

  /** A lead column control is a Tab stop only when it's the active cell. */
  private updateControlTabStops() {
    for (const control of [
      ...this.handleEls.values(),
      ...this.toggleEls.values(),
      ...this.controlEls.values(),
    ]) {
      const active = this.navigation !== "row" && control === this.activeCell;
      setAttr(control, "tabindex", active ? "0" : "-1");
    }
  }

  /**
   * The columns before the first data column: the drag handles, the details
   * toggles, then the selection controls, each when it's used
   */
  private get offset() {
    return (this.reorder ? 1 : 0) + (this.hasDetails ? 1 : 0) + (!this.selecting ? 0 : 1);
  }

  /**
   * Whether rows can be selected. Removing the attribute sets the prop to
   * undefined, which counts as none, the same as navigation counts as cell.
   */
  private get selecting() {
    return this.selection === "single" || this.selection === "multiple";
  }

  /** The column of the drag handles, from 0 */
  private get handleCol() {
    return this.reorder ? 0 : -1;
  }

  /** The column of the details toggles, from 0 */
  private get toggleCol() {
    return this.hasDetails ? (this.reorder ? 1 : 0) : -1;
  }

  /** The column of the selection controls, from 0 */
  private get selectCol() {
    return !this.selecting ? -1 : (this.reorder ? 1 : 0) + (this.hasDetails ? 1 : 0);
  }

  private get bodyRows() {
    return this.rows.filter((r) => r.section === "body");
  }

  /** A row's name, from its first cell, for labels and announcements */
  private rowName(key: HTMLElement) {
    return key.textContent.trim().replace(/\s+/g, " ");
  }

  /** The row a lead column control belongs to */
  private controlRow(control: HTMLElement) {
    const key = [...this.handleEls, ...this.toggleEls, ...this.controlEls].find(
      ([, el]) => el === control,
    )?.[0];
    return key ? this.rows.find((r) => r.cells[0] === key) : undefined;
  }

  /** Where a cell or a lead column control sits */
  private placementOf(el: HTMLElement): Placement | undefined {
    const p = this.placements.get(el);
    if (p) return p;
    const row = this.controlRow(el);
    const col = [...this.handleEls.values()].includes(el)
      ? this.handleCol
      : [...this.toggleEls.values()].includes(el)
        ? this.toggleCol
        : this.selectCol;
    return row && { track: row.track, col, colspan: 1, rowspan: 1 };
  }

  /** The row an `orb-row-details` belongs to, by its first cell */
  private ownerOf(details: HTMLElement) {
    return [...this.detailsOf].find(([, el]) => el === details)?.[0];
  }

  /**
   * Opens or closes a row's details. Emits `orbRowToggle` first, and does
   * nothing if it's canceled.
   */
  private toggleDetails(key: HTMLElement, open?: boolean) {
    const details = this.detailsOf.get(key);
    if (!details) return;
    const expanded = open ?? !details.hasAttribute("expanded");
    if (expanded === details.hasAttribute("expanded")) return;
    const row = this.allBodyRows.find((r) => r.cells[0] === key);
    if (this.orbRowToggle.emit({ row: row.cells, details, expanded }).defaultPrevented) return;
    setAttr(details, "expanded", expanded ? "" : null);
    this.observer.takeRecords();
    this.setRows();
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
    // Toggles behave like selection controls: they handle their own Space and Enter.
    const control = [...this.toggleEls.values(), ...this.controlEls.values()].find((el) =>
      path.includes(el),
    );
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
      const els =
        col === this.handleCol
          ? this.handleEls
          : col === this.toggleCol
            ? this.toggleEls
            : this.controlEls;
      const row = this.rows.find((r) => r.track === track && els.has(r.cells[0]));
      if (row) return els.get(row.cells[0]);
    }
    // Open details cover the lead columns too
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

  /**
   * Whether selecting a row selects its children, and the children's
   * selection decides the parent's. Only multiple selection in a tree grid.
   */
  private get cascades() {
    return this.isTree && this.selection === "multiple";
  }

  /** A row and every row under it, by their first cells */
  private subtree(key: HTMLElement) {
    const keys: HTMLElement[] = [];
    const walk = (node: TreeNode) => {
      keys.push(node.cells[0]);
      node.children.forEach(walk);
    };
    const node = this.treeNodes.get(key);
    if (node) walk(node);
    else keys.push(key);
    return keys;
  }

  /** Selects or clears a row and every row under it, including hidden ones */
  private cascade(set: Set<HTMLElement>, key: HTMLElement, on: boolean) {
    for (const k of this.subtree(key)) {
      if (on) set.add(k);
      else set.delete(k);
    }
  }

  /**
   * Makes each parent row selected when all of its children are, and not
   * selected otherwise. Goes from the deepest rows up, so a change reaches
   * every ancestor. A row with `expandable` but no children keeps its own
   * state.
   */
  private settleParents(set: Set<HTMLElement>) {
    const visit = (node: TreeNode) => {
      node.children.forEach(visit);
      if (!node.children.length) return;
      if (node.children.every((child) => set.has(child.cells[0]))) set.add(node.cells[0]);
      else set.delete(node.cells[0]);
    };
    [...this.treeNodes.values()].filter((node) => !node.parent).forEach(visit);
  }

  /**
   * Parent rows with some, but not all, of their descendants selected. Their
   * checkboxes show as mixed.
   */
  private mixedRows() {
    const mixed = new Set<HTMLElement>();
    if (!this.cascades) return mixed;
    // Returns whether the row or any row under it is selected
    const visit = (node: TreeNode): boolean => {
      let below = false;
      for (const child of node.children) if (visit(child)) below = true;
      const selected = this.selected.has(node.cells[0]);
      if (below && !selected) mixed.add(node.cells[0]);
      return selected || below;
    };
    [...this.treeNodes.values()].filter((node) => !node.parent).forEach(visit);
    return mixed;
  }

  /**
   * Reports every selected row, including rows on other pages, in markup
   * order. In a tree, parents are updated from their children first.
   */
  private setSelected(next: Set<HTMLElement>) {
    if (this.cascades) this.settleParents(next);
    this.selected = next;
    this.orbSelectionChange.emit(
      this.allBodyRows.filter((r) => next.has(r.cells[0])).map((r) => r.cells),
    );
  }

  /** Selects or deselects a row, from its selection control */
  private setRowSelected(key: HTMLElement, on: boolean) {
    if (this.selected.has(key) === on) return;
    const next =
      this.selection === "single" ? new Set<HTMLElement>(on ? [key] : []) : new Set(this.selected);
    if (this.cascades) this.cascade(next, key, on);
    else if (this.selection === "multiple") {
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
    // A mixed parent isn't selected, so Space selects all of it.
    if (this.cascades) this.cascade(next, key, !isSelected);
    else if (this.selection === "multiple") {
      if (isSelected) next.delete(key);
      else next.add(key);
    }
    this.setSelected(next);
  }

  /**
   * Sorts by a header: ascending, then descending, then back to markup order.
   * Only one header sorts at a time. Paging goes back to the first page.
   */
  private toggleSort(cell: HTMLElement) {
    const current = cell.getAttribute("sort");
    const direction =
      current === "ascending" ? "descending" : current === "descending" ? "none" : "ascending";
    if (this.orbSortChange.emit({ cell, direction }).defaultPrevented) return;

    for (const other of this.host.querySelectorAll(":scope > orb-cell[sort]")) {
      if (other !== cell) other.removeAttribute("sort");
    }
    setAttr(cell, "sort", direction === "none" ? null : direction);
    if (this.paginator) this.paginator.page = 1;
    this.observer.takeRecords();
    this.setRows();

    const name = this.rowName(cell);
    this.announce(direction === "none" ? `${name}, not sorted.` : `Sorted by ${name}, ${direction}.`);
  }

  /**
   * The row about one screen above or below a row: the farthest one that
   * still fits in the visible height with it. At least one row away.
   */
  private rowAbout(index: number, down: boolean) {
    const rectOf = (i: number) => this.rowEls.get(this.rows[i].cells[0])?.getBoundingClientRect();
    const from = rectOf(index);
    const view = Math.min(this.host.clientHeight, window.innerHeight);
    let target = index;
    for (let i = index + (down ? 1 : -1); i >= 0 && i < this.rows.length; i += down ? 1 : -1) {
      const rect = rectOf(i);
      const extent = down ? rect.bottom - from.top : from.bottom - rect.top;
      if (extent > view) break;
      target = i;
    }
    if (target === index) target = Math.min(Math.max(index + (down ? 1 : -1), 0), this.rows.length - 1);
    return target;
  }

  private isSortableHeader(el?: HTMLElement) {
    return (
      !!el &&
      el.parentElement === this.host &&
      el.getAttribute("section") === "head" &&
      el.hasAttribute("sortable")
    );
  }

  /** A click on a sortable header sorts by it, unless it was on a control inside. */
  @Listen("click")
  onClick(ev: MouseEvent) {
    const path = ev.composedPath() as Element[];

    // A tree row's chevron expands or collapses it
    if (path.some((n) => n instanceof globalThis.Element && n.classList.contains("tree-toggle"))) {
      const cell = path.find((n) => n instanceof HTMLElement && n.parentElement === this.host);
      if (cell) this.toggleExpanded(cell as HTMLElement);
      return;
    }

    // A header's filter button and popover handle their own clicks
    const inFilter = path.some(
      (n) =>
        n instanceof globalThis.Element &&
        (n.localName === "orb-popover" || n.classList.contains("filter-button")),
    );
    if (inFilter) return;

    const index = path.findIndex((n) => this.isSortableHeader(n as HTMLElement));
    if (index < 0) return;
    const onControl = path.slice(0, index).some((n) => n instanceof globalThis.Element && n.matches(FOCUSABLE));
    if (!onControl) this.toggleSort(path[index] as HTMLElement);
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
  /**
   * Why rows can't be moved right now, if they can't: a sort decides their
   * order, and tree grids don't support moving rows yet.
   */
  private get reorderBlocked() {
    if (this.isTree) return "Rows can't be moved in a tree grid.";
    if (this.sorted) return "Rows can't be moved while they're sorted. Clear the sort first.";
    return undefined;
  }

  /**
   * Expands or collapses a tree row. Emits `orbRowExpand` first, and does
   * nothing if it's canceled. Collapsing hides the row's descendants, so
   * focus on one of them moves to the row.
   */
  private toggleExpanded(key: HTMLElement, expand?: boolean) {
    const info = this.treeInfo.get(key);
    if (!this.isTree || !info?.hasChildren) return;
    const expanded = expand ?? !info.open;
    if (expanded === info.open) return;
    const row = this.allBodyRows.find((r) => r.cells[0] === key);
    if (this.orbRowExpand.emit({ row: row.cells, expanded }).defaultPrevented) return;

    let refocus = false;
    if (!expanded) {
      const hidden: HTMLElement[] = [];
      const collect = (node: TreeNode) =>
        node.children.forEach((child) => {
          hidden.push(child.cells[0]);
          collect(child);
        });
      collect(this.treeNodes.get(key));
      const active = document.activeElement;
      const activeRow = this.host.shadowRoot.activeElement;
      refocus = hidden.some((k) => {
        const node = this.treeNodes.get(k);
        const details = this.detailsOf.get(k);
        return (
          node.cells.some((c) => c === active || c.contains(active)) ||
          (details && (details === active || details.contains(active))) ||
          (activeRow && activeRow === this.rowEls.get(k))
        );
      });
    }

    setAttr(key, "expanded", expanded ? "" : null);
    // A row a filter opened stays closed until the search or filters change
    if (expanded) this.collapsedWhileFiltering.delete(key);
    else if (this.filtering) this.collapsedWhileFiltering.add(key);
    this.observer.takeRecords();
    this.setRows();
    if (refocus) {
      if (this.navigation === "row") this.focusRow(this.rows.findIndex((r) => r.cells[0] === key));
      else this.focusCell(key);
    }
  }

  private moveRow(key: HTMLElement, to: number) {
    if (this.reorderBlocked) return false;
    const body = this.bodyRows;
    const from = body.findIndex((r) => r.cells[0] === key);
    if (from < 0 || to < 0 || to >= body.length || to === from) return false;
    const row = body[from];
    const others = body.filter((r) => r !== row);

    // The event reports indexes among all the body rows, not just this page.
    const allKeys = this.allBodyRows.map((r) => r.cells[0]);
    const globalFrom = allKeys.indexOf(key);
    const rest = allKeys.filter((k) => k !== key);
    const globalTo =
      to < others.length
        ? rest.indexOf(others[to].cells[0])
        : rest.indexOf(others[others.length - 1].cells[0]) + 1;
    if (this.orbReorder.emit({ row: row.cells, from: globalFrom, to: globalTo }).defaultPrevented) {
      return false;
    }

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

    // A row's details move with it, right after its cells.
    const details = this.detailsOf.get(key);
    const moving = details ? [...row.cells, details] : row.cells;
    if (to < others.length) {
      others[to].cells[0].before(...moving);
    } else {
      const last = others[others.length - 1].cells;
      const anchor = this.detailsOf.get(last[0]) ?? last[last.length - 1];
      anchor.after(...moving);
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
    if (this.reorderBlocked) {
      this.announce(this.reorderBlocked);
      return;
    }
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
    if (this.grabbedKey || this.reorderBlocked || !rowEl || !ev.dataTransfer) {
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

    // Alt + Down opens a header's filter. On a header that doesn't sort,
    // Enter does too.
    if (where.kind === "cell" && where.cell.getAttribute("section") === "head" && where.cell.hasAttribute("filter")) {
      const opens =
        (ev.altKey && ev.key === "ArrowDown") ||
        (ev.key === "Enter" && !this.isSortableHeader(where.cell));
      if (opens) {
        ev.preventDefault();
        (where.cell as HTMLOrbCellElement).openFilter();
        return;
      }
    }

    // Alt + Up and Down move the focused body row
    if (
      this.reorder &&
      ev.altKey &&
      (ev.key === "ArrowUp" || ev.key === "ArrowDown") &&
      this.rows[rowIndex]?.section === "body"
    ) {
      ev.preventDefault();
      if (this.reorderBlocked) this.announce(this.reorderBlocked);
      else this.stepRow(this.rows[rowIndex].cells[0], ev.key === "ArrowDown");
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
        if (onRow) {
          // In row navigation, Right opens a row and Left closes it. A tree row
          // with children opens its children, or moves to the first child once
          // open. Otherwise, Right and Left open and close the row's details,
          // and Left on a tree row moves to its parent. Left on open details
          // goes back to their row.
          const row = this.rows[rowIndex];
          const open = ev.key === forward;
          const key = row.cells[0];
          const tree = row.section === "body" && this.isTree ? this.treeInfo.get(key) : undefined;
          const details = this.detailsOf.get(key);
          const indexOf = (k?: HTMLElement) => this.rows.findIndex((r) => r.cells[0] === k);
          if (row.section === "details") {
            const owner = this.ownerOf(key);
            if (!open && owner) {
              this.toggleDetails(owner, false);
              this.focusRow(indexOf(owner));
            }
          } else if (tree?.hasChildren) {
            const expanded = tree.open;
            if (open && !expanded) this.toggleExpanded(key, true);
            else if (open && tree.firstChild) this.focusRow(indexOf(tree.firstChild));
            else if (!open && expanded) this.toggleExpanded(key, false);
            else if (!open && tree.parent) this.focusRow(indexOf(tree.parent));
          } else if (open && details) {
            this.toggleDetails(key, true);
          } else if (!open && details?.hasAttribute("expanded")) {
            this.toggleDetails(key, false);
          } else if (!open && tree?.parent) {
            this.focusRow(indexOf(tree.parent));
          }
          break;
        }
        // On a tree row's first cell, Right expands a collapsed row, and Left
        // collapses an open row, or moves to the parent's first cell.
        if (this.isTree && where.kind === "cell" && this.treeInfo.has(where.cell)) {
          const info = this.treeInfo.get(where.cell);
          const expanded = info.open;
          if (ev.key === forward && info.hasChildren && !expanded) {
            this.toggleExpanded(where.cell, true);
            break;
          }
          if (ev.key !== forward && info.hasChildren && expanded) {
            this.toggleExpanded(where.cell, false);
            break;
          }
          if (ev.key !== forward && info.parent) {
            this.focusCell(info.parent);
            break;
          }
        }
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
        if (!this.selecting) return;
        this.toggleSelection(rowIndex);
        break;
      case "F2":
        // Moves into the content, even on a sortable header, where Enter sorts
        this.activate(rowIndex, onRow ? undefined : where.cell);
        break;
      case "Enter":
        if (!onRow && this.isSortableHeader(where.cell)) this.toggleSort(where.cell);
        else this.activate(rowIndex, onRow ? undefined : where.cell);
        break;
      case "PageDown":
      case "PageUp": {
        const down = ev.key === "PageDown";
        const col = pos?.col ?? this.offset;
        if (this.paginator) {
          this.turnPage(down ? 1 : -1, col);
          break;
        }
        // Without pagination, move about one screen of rows
        const target = this.rowAbout(rowIndex, down);
        if (target === rowIndex) break;
        if (onRow) this.focusRow(target);
        else {
          const track = this.rows[target].track;
          this.focusCell(this.nearestIn(track, col), track, col);
        }
        break;
      }
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
          draggable={!this.reorderBlocked}
          aria-disabled={this.reorderBlocked ? "true" : undefined}
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
   * The details toggle cell: a toggle in body rows that have details, a
   * labelled header in the first header row, and an empty cell in other rows.
   */
  private renderToggleCell(row: Row) {
    const style = { gridColumn: String(this.toggleCol + 1) };
    const key = row.cells[0];
    const details = row.section === "body" && this.detailsOf.get(key);
    if (!details) {
      const firstHead = row === this.rows.find((r) => r.section === "head");
      return (
        <div
          role={row.section === "head" ? "columnheader" : "gridcell"}
          class="lead-cell"
          part="toggle-cell"
          style={style}
        >
          {firstHead && <span class="visually-hidden">Details</span>}
        </div>
      );
    }
    return (
      <div role="gridcell" class="lead-cell" part="toggle-cell" style={style}>
        <button
          type="button"
          class="toggle"
          part="toggle"
          aria-label={`Details for ${this.rowName(key)}`}
          aria-expanded={String(details.hasAttribute("expanded"))}
          ref={(el?: HTMLElement) => el && this.toggleEls.set(key, el)}
          onClick={() => this.toggleDetails(key)}
        >
          <ChevronRightIcon aria-hidden="true" />
        </button>
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
    const mixed = this.mixed.has(key);
    const label = `Select ${key.textContent.trim().replace(/\s+/g, " ")}`;
    const ref = (el?: HTMLElement) => el && this.controlEls.set(key, el);
    return (
      <div role="gridcell" class="lead-cell" part="select-cell" style={style}>
        {this.selection === "multiple" ? (
          <orb-checkbox
            ref={ref}
            part="select-control"
            aria-label={label}
            checked={mixed ? "mixed" : checked ? "true" : "false"}
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
    // With pagination, select all works on the rows on the current page.
    // Rows selected on other pages stay selected.
    const keys = this.bodyRows.map((r) => r.cells[0]);
    const count = keys.filter((key) => this.selected.has(key)).length;
    const someMixed = keys.some((key) => this.mixed.has(key));
    const checked =
      count === keys.length ? "true" : count === 0 && !someMixed ? "false" : "mixed";
    return (
      <orb-checkbox
        ref={(el?: HTMLElement) => el && this.controlEls.set(row.cells[0], el)}
        part="select-control select-all"
        aria-label="Select all rows"
        checked={checked}
        onOrbCheckedChange={(e: CustomEvent<string>) => {
          const next = new Set(this.selected);
          for (const key of keys) {
            // In a tree, rows under collapsed rows are included too.
            if (this.cascades) this.cascade(next, key, e.detail === "true");
            else if (e.detail === "true") next.add(key);
            else next.delete(key);
          }
          this.setSelected(next);
        }}
      />
    );
  }

  /**
   * The row shown when the search and filters hide every body row. A child
   * with `slot="empty"` replaces the default text.
   */
  private renderEmptyRow() {
    const custom = this.host.querySelector<HTMLElement>(":scope > [slot='empty']");
    return (
      <div role="row" class="empty-row" part="empty-row" style={{ gridRow: String(this.emptyTrack + 1) }}>
        <div role="gridcell" class="empty-cell" part="empty-cell">
          <slot ref={(slot) => slot?.assign(...(custom ? [custom] : []))}>No matching rows</slot>
        </div>
      </div>
    );
  }

  /**
   * A tree row's level, its place among its siblings, and whether it's
   * expanded. Set explicitly, since every row is a sibling in the shadow root.
   */
  private treeAria(row: Row) {
    const info = this.isTree && row.section === "body" && this.treeInfo.get(row.cells[0]);
    if (!info) return {};
    return {
      "aria-level": String(info.level),
      "aria-setsize": String(info.setsize),
      "aria-posinset": String(info.posinset),
      "aria-expanded": info.hasChildren ? String(info.open) : undefined,
    };
  }

  render() {
    this.mixed = this.mixedRows();
    this.rowEls = new Map();
    this.controlEls = new Map();
    this.handleEls = new Map();
    this.toggleEls = new Map();
    const rowNav = this.navigation === "row";
    const leadColumns = this.offset ? `--_lead-columns: repeat(${this.offset}, min-content);` : "";
    return (
      <Host>
        <style>{`:host { --_columns: ${this.columnCount}; ${leadColumns} }`}</style>
        {this.rows.map((row) => {
          const key = row.cells[0];
          const selectable = this.selecting && row.section === "body";
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
              {...this.treeAria(row)}
              ref={(el) => el && this.rowEls.set(key, el)}
            >
              {row.section !== "details" && [
                this.reorder && this.renderHandleCell(row),
                this.hasDetails && this.renderToggleCell(row),
                this.selecting && this.renderSelectCell(row),
              ]}
              <slot ref={(slot) => slot?.assign(...row.cells)} />
            </div>
          );
        })}
        {this.emptyTrack != null && this.renderEmptyRow()}
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
