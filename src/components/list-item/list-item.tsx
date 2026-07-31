import { Component, Element, Host } from "@stencil/core";

@Component({
  tag: "orb-li",
  styleUrl: "list-item.css",
  shadow: {
    slotAssignment: "manual",
  },
})
export class ListItem {
  @Element() el: HTMLElement;
  private mainSlot: HTMLSlotElement;
  private subListSlot: HTMLSlotElement;
  private obs = new MutationObserver(() => this.assignSlots());
  private resolve: Function;
  private ready = new Promise((res) => (this.resolve = res));

  componentDidLoad() {
    this.resolve();
  }

  connectedCallback() {
    this.ready.then(() => {
      this.assignSlots();
      this.obs.observe(this.el, {
        childList: true,
      });
    });
  }

  disconnectedCallback() {
    this.obs.disconnect();
  }

  private assignSlots() {
    const children = Array.from(this.el.childNodes);
    this.mainSlot.assign(
      ...(children.filter(
        (t) => !(t instanceof HTMLElement) || t.tagName !== "ORB-LIST",
      ) as (Element | Text)[]),
    );
    this.subListSlot.assign(
      ...(children.filter(
        (t) => t instanceof HTMLElement && t.tagName === "ORB-LIST",
      ) as any),
    );
  }

  render() {
    return (
      <Host role="listitem">
        <span part="label">
          <slot ref={(el) => (this.mainSlot = el)} />
        </span>
        <slot ref={(el) => (this.subListSlot = el)} />
      </Host>
    );
  }
}
