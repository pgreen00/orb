import { AttachInternals, Component, Host, Prop } from "@stencil/core";

/**
 * Content that a row of an `orb-grid` shows and hides. Put anything inside: text, a form, a chart, or another grid.
 *
 * @slot - The details' content
 */
@Component({
  tag: "orb-row-details",
  styleUrl: "grid-row-details.css",
  shadow: true,
})
export class GridRowDetails {
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
