import { AttachInternals, Component, Host, Prop } from "@stencil/core";

/**
 * Content that a row of an `orb-grid` shows and hides. Put it right after the
 * cells of the row it belongs to. The grid adds a toggle button to that row,
 * and shows the details below it, across every column. Put anything inside:
 * text, a form, a chart, or another grid.
 *
 * Like a cell, the details are one stop for the arrow keys. Press Enter to
 * move into their content, and Escape to come back out.
 *
 * @slot - The details' content
 */
@Component({
  tag: "orb-row-details",
  styleUrl: "row-details.css",
  shadow: true,
})
export class RowDetails {
  @AttachInternals() internals: ElementInternals;

  /**
   * Whether the details are showing. The row's toggle button sets it. Set it
   * in the markup to start out open.
   */
  @Prop({ reflect: true, mutable: true }) expanded = false;

  componentWillLoad() {
    // A grid's children are rows of cells, so the details are a cell that
    // spans the whole row.
    this.internals.role = "gridcell";
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
