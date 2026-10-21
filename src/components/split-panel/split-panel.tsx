import { Component, Host, Prop, Element } from "@stencil/core";
import { AsyncSubject, fromEvent, Subscription } from "rxjs";
import { filter, switchMap, takeUntil } from "rxjs/operators";

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

  private divider$ = new AsyncSubject<HTMLElement>();
  private sub?: Subscription;

  connectedCallback() {
    this.sub = this.divider$.pipe(
      switchMap(border => fromEvent(border, 'mousedown').pipe(
        filter(() => !this.fixed),
        switchMap(() => fromEvent(document, 'mousemove').pipe(
          takeUntil(fromEvent(document, 'mouseup'))
        )),
      ))
    ).subscribe((ev: MouseEvent) => {
      const rect = this.el.getBoundingClientRect();
      if (this.vertical) {
        const relativeY = ev.clientY - rect.top;
        this.el.style.height = `${this.beforePrimary ? relativeY : rect.height - relativeY}px`
      } else {
        const relativeX = ev.clientX - rect.left;
        this.el.style.width = `${this.beforePrimary ? relativeX : rect.width - relativeX}px`
      }
    })
  }

  disconnectedCallback() {
    this.sub?.unsubscribe()
  }

  private dividerInit = (el: HTMLElement) => {
    this.divider$.next(el)
    this.divider$.complete()
  }

  render() {
    return (
      <Host>
        <span part='divider' class='divider' ref={this.dividerInit}></span>
        <slot />
      </Host>
    );
  }
}
