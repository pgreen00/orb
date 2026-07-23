import {
  Component,
  Element,
  Host,
  Listen,
  Prop,
  State,
  Watch,
} from "@stencil/core";

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

type Breakpoint = keyof typeof breakpoints;

@Component({
  tag: "orb-layout-swap",
  styleUrl: "orb-layout-swap.css",
  shadow: true,
})
export class OrbLayoutSwap {
  @Element() el: HTMLElement;
  @Prop() container = false;
  @Prop() breakpoint: Breakpoint | string = "sm";
  @State() layout: "mobile" | "desktop" = "mobile";
  private resizeCb = () => {
    const width = this.el.parentElement.clientWidth;
    const breakPoint = breakpoints[this.breakpoint] ?? Number(this.breakpoint);
    this.layout = width < breakPoint ? "mobile" : "desktop";
  };
  private obs = new ResizeObserver(this.resizeCb);

  @Listen("resize", { target: "window" })
  onResize() {
    if (!this.container) {
      const width = window.innerWidth;
      const breakPoint =
        breakpoints[this.breakpoint] ?? Number(this.breakpoint);
      this.layout = width < breakPoint ? "mobile" : "desktop";
    }
  }

  @Watch("container", { immediate: true })
  onContainerChange() {
    if (this.container) {
      this.resizeCb();
      this.obs.observe(this.el.parentElement);
    } else {
      this.obs.disconnect();
      this.onResize();
    }
  }

  render() {
    return (
      <Host>
        <slot name={this.layout}></slot>
      </Host>
    );
  }
}
