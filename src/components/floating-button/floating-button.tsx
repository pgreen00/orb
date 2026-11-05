import { Component, Event, EventEmitter, Host, Listen, Prop, Watch } from "@stencil/core";

/**
 * A button that floats over the page, in a corner or along an edge of the
 * viewport. It stays in place while the page scrolls. Put an `orb-button` in
 * it with an `aria-label` for the action. Set `scroll-threshold` to show it
 * only after the page has scrolled, such as for a back-to-top button. Hidden
 * buttons can't be focused or read by screen readers.
 *
 * @slot - The button, usually an `orb-button` with an `aria-label`
 */
@Component({
  tag: "orb-floating-button",
  styleUrl: "floating-button.css",
  shadow: true,
})
export class FloatingButton {
  /**
   * Where the button sits. The `-start` and `-end` placements follow the text
   * direction. `bottom` and `top` are centered horizontally.
   */
  @Prop({ reflect: true })
  placement:
    | "bottom-end"
    | "bottom-start"
    | "bottom"
    | "top-end"
    | "top-start"
    | "top" = "bottom-end";

  /**
   * Shows or hides the button, with a short fade and slide. When
   * `scroll-threshold` is set, this follows the scroll position.
   */
  @Prop({ mutable: true, reflect: true }) open = false;

  /**
   * Opens the button once the window has scrolled down this many pixels, and
   * closes it when the page is scrolled back above that point. Leave unset to
   * control `open` yourself.
   */
  @Prop() scrollThreshold?: number;

  /** Emits when the button opens or closes. The detail is the new `open` value. */
  @Event() orbOpenChange: EventEmitter<boolean>;

  componentWillLoad() {
    this.syncWithScroll();
  }

  @Watch("open")
  onOpenChange(open: boolean) {
    this.orbOpenChange.emit(open);
  }

  @Watch("scrollThreshold")
  onScrollThresholdChange() {
    this.syncWithScroll();
  }

  @Listen("scroll", { target: "window", passive: true })
  onScroll() {
    this.syncWithScroll();
  }

  private syncWithScroll() {
    if (this.scrollThreshold == null) return;
    this.open = window.scrollY > this.scrollThreshold;
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
