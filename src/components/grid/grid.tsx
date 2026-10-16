import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
  Watch,
} from "@stencil/core";
import styles from "./grid.css";

const stylesheet = new CSSStyleSheet();
stylesheet.replaceSync(styles());
document.adoptedStyleSheets = [...document.adoptedStyleSheets, stylesheet];

export interface SortDescriptor {
  field: string;
  direction: "asc" | "desc";
}

export interface SortIntent {
  /** Field of the header that was activated */
  field: string;
  /** Direction that field should move to */
  direction: "asc" | "desc" | null;
  /** True when the consumer should add to the existing sort rather than replace it */
  additive: boolean;
  /** The full sort the consumer should apply, in precedence order */
  sort: SortDescriptor[];
}

export interface SelectIntent {
  /** The full set of row keys that should be selected */
  keys: string[];
  added: string[];
  removed: string[];
  reason: "click" | "keyboard" | "selectAll";
}

export interface ActivateIntent {
  key?: string;
  field?: string;
  row: HTMLOrbGrElement;
  cell: HTMLOrbGcElement;
  originalEvent: Event;
}

export interface ExpandIntent {
  key?: string;
  expanded: boolean;
}

export interface ResizeIntent {
  field: string;
  width: number;
  previous: number;
}

/** Where the tab stop sits, so it can be restored after the rows are replaced */
interface GridPosition {
  section: "head" | "body" | "foot";
  row: number;
  col: number;
}

/**
 * Markup driven grid. The consumer owns the data: the grid never sorts, filters,
 * pages or selects on its own, it only emits intents describing what the user
 * asked for. Reflecting that back is done by updating props.
 *
 * @slot - Rows. Expects `orb-gr` children.
 * @slot empty - Shown when `state` is `empty`.
 * @slot loading - Shown when `state` is `loading`.
 * @slot error - Shown when `state` is `error`.
 */
@Component({
  tag: "orb-grid",
  shadow: true,
})
export class Grid {
  @AttachInternals() internals: ElementInternals;
  @Element() host: HTMLOrbGridElement;

  /**
   * Raw `grid-template-columns` value. Inferred from the header cells when omitted.
   */
  @Prop() columns?: string;

  /**
   * Total rows across every page, for `aria-rowcount`. Use -1 when unknown.
   */
  @Prop() rowCount?: number;

  /**
   * Total columns, for `aria-colcount`. Inferred from the header when omitted.
   */
  @Prop() colCount?: number;

  /**
   * Vertical padding of the cells
   */
  @Prop({ reflect: true }) density: "compact" | "default" | "comfortable" =
    "default";

  /**
   * Alternates the background of body rows
   */
  @Prop({ reflect: true }) striped = false;

  /**
   * Which grid lines to draw
   */
  @Prop({ reflect: true }) borders: "none" | "rows" | "cols" | "both" = "rows";

  /**
   * How many rows the user may select
   */
  @Prop() selection: "none" | "single" | "multiple" = "none";

  /**
   * Keys of the currently selected rows. Controlled: the grid requests changes
   * through `selectIntent` but never writes this itself.
   */
  @Prop() selected: string[] = [];

  /**
   * Current sort, as `field:direction` pairs. `"salary:desc"` or
   * `"dept:asc,salary:desc"` for a multi column sort.
   */
  @Prop() sort?: string;

  /**
   * How many columns may be sorted at once
   */
  @Prop() sortMode: "none" | "single" | "multiple" = "none";

  /**
   * Swaps the body rows for the matching slot
   */
  @Prop({ reflect: true }) state: "ready" | "loading" | "empty" | "error" =
    "ready";

  /**
   * Whether the arrow keys walk cells or whole rows
   */
  @Prop() navigation: "cell" | "row" = "cell";

  /**
   * Requests a new sort. Nothing changes until `sort` is updated.
   */
  @Event({ bubbles: false }) sortIntent: EventEmitter<SortIntent>;

  /**
   * Requests a new selection. Nothing changes until `selected` is updated.
   */
  @Event({ bubbles: false }) selectIntent: EventEmitter<SelectIntent>;

  /**
   * A row or cell was activated by double click or Enter. Cancelable: preventing
   * it stops focus moving into a cell that holds its own focusable content.
   */
  @Event({ bubbles: false, cancelable: true })
  activate: EventEmitter<ActivateIntent>;

  /**
   * Requests a row be expanded or collapsed
   */
  @Event({ bubbles: false }) expand: EventEmitter<ExpandIntent>;

  /**
   * Requests a new column width
   */
  @Event({ bubbles: false }) resizeIntent: EventEmitter<ResizeIntent>;

  /** Cell that currently holds the single grid tab stop */
  private active?: HTMLOrbGcElement;

  /** True while focus is inside a cell's own content rather than on the cell */
  private inCell = false;

  /** Watches the consumer's rows, since they change without a re-render */
  private observer?: MutationObserver;

  /** Guards against running the sync passes once per mutation in a burst */
  private queued = false;

  /** Last known spot of the tab stop, used to recover from a re-render */
  private position: GridPosition = { section: "body", row: 0, col: 0 };

  /** The element that had focus, tracked so a re-render can hand it back */
  private focused?: HTMLElement;

  /** Parsed view of `sort` */
  get sortState(): SortDescriptor[] {
    return (this.sort ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [field, direction] = part.split(":");
        return {
          field,
          direction: direction === "desc" ? "desc" : "asc",
        } as SortDescriptor;
      });
  }

  componentWillLoad() {
    this.internals.role = "grid";
    // the tracks must exist before first paint, or the grid visibly reflows
    this.syncColumns();
  }

  componentWillRender() {
    this.syncColumns();
    this.sync();
  }

  componentDidLoad() {
    /*
     * The consumer owns the rows, so most changes arrive as DOM mutations rather
     * than prop updates and Stencil never re-renders. Watching the child list is
     * what keeps a markup driven grid in sync.
     */
    this.observer = new MutationObserver(() => this.sync());
    this.observe();
    this.sync();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
  }

  /** Coalesce the passes so a burst of mutations costs one run */
  private sync() {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      if (!this.host.isConnected) return;
      /*
       * These passes write attributes and styles onto the rows and cells, which
       * the observer would otherwise report back to us as fresh mutations.
       */
      this.observer?.disconnect();
      this.syncColumns();
      this.syncRows();
      this.syncHeaders();
      this.syncSticky();
      this.syncActive();
      this.observe();
    });
  }

  private observe() {
    this.observer?.observe(this.host, {
      childList: true,
      subtree: true,
      attributeFilter: ["section", "row-key", "disabled", "sticky", "field"],
    });
  }

  @Watch("sort")
  @Watch("selected")
  @Watch("selection")
  onStateChange() {
    this.syncRows();
    this.syncHeaders();
  }

  /**
   * The template is written as an inline sheet rather than a style attribute so
   * the light DOM stylesheet can still be overridden by the consumer.
   */
  private syncColumns() {
    const columns = this.columns ?? `repeat(${this.columnCount()}, 1fr)`;
    this.host.style.setProperty("--columns", columns);
    this.internals.ariaColCount = String(this.colCount ?? this.columnCount());
    this.internals.ariaRowCount = String(this.rowCount ?? this.rows().length);
    this.internals.ariaBusy = this.state === "loading" ? "true" : "false";
    this.internals.ariaMultiSelectable =
      this.selection === "multiple" ? "true" : null;
  }

  private columnCount() {
    const head = this.headerCells();
    if (head.length) {
      return head.reduce((total, cell) => total + (cell.colSpan || 1), 0);
    }
    return this.host.querySelectorAll(":scope > orb-gr > orb-gc").length || 1;
  }

  /**
   * Rows learn their absolute index and selected state from here so a consumer
   * only has to maintain `selected` and `rowIndex` on the grid.
   */
  private syncRows() {
    const selected = new Set(this.selected ?? []);
    this.bodyRows().forEach((row, index) => {
      // a row with no key cannot be tracked across a re-render, so it cannot
      // take part in selection
      row.selectable = this.selection !== "none" && row.rowKey != undefined;
      if (row.selectable) {
        row.selected = selected.has(row.rowKey);
      }
      // 1 based, and the header occupies the first row
      if (row.rowIndex == undefined) {
        row.setAttribute("aria-rowindex", String(index + 2));
      }
    });
  }

  /** Push the parsed sort down onto the header cells that declare a field */
  private syncHeaders() {
    const sort = this.sortState;
    this.headerCells().forEach((cell) => {
      const match = sort.find((s) => s.field === cell.field);
      if (match) cell.dataset.sortDir = match.direction;
      else delete cell.dataset.sortDir;
      if (sort.length > 1 && match) cell.dataset.sortIndex = `${sort.indexOf(match) + 1}`
      else delete cell.dataset.sortIndex;
    });
  }

  /**
   * CSS cannot sum the widths of the preceding columns, so the offset each
   * sticky cell needs is measured here and handed back as a custom property.
   */
  private syncSticky() {
    const rows = this.rows();
    if (!rows.length) return;

    const template = rows[0];
    const cells = Array.from(
      template.querySelectorAll<HTMLOrbGcElement>(":scope > orb-gc"),
    );
    const starts: number[] = [];
    const ends: number[] = [];
    let offset = 0;

    cells.forEach((cell, index) => {
      starts[index] = offset;
      if (cell.sticky === "start" || cell.sticky === "") {
        offset += cell.offsetWidth;
      }
    });

    offset = 0;
    for (let index = cells.length - 1; index >= 0; index--) {
      ends[index] = offset;
      if (cells[index].sticky === "end") {
        offset += cells[index].offsetWidth;
      }
    }

    rows.forEach((row) => {
      Array.from(
        row.querySelectorAll<HTMLOrbGcElement>(":scope > orb-gc"),
      ).forEach((cell, index) => {
        if (!cell.sticky) return;
        cell.style.setProperty("--sticky-start", `${starts[index] ?? 0}px`);
        cell.style.setProperty("--sticky-end", `${ends[index] ?? 0}px`);
      });
    });
  }

  /**
   * Exactly one cell in the grid is tabbable at a time.
   *
   * Re-rendering the rows is the normal way a consumer applies an intent, which
   * detaches whatever cell was active. Keyboard operation has to survive that, so
   * the position is remembered by row/column and focus is put back if the user
   * had it when the cell went away.
   */
  private syncActive(next?: HTMLOrbGcElement) {
    const cells = this.navigableCells();
    if (!cells.length) return;

    const detached = !!this.active && !this.active.isConnected;

    /*
     * Focus can go missing two ways when the consumer applies an intent: the
     * active cell is removed outright, or it is merely re-appended to reorder
     * the rows, which drops focus without disconnecting the element. Both land
     * focus on <body>, so that is what we look for.
     */
    const dropped =
      this.host.contains(this.focused) &&
      document.activeElement !== this.focused &&
      (document.activeElement === document.body ||
        document.activeElement === null);

    if (next && cells.includes(next)) {
      this.active = next;
    } else if (detached) {
      this.active = this.cellAt(this.position) ?? cells[0];
    } else if (!this.active || !cells.includes(this.active)) {
      this.active = cells[0];
    }

    cells.forEach((cell) => cell.tabIndex = cell === this.active ? 0 : -1);
    this.position = this.positionOf(this.active);

    // only take focus back if the grid is the one that lost it
    if (dropped) {
      this.active?.focus({ preventScroll: true });
      this.focused = this.active;
    }
  }

  /** Where the active cell sits, so it can be found again after a re-render */
  private positionOf(cell?: HTMLOrbGcElement) {
    if (!cell) return this.position;
    const row = cell.parentElement as HTMLOrbGrElement | null;
    if (!row) return this.position;
    return {
      section: row.section,
      row: this.rows().indexOf(row),
      col: this.cellsOf(row).indexOf(cell),
    };
  }

  private cellAt(at: GridPosition) {
    const rows = this.navigableRows().filter((r) => r.section === at.section);
    const all = this.rows();
    const row =
      all[at.row]?.section === at.section
        ? all[at.row]
        : (rows[Math.min(at.row, rows.length - 1)] ?? rows[0]);
    if (!row) return undefined;
    const cells = this.cellsOf(row);
    return cells[Math.min(at.col, cells.length - 1)];
  }

  private rows() {
    return Array.from(
      this.host.querySelectorAll<HTMLOrbGrElement>(":scope > orb-gr"),
    );
  }

  private bodyRows() {
    return this.rows().filter((row) => row.section === "body");
  }

  private headerCells() {
    return Array.from(
      this.host.querySelectorAll<HTMLOrbGcElement>(
        ':scope > orb-gr[section="head"] > orb-gc',
      ),
    );
  }

  /** Rows the keyboard can reach, in visual order, skipping disabled ones */
  private navigableRows() {
    return this.rows().filter((row) => {
      if (row.disabled) return false;
      if (row.section === "body") return this.state === "ready";
      return true;
    });
  }

  private navigableCells() {
    return this.navigableRows().flatMap((row) =>
      Array.from(row.querySelectorAll<HTMLOrbGcElement>(":scope > orb-gc")),
    );
  }

  private cellsOf(row: HTMLOrbGrElement) {
    return Array.from(
      row.querySelectorAll<HTMLOrbGcElement>(":scope > orb-gc"),
    );
  }

  private cellFrom(target: EventTarget | null) {
    // `Element` here is Stencil's decorator, so narrow with HTMLElement
    if (!(target instanceof HTMLElement)) return undefined;
    const cell = target.closest<HTMLOrbGcElement>("orb-gc");
    return cell && cell.parentElement?.parentElement === this.host
      ? cell
      : (cell ?? undefined);
  }

  /** Focusable content the consumer put inside a cell */
  private contentOf(cell: HTMLOrbGcElement) {
    return Array.from(
      cell.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), orb-button, orb-checkbox, orb-toggle',
      ),
    ).filter((el) => !el.hasAttribute("disabled"));
  }

  private move(cell: HTMLOrbGcElement) {
    this.syncActive(cell);
    cell.focus();
  }

  @Listen("click")
  onClick(event: MouseEvent) {
    const cell = this.cellFrom(event.target);
    if (!cell) return;
    const row = cell.parentElement as HTMLOrbGrElement;

    if (row.section === "head") {
      if (cell.sortable && this.sortMode !== "none") {
        this.emitSort(cell, event.shiftKey);
      }
      return;
    }

    if (row.section === "body") {
      this.syncActive(cell);
      if (this.selection !== "none") {
        this.emitSelect(row, "click", event);
      }
    }
  }

  @Listen("dblclick")
  onDblClick(event: MouseEvent) {
    const cell = this.cellFrom(event.target);
    const row = cell?.parentElement as HTMLOrbGrElement | undefined;
    if (!cell || !row || row.section !== "body") return;
    this.activate.emit({
      key: row.rowKey,
      field: this.fieldOf(cell),
      row,
      cell,
      originalEvent: event,
    });
  }

  @Listen("focusin")
  onFocusIn(event: FocusEvent) {
    this.focused =
      event.target instanceof HTMLElement ? event.target : undefined;
    const cell = this.cellFrom(event.target);
    if (!cell) return;
    this.inCell = event.target !== cell;
    if (!this.inCell) this.syncActive(cell);
  }

  @Listen("keydown")
  onKeyDown(event: KeyboardEvent) {
    const cell = this.cellFrom(event.target);
    if (!cell) return;

    // While focus is inside a cell's own content only Escape is ours
    if (this.inCell) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.inCell = false;
        cell.focus();
      }
      return;
    }

    const row = cell.parentElement as HTMLOrbGrElement;
    const rows = this.navigableRows();
    const cells = this.cellsOf(row);
    const rowAt = rows.indexOf(row);
    const colAt = cells.indexOf(cell);

    switch (event.key) {
      case "ArrowRight":
        if (this.navigation === "row") return;
        event.preventDefault();
        if (colAt < cells.length - 1) this.move(cells[colAt + 1]);
        break;

      case "ArrowLeft":
        if (this.navigation === "row") return;
        event.preventDefault();
        if (colAt > 0) this.move(cells[colAt - 1]);
        break;

      case "ArrowDown":
        event.preventDefault();
        this.moveRow(rows, rowAt + 1, colAt);
        break;

      case "ArrowUp":
        event.preventDefault();
        this.moveRow(rows, rowAt - 1, colAt);
        break;

      case "Home":
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) this.moveRow(rows, 0, 0);
        else if (this.navigation === "cell") this.move(cells[0]);
        break;

      case "End":
        event.preventDefault();
        if (event.ctrlKey || event.metaKey)
          this.moveRow(rows, rows.length - 1, -1);
        else if (this.navigation === "cell") this.move(cells[cells.length - 1]);
        break;

      case "PageDown":
        event.preventDefault();
        this.moveRow(
          rows,
          Math.min(rowAt + this.pageStep(), rows.length - 1),
          colAt,
        );
        break;

      case "PageUp":
        event.preventDefault();
        this.moveRow(rows, Math.max(rowAt - this.pageStep(), 0), colAt);
        break;

      case " ":
        if (row.section === "body" && this.selection !== "none") {
          event.preventDefault();
          this.emitSelect(row, "keyboard", event);
        }
        break;

      case "Enter":
        event.preventDefault();
        this.onEnter(cell, row, event);
        break;
    }
  }

  private onEnter(
    cell: HTMLOrbGcElement,
    row: HTMLOrbGrElement,
    event: KeyboardEvent,
  ) {
    if (row.section === "head" && cell.sortable && this.sortMode !== "none") {
      this.emitSort(cell, event.shiftKey);
      return;
    }

    if (row.section !== "body") return;

    const proceed = this.activate.emit({
      key: row.rowKey,
      field: this.fieldOf(cell),
      row,
      cell,
      originalEvent: event,
    });

    // Default is to hand focus to whatever the consumer put in the cell
    if (!proceed.defaultPrevented) {
      const content = this.contentOf(cell);
      if (content.length) {
        this.inCell = true;
        content[0].focus();
      }
    }
  }

  /** Rough viewport worth of rows, floored so PageDown always moves */
  private pageStep() {
    const rows = this.bodyRows();
    const height = rows[0]?.getBoundingClientRect().height || 0;
    if (!height) return 10;
    return Math.max(1, Math.floor(this.host.clientHeight / height));
  }

  private moveRow(rows: HTMLOrbGrElement[], index: number, colAt: number) {
    const row = rows[index];
    if (!row) return;
    const cells = this.cellsOf(row);
    if (!cells.length) return;
    const target =
      this.navigation === "row"
        ? cells[0]
        : (cells[
            colAt < 0 ? cells.length - 1 : Math.min(colAt, cells.length - 1)
          ] ?? cells[0]);
    this.move(target);
  }

  private fieldOf(cell: HTMLOrbGcElement) {
    if (cell.field) return cell.field;
    const cells = this.cellsOf(cell.parentElement as HTMLOrbGrElement);
    return this.headerCells()[cells.indexOf(cell)]?.field;
  }

  private emitSort(cell: HTMLOrbGcElement, additive: boolean) {
    const field = cell.field;
    if (!field) return;

    const current = this.sortState;
    const existing = current.find((s) => s.field === field);

    // asc -> desc -> unsorted
    const direction: "asc" | "desc" | null =
      existing?.direction === "asc"
        ? "desc"
        : existing?.direction === "desc"
          ? null
          : "asc";

    const multi = this.sortMode === "multiple" && additive;
    const rest = multi ? current.filter((s) => s.field !== field) : [];
    const sort = direction ? [...rest, { field, direction }] : rest;

    this.sortIntent.emit({ field, direction, additive: multi, sort });
  }

  private emitSelect(
    row: HTMLOrbGrElement,
    reason: SelectIntent["reason"],
    event: MouseEvent | KeyboardEvent,
  ) {
    const key = row.rowKey;
    if (key == undefined) return;

    const current = this.selected ?? [];
    const has = current.includes(key);

    if (this.selection === "single") {
      if (has) return;
      this.selectIntent.emit({
        keys: [key],
        added: [key],
        removed: current,
        reason,
      });
      return;
    }

    // Additive by default for multiple: a plain click on a checkbox style grid
    // should not wipe the rest of the selection
    const additive = event.ctrlKey || event.metaKey || reason === "keyboard";
    if (!additive) {
      this.selectIntent.emit({
        keys: has ? [] : [key],
        added: has ? [] : [key],
        removed: has ? current : current.filter((k) => k !== key),
        reason,
      });
      return;
    }

    this.selectIntent.emit({
      keys: has ? current.filter((k) => k !== key) : [...current, key],
      added: has ? [] : [key],
      removed: has ? [key] : [],
      reason,
    });
  }

  render() {
    return (
      <Host>
        <slot />
        {this.state === "loading" && <slot name="loading" />}
        {this.state === "empty" && <slot name="empty" />}
        {this.state === "error" && <slot name="error" />}
      </Host>
    );
  }
}
