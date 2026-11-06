import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Method,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import {
  ChevronRightIcon,
  FilterIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  SortIcon,
} from "../../utils/icons";
import { shareStates, toggleState } from "../../utils/custom-states";

/**
 * A cell in an `orb-grid`. Put cells directly inside the grid, in reading
 * order, and the grid places them in rows.
 *
 * @slot - The cell's content
 *
 * @part sort-icon - The arrow showing a sortable header's sort direction
 * @part tree-toggle - The chevron and indent at the start of a tree row's first cell
 * @part filter-button - The funnel button that opens a header's filter
 * @part filter-panel - The filter's content, inside its popover
 */
@Component({
  tag: "orb-cell",
  styleUrl: "grid-cell.css",
  shadow: true,
})
export class GridCell {
  @AttachInternals({
    states: {
      /** The cell's row is selected */
      selected: false,
      /** The cell is the grid's Tab stop, even while focus is elsewhere. With `navigation="row"`, every cell in the row that's the Tab stop */
      current: false,
      /** The cell's content has been entered, with Enter, F2, or a click inside */
      editing: false,
      /** The cell has text that matches the search, or its column's text filter */
      match: false,
      /** A header whose filter has a value */
      filtered: false,
      /** A header whose filter popover is open */
      "filter-open": false,
      /** The cell is at the grid's start edge. The selection, details, and drag handle columns count */
      "first-column": false,
      /** The cell is at the grid's end edge */
      "last-column": false,
      /** The cell is at the grid's top edge */
      "first-row": false,
      /** The cell is at the grid's bottom edge */
      "last-row": false,
      /** The cell is in every other body row that shows, whether or not the grid is `striped` */
      stripe: false,
      /** The first cell of a collapsed tree row that has children */
      parent: false,
      /** The first cell of an expanded tree row */
      open: false,
      /** The first cell of a tree row without children */
      leaf: false,
      /** The cell's row is picked up or being dragged */
      moving: false,
      /** The cell's row has its details showing */
      "details-open": false,
    },
  })
  internals: ElementInternals;
  @Element() host: HTMLOrbCellElement;

  /**
   * Which part of the grid the cell belongs to. Header cells name their
   * columns, and their column spans set the number of columns.
   */
  @Prop({ reflect: true }) section: "head" | "body" | "foot" = "body";

  /** Number of columns the cell covers, like a table cell's `colspan` */
  @Prop({ reflect: true }) colspan = 1;

  /**
   * Number of rows the cell covers, like a table cell's `rowspan`. It stops
   * at the end of the cell's section.
   */
  @Prop({ reflect: true }) rowspan = 1;

  /**
   * Makes a header cell sort the body rows by its column. Clicking it, or
   * pressing Enter on it, sorts ascending, then descending, then back to the
   * markup order.
   */
  @Prop({ reflect: true }) sortable = false;

  /**
   * How a sortable header is sorting its column. The grid sets it, and only
   * one header sorts at a time. Set it in the markup to start out sorted.
   */
  @Prop({ reflect: true, mutable: true }) sort?: "ascending" | "descending";

  /**
   * The cell's value for sorting and filtering, when its text isn't the real
   * value, such as an ISO date for a cell that shows "May 3", or a number for
   * "48 KB". Searches match both the text and the value.
   */
  @Prop({ reflect: true }) value?: string;

  /**
   * Makes the grid a tree grid. Set it on a row's first cell: 0 is the top
   * level, and a row is the child of the closest row above it with a smaller
   * depth.
   */
  @Prop({ reflect: true }) depth = 0;

  /**
   * Whether a tree row's children are showing. Set it on the row's first
   * cell. The grid sets it when the row's chevron is clicked.
   */
  @Prop({ reflect: true, mutable: true }) expanded = false;

  /**
   * Gives a tree row a chevron before it has children, so the children can
   * be added when it's first expanded. Set it on the row's first cell.
   */
  @Prop({ reflect: true }) expandable = false;


  /**
   * The column's width. Set it on a header cell that covers one column. `xs`
   * to `xl` are fixed widths from `--grid-col-width-xs` to
   * `--grid-col-width-xl`, `auto` sizes to the content, and `min` is only as
   * wide as the content, without wrapping.
   */
  @Prop({ reflect: true }) width?: "xs" | "sm" | "md" | "lg" | "xl" | "auto" | "min";

  /**
   * Aligns the cell's content. On a header cell that covers one column, the
   * body and footer cells in its column are aligned the same way, unless they
   * set their own.
   */
  @Prop({ reflect: true }) align?: "start" | "center" | "end";

  /**
   * Aligns the content to the end, with digits of equal width, so numbers line
   * up. On a header cell that covers one column, it applies to the whole
   * column.
   */
  @Prop({ reflect: true }) numeric = false;

  /** Tints the cell to show a meaning. Don't rely on color alone. */
  @Prop({ reflect: true }) status?: "success" | "warning" | "danger";

  /**
   * Tints the whole row to show a meaning. Set it on the row's first cell.
   * Don't rely on color alone.
   */
  @Prop({ reflect: true }) rowStatus?: "success" | "warning" | "danger";

  /**
   * On a header cell, the key its column's values are submitted under when
   * the grid is in a form, such as `name="salary"` for `employees[0][salary]`.
   * Without it, the key is the header's text.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Makes a body cell its row's header, like a `th` with `scope="row"`.
   * Screen readers read it with the other cells in the row.
   */
  @Prop({ reflect: true }) rowHeader = false;

  /**
   * Gives a header cell a filter for its column, in a popover that opens from
   * a funnel button. `text` shows cells containing the text, `number` and
   * `date` show cells within a range, and `select` shows cells whose value is
   * checked in a list of the column's values.
   */
  @Prop({ reflect: true }) filter?: "text" | "number" | "date" | "select";

  /**
   * The filter's value: a string for `text`, `{ min, max }` for `number` and
   * `date`, and the checked values for `select`, where undefined means every
   * value is checked. Set it to filter from code.
   */
  @Prop({ mutable: true }) filterValue?: string | { min?: string; max?: string } | string[];

  /**
   * The values a `select` filter lists. The grid sets it from the column's
   * cells. With a `server-side` grid, which only has one page of cells, set
   * it yourself.
   */
  @Prop() filterOptions: { value: string; label: string }[] = [];

  /**
   * Emits when a header's filter value changes, from its popover or from
   * code. The grid listens for it.
   */
  @Event() orbFilterInput: EventEmitter<void>;

  @State() filterOpen = false;

  private filterButton?: HTMLButtonElement;
  private filterPanel?: HTMLElement;
  private filterTimer?: ReturnType<typeof setTimeout>;
  /** A value waiting for typing to pause, so quick edits build on each other */
  private pendingFilter?: { value: typeof this.filterValue };

  /** Opens the header's filter, and moves focus into it. */
  @Method()
  async openFilter() {
    if (this.filter && !this.filterOpen) this.filterButton?.click();
  }

  @Watch("filterValue")
  onFilterValueChange() {
    this.updateFilterDescription();
    this.orbFilterInput.emit();
  }

  /** Whether the filter is hiding anything */
  private get filterActive() {
    const value = this.filterValue;
    if (!this.filter || value == null) return false;
    if (typeof value === "string") return !!value.trim();
    if (Array.isArray(value)) return true;
    return !!(value.min || value.max);
  }

  private updateFilterDescription() {
    // Screen readers hear that the column is filtered when they reach it, and
    // the key that opens its filter, since the funnel isn't a keyboard stop.
    const internals = this.internals as ElementInternals & { ariaDescription: string | null };
    internals.ariaDescription = this.filterActive ? "Filtered" : null;
    toggleState(internals.states, "filtered", this.section === "head" && this.filterActive);
    internals.ariaKeyShortcuts = this.section === "head" && this.filter ? "Alt+ArrowDown" : null;
  }

  /** The value, including a change still waiting for typing to pause */
  private get currentFilter() {
    return this.pendingFilter ? this.pendingFilter.value : this.filterValue;
  }

  /** Sets the value after typing pauses, so each keystroke doesn't filter */
  private setFilterSoon(value: typeof this.filterValue) {
    clearTimeout(this.filterTimer);
    this.pendingFilter = { value };
    this.filterTimer = setTimeout(() => this.setFilterNow(value), 250);
  }

  private setFilterNow(value: typeof this.filterValue) {
    clearTimeout(this.filterTimer);
    this.pendingFilter = undefined;
    this.filterValue = value;
  }

  private get columnName() {
    return this.host.textContent.trim().replace(/\s+/g, " ");
  }

  /** Moves focus to the first control once the popover is open */
  private onFilterPresent = () => {
    this.filterOpen = true;
    toggleState(this.internals.states, "filter-open", true);
    const first = this.filterPanel?.querySelector<HTMLElement>("input, orb-checkbox");
    first?.focus();
  };

  /** Focus goes back to the header, unless the user clicked somewhere else */
  private onFilterDismiss = () => {
    this.filterOpen = false;
    toggleState(this.internals.states, "filter-open", false);
    if (this.host.shadowRoot.activeElement) this.host.focus();
  };

  componentWillLoad() {
    // The grid sets the cell's other states
    shareStates(this.host, this.internals);
    this.onSectionChange();
    this.onSpanChange();
    this.updateFilterDescription();
  }

  @Watch("filter")
  onFilterTypeChange() {
    this.updateFilterDescription();
  }

  @Watch("section")
  @Watch("sortable")
  @Watch("sort")
  @Watch("rowHeader")
  onSectionChange() {
    const head = this.section === "head";
    this.internals.role = head ? "columnheader" : this.rowHeader ? "rowheader" : "gridcell";
    this.internals.ariaSort = head && this.sortable ? (this.sort ?? "none") : null;
  }

  @Watch("colspan")
  @Watch("rowspan")
  onSpanChange() {
    this.internals.ariaColSpan = this.colspan > 1 ? String(this.colspan) : null;
    this.internals.ariaRowSpan = this.rowspan > 1 ? String(this.rowspan) : null;
  }

  private renderSortIcon() {
    if (this.section !== "head" || !this.sortable) return null;
    const Icon =
      this.sort === "ascending"
        ? SortAscendingIcon
        : this.sort === "descending"
          ? SortDescendingIcon
          : SortIcon;
    return <Icon class="sort-icon" part="sort-icon" aria-hidden="true" />;
  }

  /**
   * The indent and chevron of a tree row's first cell. It only shows in the
   * `parent`, `open`, and `leaf` states, which the grid sets. The chevron is
   * for the pointer only. Screen readers hear the row's expanded state, and
   * the keyboard uses the arrow keys.
   */
  private renderTreeToggle() {
    return (
      <span class="tree-toggle" part="tree-toggle" aria-hidden="true">
        <ChevronRightIcon />
      </span>
    );
  }

  /** A min and max pair of fields, for `number` and `date` filters */
  private renderRange(type: "number" | "date") {
    const value = (this.filterValue ?? {}) as { min?: string; max?: string };
    const set = (key: "min" | "max", v: string) => {
      const next = { ...((this.currentFilter ?? {}) as { min?: string; max?: string }), [key]: v };
      this.setFilterSoon(next.min || next.max ? next : undefined);
    };
    const [from, to] = type === "date" ? ["From", "To"] : ["Min", "Max"];
    return [
      <orb-textbox label={from}>
        <input type={type} value={value.min ?? ""} onInput={(e) => set("min", (e.target as HTMLInputElement).value)} />
      </orb-textbox>,
      <orb-textbox label={to}>
        <input type={type} value={value.max ?? ""} onInput={(e) => set("max", (e.target as HTMLInputElement).value)} />
      </orb-textbox>,
    ];
  }

  /**
   * Every value starts checked. Unchecking hides the rows with that value,
   * and checking them all again turns the filter off.
   */
  private renderSelect() {
    const all = this.filterOptions.map((o) => o.value);
    const chosen = Array.isArray(this.filterValue) ? this.filterValue : all;
    // Read when clicked, since a quick second click can come before a render
    const current = () => (Array.isArray(this.filterValue) ? this.filterValue : all);
    const set = (values: string[]) =>
      this.setFilterNow(values.length === all.length && all.every((v) => values.includes(v)) ? undefined : values);
    const allState = chosen.length === all.length ? "true" : chosen.length === 0 ? "false" : "mixed";
    return (
      <orb-checkbox-group label={this.columnName}>
        <orb-checkbox
          checked={allState}
          onOrbCheckedChange={(e: CustomEvent<string>) => set(e.detail === "true" ? all : [])}
        >
          Select all
        </orb-checkbox>
        <div class="filter-options">
          {this.filterOptions.map((option) => (
            <orb-checkbox
              checked={chosen.includes(option.value) ? "true" : "false"}
              onOrbCheckedChange={(e: CustomEvent<string>) =>
                set(
                  e.detail === "true"
                    ? all.filter((v) => v === option.value || current().includes(v))
                    : current().filter((v) => v !== option.value),
                )
              }
            >
              {option.label || "(Blank)"}
            </orb-checkbox>
          ))}
        </div>
      </orb-checkbox-group>
    );
  }

  private renderFilter() {
    if (this.section !== "head" || !this.filter) return null;
    const name = this.columnName;
    return [
      <button
        id="filter-button"
        type="button"
        class={{ "filter-button": true, active: this.filterActive }}
        part="filter-button"
        // The header is the keyboard stop, and Alt + Down opens the filter.
        // Hidden from screen readers, so it isn't read as part of the
        // header's name. The header announces the shortcut instead.
        tabindex="-1"
        aria-hidden="true"
        aria-label={`Filter ${name}`}
        ref={(el) => (this.filterButton = el)}
      >
        <FilterIcon aria-hidden="true" />
      </button>,
      <orb-popover
        for="filter-button"
        placement="bottom-end"
        onOrbPresentEnd={this.onFilterPresent}
        onOrbDismissEnd={this.onFilterDismiss}
      >
        <div
          class="filter-panel"
          part="filter-panel"
          role="group"
          aria-label={`Filter ${name}`}
          ref={(el) => (this.filterPanel = el)}
        >
          {this.filter === "text" && (
            <orb-textbox label={`${name} contains`}>
              <input
                type="search"
                value={typeof this.filterValue === "string" ? this.filterValue : ""}
                onInput={(e) => this.setFilterSoon((e.target as HTMLInputElement).value || undefined)}
                onKeyDown={(e) => {
                  // Enter applies right away, without waiting for the pause
                  if (e.key === "Enter") this.setFilterNow((e.target as HTMLInputElement).value || undefined);
                }}
              />
            </orb-textbox>
          )}
          {(this.filter === "number" || this.filter === "date") && this.renderRange(this.filter)}
          {this.filter === "select" && this.renderSelect()}
          <orb-button
            size="sm"
            fill="outline"
            onClick={() => this.setFilterNow(undefined)}
          >
            Clear
          </orb-button>
        </div>
      </orb-popover>,
    ];
  }

  render() {
    return (
      <Host>
        {this.renderTreeToggle()}
        {/* Holds the text in one box when the grid truncates it */}
        <span class="text">
          <slot />
        </span>
        {this.renderSortIcon()}
        {this.renderFilter()}
      </Host>
    );
  }
}
