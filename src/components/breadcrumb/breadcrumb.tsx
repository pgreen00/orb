import { Component, Host, Prop } from "@stencil/core";

/**
 * One level in an `<orb-breadcrumbs>` trail. `orb-breadcrumbs` slots each
 * crumb into a link (with `href`) or a button (without), so the crumb's content,
 * including icons, renders inside it.
 */
@Component({
  tag: "orb-breadcrumb",
  styleUrl: "breadcrumb.css",
  shadow: true,
})
export class Breadcrumb {
  /**
   * Makes the crumb a link. Reflected, so setting the property updates the
   * attribute that `orb-breadcrumbs` watches.
   */
  @Prop({ reflect: true }) href?: string;

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
