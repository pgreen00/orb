import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-breadcrumb",
  styleUrl: "breadcrumb.css",
  shadow: true,
})
export class Breadcrumb {
  @Prop() href?: string;
  render() {
    return <Host />;
  }
}
