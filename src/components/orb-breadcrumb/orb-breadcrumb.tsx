import { Component } from "@stencil/core";

@Component({
  tag: "orb-breadcrumb",
  styleUrl: "orb-breadcrumb.css",
  shadow: true,
})
export class OrbBreadcrumb {
  render() {
    return (
      <a>
        <slot />
      </a>
    );
  }
}
