import {
  AttachInternals,
  Component,
  Element,
  Host,
  Prop,
  Watch,
} from "@stencil/core";

/**
 * A cell in an `orb-grid`. Put cells directly inside the grid, in reading
 * order, and the grid places them in rows.
 *
 * @slot - The cell's content
 */
@Component({
  tag: "orb-cell",
  styleUrl: "grid-cell.css",
  shadow: true,
})
export class GridCell {
  @AttachInternals() internals: ElementInternals;
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

  componentWillLoad() {
    this.onSectionChange();
    this.onSpanChange();
  }

  @Watch("section")
  onSectionChange() {
    this.internals.role = this.section === "head" ? "columnheader" : "gridcell";
  }

  @Watch("colspan")
  @Watch("rowspan")
  onSpanChange() {
    this.internals.ariaColSpan = this.colspan > 1 ? String(this.colspan) : null;
    this.internals.ariaRowSpan = this.rowspan > 1 ? String(this.rowspan) : null;
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
