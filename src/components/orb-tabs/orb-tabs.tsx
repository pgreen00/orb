import { Component, Element, Host, Listen, Prop, Watch } from "@stencil/core";

@Component({
  tag: "orb-tabs",
  styleUrl: "orb-tabs.css",
  shadow: {
    slotAssignment: "manual",
  },
})
export class OrbTabs {
  @Element() el: HTMLElement;
  private tabSlot: HTMLSlotElement;
  private panelSlot: HTMLSlotElement;
  private readyResolve: Function;
  private ready = new Promise((res) => (this.readyResolve = res));
  private assignSlots = () => {
    this.tabSlot.assign(...this.el.querySelectorAll("orb-tab-button"));
  };
  private mutationObserver = new MutationObserver(this.assignSlots);

  @Prop({ mutable: true }) active?: string;
  @Prop() closable = false;

  connectedCallback() {
    this.ready.then(() => {
      this.mutationObserver.observe(this.el, {
        childList: true,
      });
    });
  }

  disconnectedCallback() {
    this.mutationObserver.disconnect();
  }

  async componentDidLoad() {
    await customElements.whenDefined("orb-tab-panel");
    await customElements.whenDefined("orb-tab-button");
    this.active ??=
      this.el.querySelector<HTMLOrbTabPanelElement>("orb-tab-panel")?.name;
    this.assignSlots();
    this.readyResolve();
  }

  @Watch("closable", { immediate: true })
  async onClosableChange(isClosable: boolean) {
    await this.ready;
    (this.tabSlot.assignedElements() as HTMLOrbTabButtonElement[]).forEach(
      (el) => (el.closable = isClosable),
    );
  }

  @Watch("active", { immediate: true })
  onActiveChange(name: string, old: string) {
    this.ready.then(() => {
      const panel = this.el.querySelector<HTMLOrbTabPanelElement>(
        `orb-tab-panel[name=${name}]`,
      );
      if (panel) {
        this.panelSlot.assign(panel);
        panel.setActive(true);
        this.el
          .querySelector<HTMLOrbTabButtonElement>(
            `orb-tab-button[panel=${name}]`,
          )
          ?.setActive(true);
        const oldPanel =
          old &&
          this.el.querySelector<HTMLOrbTabPanelElement>(
            `orb-tab-panel[name=${old}]`,
          );
        if (oldPanel) {
          oldPanel.setActive(false);
          this.el
            .querySelector<HTMLOrbTabButtonElement>(
              `orb-tab-button[panel=${old}]`,
            )
            ?.setActive(false);
        }
      }
    });
  }

  @Listen("click")
  onClick({ target }: Event) {
    const panelButton =
      target instanceof HTMLElement && target.closest("orb-tab-button");
    if (panelButton && panelButton.panel) {
      this.active = panelButton.panel;
    }
  }

  render() {
    return (
      <Host role="tablist">
        <slot name="tabs" ref={(el) => (this.tabSlot = el)}></slot>
        <slot name="panels" ref={(el) => (this.panelSlot = el)}></slot>
      </Host>
    );
  }
}
