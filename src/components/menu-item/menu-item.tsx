import { AttachInternals, Component, Element, Host, Prop, Watch } from "@stencil/core";
import { CheckIcon, ChevronRightIcon } from "../../utils/icons";

/**
 * An item in an `orb-menu`. Its content is the label. Choosing it emits
 * `orbSelect` from the menu.
 *
 * To open a submenu, put the item in the `trigger` slot of an `orb-popover`
 * that contains a nested `orb-menu`.
 *
 * @slot - The label
 * @slot icon - An icon before the label
 * @slot details - Extra text after the label, such as a keyboard shortcut
 *
 * @part checkmark - The checkmark shown when a checkbox or radio item is checked
 * @part label - The wrapper around the label
 * @part details - The wrapper around the `details` slot
 * @part submenu-icon - The arrow shown on items that open a submenu
 */
@Component({
  tag: "orb-mi",
  styleUrl: "menu-item.css",
  shadow: true,
})
export class MenuItem {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLElement;

  /**
   * Identifies the item in `orbSelect`
   */
  @Prop() value?: string;

  /**
   * `checkbox` items toggle when chosen and keep the menu open. Choosing a
   * `radio` item checks it and unchecks the other radio items with the same
   * parent.
   */
  @Prop({ reflect: true }) type: "normal" | "checkbox" | "radio" = "normal";

  /**
   * Whether a checkbox or radio item is checked
   */
  @Prop({ mutable: true, reflect: true }) checked = false;

  /**
   * Keeps the item focusable but stops it from being chosen
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * `danger` colors the item for destructive actions, such as Delete
   */
  @Prop({ reflect: true }) variant?: "danger";

  componentWillLoad() {
    this.sync();
  }

  @Watch("type")
  @Watch("checked")
  @Watch("disabled")
  sync() {
    const roles = { normal: "menuitem", checkbox: "menuitemcheckbox", radio: "menuitemradio" };
    this.internals.role = roles[this.type] ?? "menuitem";
    this.internals.ariaChecked = this.type === "normal" ? null : String(this.checked);
    this.internals.ariaDisabled = this.disabled ? "true" : null;
  }

  render() {
    return (
      <Host>
        <span class="checkmark" part="checkmark" aria-hidden="true">
          {this.type !== "normal" && this.checked && <CheckIcon />}
        </span>
        <slot name="icon" />
        <span class="label" part="label">
          <slot />
        </span>
        <span class="details" part="details">
          <slot name="details" />
        </span>
        <ChevronRightIcon class="submenu-icon" part="submenu-icon" aria-hidden="true" />
      </Host>
    );
  }
}
