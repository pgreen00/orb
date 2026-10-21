import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-placeholder",
  styleUrl: "placeholder.css",
  shadow: true,
})
export class Placeholder {
  /**
   * Whether or not the component should have the animated "shimmer" effect
   */
  @Prop({ reflect: true }) animated = true;

  /**
   * The width of the placeholder
   */
  @Prop({ reflect: true }) width: string;

  /**
   * The height of the placeholder
   */
  @Prop({ reflect: true }) height: string;

  render() {
    return (
      <Host>
        <style>
          {`:host{width:${this.width};height:${this.height};}`}
        </style>
      </Host>
    );
  }
}
