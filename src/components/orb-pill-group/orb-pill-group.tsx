import { Component, Element, Host, Listen } from "@stencil/core";

@Component({
  tag: "orb-pill-group",
  styleUrl: "orb-pill-group.css",
  shadow: {
    slotAssignment: "manual",
  },
})
export class OrbPillGroup {
  @Element() el: HTMLOrbPillGroupElement;
  private pillSlot: HTMLSlotElement;
  private viewSlot: HTMLSlotElement;
  private mutationObserver = new MutationObserver(() => this.assignSlots());
  private get pills() {
    return this.pillSlot.assignedElements() as HTMLOrbPillElement[];
  }

  async componentDidLoad() {
    await customElements.whenDefined("orb-pill");
    this.assignSlots();
    this.onClick({ target: this.pills[0] } as any);
    this.mutationObserver.observe(this.el, { childList: true });
  }

  private assignSlots() {
    this.pillSlot.assign(...this.el.querySelectorAll(":scope > orb-pill"));
  }

  @Listen("click")
  onClick({ target }: Event) {
    const { pills } = this;
    const pill = (target as HTMLElement).closest("orb-pill");
    if (pill && pills.includes(pill)) {
      for (const el of pills) {
        el.outline = pill !== el;
        if (pill === el && el.template) {
          const node = this.cloneTemplate(el.template);
          if (node) this.viewSlot.assign(node);
        }
      }
    }
  }

  private cloneTemplate(id: string) {
    const existingTemplate = this.el.querySelector(
      `:scope > [data-template=${id}]`,
    );
    if (existingTemplate) return existingTemplate;
    const template = document.querySelector<HTMLTemplateElement>(
      `template#${id}`,
    );
    if (template) {
      const root = document.createElement("div");
      root.dataset.template = id;
      const clone = document.importNode(template.content, true);
      root.append(clone);
      this.el.append(root);
      return root;
    } else {
      return null;
    }
  }

  render() {
    return (
      <Host>
        <div part="pill-container">
          <slot ref={(el) => (this.pillSlot = el)} />
        </div>
        <div part="view">
          <slot ref={(el) => (this.viewSlot = el)} />
        </div>
      </Host>
    );
  }
}
