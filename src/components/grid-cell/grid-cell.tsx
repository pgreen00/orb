import {
  AttachInternals,
  Component,
  Element,
  Host,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import { ChevronDownIcon } from "../../utils/icons";
import { ReadyController } from "../../utils/ready-controller";

/**
 * A cell in an `orb-gr`. Becomes a column header when its row is the head, a
 * row header when `header` is set.
 *
 * @slot - Cell content
 */
@Component({
  tag: "orb-gc",
  styleUrl: "grid-cell.css",
  shadow: true,
})
export class GridCell extends ReadyController {
  @AttachInternals() internals: ElementInternals;
  @Element() host: HTMLOrbGcElement;
  @State() sortDirection?: "asc" | "desc";
  @State() sortIndex?: number;

  /**
   * Column identity. Declared on the header cell and inherited by position for
   * the body cells. Sort and filter intents name the column with this.
   */
  @Prop({ reflect: true }) field?: string;

  /**
   * How many columns the cell covers
   */
  @Prop() colSpan?: number;

  /**
   * How many rows the cell covers
   */
  @Prop() rowSpan?: number;

  /**
   * Marks a header cell as sortable. Renders the affordance and reports
   * `aria-sort`; the grid emits `orbSortIntent` when it is activated.
   */
  @Prop({ reflect: true }) sortable = false;

  /**
   * Pins the column to one edge while the grid scrolls sideways
   */
  @Prop({ reflect: true }) sticky?: "start" | "end" | "";

  /**
   * Text alignment. Numeric columns usually want `end`.
   */
  @Prop({ reflect: true }) align?: "start" | "center" | "end";

  /**
   * Lets the user drag this column's trailing edge
   */
  @Prop({ reflect: true }) resizable = false;

  /**
   * Marks a body cell as the row's header, for the identifying column
   */
  @Prop({ reflect: true }) header = false;

  @Watch("header", { immediate: true })
  async onHeaderChange() {
    await this.ready
    const section = this.host.parentElement?.getAttribute("section");
    this.internals.role =
      section === "head"
        ? "columnheader"
        : this.header
          ? "rowheader"
          : "gridcell";
  }

  @Watch("sortDirection")
  @Watch("sortable", { immediate: true })
  async onSortChange() {
    await this.ready
    if (this.sortable) {
      this.internals.ariaSort =
        this.sortDirection === "asc"
          ? "ascending"
          : this.sortDirection === "desc"
            ? "descending"
            : "none";
    } else {
      this.internals.ariaSort = null;
    }
  }

  @Watch('colSpan', { immediate: true })
  async onColSpanChange() {
    await this.ready
    if (this.colSpan != undefined) {
      this.host.style.setProperty("--col-span", String(this.colSpan));
      this.internals.ariaColSpan = String(this.colSpan);
    } else {
      this.host.style.removeProperty('--col-span')
      this.internals.ariaColSpan = null;
    }
  }

  @Watch('rowSpan', { immediate: true })
  async onRowSpanChange() {
    await this.ready
    if (this.rowSpan != undefined) {
      this.host.style.setProperty("--row-span", String(this.rowSpan));
      this.internals.ariaRowSpan = String(this.rowSpan);
    } else {
      this.host.style.removeProperty('--row-span')
      this.internals.ariaRowSpan = null;
    }
  }

  @Watch('align', { immediate: true })
  async onAlignChange() {
    await this.ready
    if (this.align) {
      this.host.style.setProperty("--align", this.align);
    } else {
      this.host.style.removeProperty('--align')
    }
  }

  @Watch("data-sort-index")
  onSortIndexChange(i?: string) {
    this.sortIndex = i != undefined ? parseInt(i) : undefined;
  }

  @Watch("data-sort-dir")
  onSortDirChange(dir?: 'asc' | 'desc') {
    this.sortDirection = dir;
  }

  render() {
    return (
      <Host>
        <slot />
        {this.sortable && (
          <span class="sort" part="sort" aria-hidden="true">
            <ChevronDownIcon width="14" height="14" />
            {this.sortIndex != undefined && (
              <span class="sort-index">{this.sortIndex}</span>
            )}
          </span>
        )}
        {this.resizable && <span class="resize" part="resize" />}
      </Host>
    );
  }
}
