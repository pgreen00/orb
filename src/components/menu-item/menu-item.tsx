import { AttachInternals, Component, Element, Host, Prop, Watch } from "@stencil/core";
import { CheckIcon, ChevronRightIcon } from "../../utils/icons";

/**
 * An item in an `orb-menu` or `orb-menubar`. Its content is the label.
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
   * parent. Ignored in `single` and `multi` menus, where every item is a radio
   * or checkbox item.
   */
  @Prop({ reflect: true }) type: "normal" | "checkbox" | "radio" = "normal";

  /**
   * Whether a checkbox or radio item is checked. In `single` and `multi` menus,
   * whether the option is selected.
   */
  @Prop({ mutable: true, reflect: true }) checked = false;

  /**
   * The mode of the `orb-menu` this item is in. Set by the menu.
   * @internal
   */
  @Prop() menuMode: "actions" | "single" | "multi" = "actions";

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

  /** The type the item acts as. Items in `single` and `multi` menus act as radio and checkbox items. */
  private get itemType(): "normal" | "checkbox" | "radio" {
    if (this.menuMode === "single") return "radio";
    if (this.menuMode === "multi") return "checkbox";
    return this.type;
  }

  @Watch("type")
  @Watch("checked")
  @Watch("disabled")
  @Watch("menuMode")
  sync() {
    const listbox = this.menuMode !== "actions";
    const roles = { normal: "menuitem", checkbox: "menuitemcheckbox", radio: "menuitemradio" };
    this.internals.role = listbox ? "option" : (roles[this.itemType] ?? "menuitem");
    // Options report selection with aria-selected, and menu items with aria-checked.
    this.internals.ariaSelected = listbox ? String(this.checked) : null;
    this.internals.ariaChecked = listbox || this.itemType === "normal" ? null : String(this.checked);
    this.internals.ariaDisabled = this.disabled ? "true" : null;
  }

  render() {
    return (
      <Host>
        <span class="checkmark" part="checkmark" aria-hidden="true">
          {this.itemType !== "normal" && this.checked && <CheckIcon />}
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
