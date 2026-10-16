import { AttachInternals, Component, Element, Host, Prop, Watch } from "@stencil/core";
import { ReadyController } from "../../utils/ready-controller";

/**
 * A row in an `orb-grid`. Styled from the grid's light DOM stylesheet, so this
 * only carries state and aria.
 *
 * @slot - Cells. Expects `orb-gc` children.
 */
@Component({
  tag: "orb-gr",
  shadow: true,
})
export class GridRow extends ReadyController {
  @AttachInternals() internals: ElementInternals;
  @Element() el: HTMLElement

  /**
    * Whether the row is selected. Set by the grid from its `selected` prop.
    */
  @Prop({ reflect: true }) selected = false;

  /**
   * Set by the grid. Only rows in a selectable grid expose `aria-selected`,
   * since the attribute implies selectability even when false.
   */
  @Prop() selectable = false;

  /**
   * Which part of the grid this row belongs to
   */
  @Prop({ reflect: true }) section: "head" | "body" | "foot" = "body";

  /**
   * Stable identity for the row. Every intent the grid emits refers to rows by
   * this rather than by index, so the consumer can sort and page freely.
   */
  @Prop() rowKey?: string;

  /**
   * Skipped by keyboard navigation and not selectable
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Absolute index across every page, for `aria-rowindex`. The grid falls back
   * to the DOM order when this is omitted.
   */
  @Prop() rowIndex?: number;

  componentWillLoad() {
    this.internals.role = "row";
  }

  @Watch("selected")
  @Watch("selectable", { immediate: true })
  @Watch("rowIndex")
  async syncAria() {
    await this.ready
    this.internals.ariaSelected = this.selectable
      ? String(this.selected)
      : null;
    if (this.rowIndex != undefined) {
      this.internals.ariaRowIndex = String(this.rowIndex);
    }
    this.internals.ariaDisabled = this.disabled ? "true" : null;
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
