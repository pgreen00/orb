import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-breadcrumb",
  styleUrl: "orb-breadcrumb.css",
  shadow: true,
})
export class OrbBreadcrumb {
  @Prop() href?: string;
  render() {
    return <Host />;
  }
}
