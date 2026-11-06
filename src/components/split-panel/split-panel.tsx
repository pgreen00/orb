import { Component, Host, Prop, Element } from "@stencil/core";

@Component({
  tag: "orb-split-panel",
  styleUrl: "split-panel.css",
  shadow: true,
})
export class SplitPanel {
  @Element() el!: HTMLElement;
  /**
   * Marks element as the primary panel in the view and sets it's
   * width/height to take up the remaining available space. Every
   * view must have exactly one primary panel.
   */
  @Prop({ reflect: true }) primary = false;

  /**
   * Fixes the width/height and prevents resizing
   */
  @Prop({ reflect: true }) fixed = false;

  /**
   * Set internally. Do not use.
   */
  @Prop({ reflect: true }) vertical = false;

  /**
   * Set internally. Do not use.
   */
  @Prop({ reflect: true }) beforePrimary = false;

  /**
   * Set internally. Do not use.
   */
  @Prop({ reflect: true }) afterPrimary = false;

  private divider?: HTMLElement;
  /** Ends a drag in progress */
  private stopDrag?: () => void;

  disconnectedCallback() {
    this.stopDrag?.();
  }

  /** Resizes the panel to follow the pointer, from a press on the divider until it's released */
  private onDividerDown = () => {
    if (this.fixed) return;
    this.stopDrag?.();
    const move = (ev: MouseEvent) => {
      const rect = this.el.getBoundingClientRect();
      if (this.vertical) {
        const relativeY = ev.clientY - rect.top;
        this.el.style.height = `${this.beforePrimary ? relativeY : rect.height - relativeY}px`;
      } else {
        const relativeX = ev.clientX - rect.left;
        this.el.style.width = `${this.beforePrimary ? relativeX : rect.width - relativeX}px`;
      }
    };
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      this.stopDrag = undefined;
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
    this.stopDrag = stop;
  };

  private dividerInit = (el?: HTMLElement) => {
    if (el === this.divider) return;
    this.divider?.removeEventListener("mousedown", this.onDividerDown);
    this.divider = el;
    el?.addEventListener("mousedown", this.onDividerDown);
  };

  render() {
    return (
      <Host>
        <span part='divider' class='divider' ref={this.dividerInit}></span>
        <slot />
      </Host>
    );
  }
}
