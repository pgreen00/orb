import { Component, Element, Host, Prop, Watch } from "@stencil/core";
import { CloseIcon } from "../../utils/icons";
import { Color } from "../../utils/color";

@Component({
  tag: "orb-pill",
  styleUrl: "orb-pill.css",
  shadow: true,
})
export class OrbPill {
  @Element() el: HTMLOrbPillElement;
  @Prop({ reflect: true }) outline = false;
  @Prop() removable = false;
  /** Predefined colors */
  @Prop({ reflect: true }) color?: Color;
  @Prop() pulse = false;
  @Prop() template?: string;
  private animation?: Animation;

  @Watch("pulse", { immediate: true })
  onPulseChange(isPulse: boolean) {
    if (isPulse && !this.animation) {
      const keyframes = [
        { boxShadow: `0 0 0 0 var(--background)` },
        { boxShadow: `0 0 0 0.5rem transparent`, offset: 0.7 },
        { boxShadow: `0 0 0 0 transparent` },
      ];
      this.animation = this.el.animate(keyframes, {
        duration: 1500,
        easing: "ease-out",
        iterations: Infinity,
      });
    } else if (isPulse && this.animation) {
      this.animation.play();
    } else {
      this.animation?.cancel();
    }
  }

  render() {
    return (
      <Host>
        <slot></slot>
        {this.removable && (
          <orb-button size="xs" class="icon-only">
            <CloseIcon />
          </orb-button>
        )}
      </Host>
    );
  }
}
