import {
  Component,
  Element,
  Host,
  Listen,
  Method,
  Prop,
  Watch,
} from "@stencil/core";
import { ReadyController } from "../../utils/ready-controller";

@Component({
  tag: "orb-tabs",
  styleUrl: "tabs.css",
  shadow: {
    slotAssignment: "manual",
  },
})
export class Tabs extends ReadyController {
  @Element() el: HTMLElement;
  private tabSlot: HTMLSlotElement;
  private panelSlot: HTMLSlotElement;
  private assignSlots = () => {
    this.tabSlot.assign(...this.el.querySelectorAll("orb-tab-button"));
  };
  private mutationObserver = new MutationObserver(() => {
    this.assignSlots();
    this.syncSelection();
  });

  @Prop({ mutable: true }) active?: string;
  @Prop() closable = false;

  /**
   * Displays the tab buttons as rounded pills in a toolbar, like modern
   * browser tabs, instead of traditional connected tabs
   */
  @Prop({ reflect: true }) pills = false;

  /**
   * Wraps the tabs onto new lines when they don't fit. Without it, the tab
   * bar scrolls instead. Only applies to `top` and `bottom` placements.
   */
  @Prop({ reflect: true }) wrap = false;

  /**
   * Milliseconds an inactive panel waits before removing its lazy loaded
   * `<template>` content. The content is re-created when the panel is
   * selected again. Leave unset to keep loaded content. Panels can override
   * this with their own `offload-delay`.
   */
  @Prop() offloadDelay?: number;

  /**
   * Which edge of the panels the tabs appear on. `top` and `bottom` lay the
   * tabs out horizontally, `start` and `end` stack them vertically.
   */
  @Prop({ reflect: true }) placement: "top" | "bottom" | "start" | "end" =
    "top";

  private get orientation() {
    return this.placement === "start" || this.placement === "end"
      ? "vertical"
      : "horizontal";
  }

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
    super.componentDidLoad()
  }

  @Watch("closable", { immediate: true })
  async onClosableChange(isClosable: boolean) {
    await this.ready;
    (this.tabSlot.assignedElements() as HTMLOrbTabButtonElement[]).forEach(
      (el) => (el.closable = isClosable),
    );
  }

  @Watch("active", { immediate: true })
  async onActiveChange() {
    await this.ready;
    this.syncSelection();
  }

  /**
   * Marks the active button and panel with `data-selected` and clears it from
   * the rest, the same way radio-group marks its selected radio. Only the
   * active panel is assigned to the panel slot.
   */
  private syncSelection() {
    const setSelected = (el: HTMLElement, selected: boolean) => {
      if (selected) el.dataset.selected = "";
      else delete el.dataset.selected;
    };

    this.getButtons().forEach((button) =>
      setSelected(button, button.panel === this.active),
    );

    const panels = this.getPanels();
    panels.forEach((panel) => setSelected(panel, panel.name === this.active));
    const activePanel = panels.find((panel) => panel.name === this.active);
    this.panelSlot.assign(...(activePanel ? [activePanel] : []));
  }

  /**
   * Removes the tab button and panel for `panel`. If it was the active tab,
   * the next tab becomes active, or the previous one when it was last. Doesn't
   * emit `tabClose`.
   */
  @Method()
  async closeTab(panel: string) {
    const buttons = this.getButtons();
    const button = buttons.find((el) => el.panel === panel);
    const panelEl = this.getPanels().find((el) => el.name === panel);
    // Focus would otherwise drop to the page when the focused tab is removed.
    const hadFocus = button?.matches(":focus-within") ?? false;

    if (this.active === panel) {
      const index = buttons.indexOf(button);
      const next = buttons[index + 1] ?? buttons[index - 1];
      this.active = next?.panel;
    }

    button?.remove();
    panelEl?.remove();

    if (hadFocus) {
      this.getButtons()
        .find((el) => el.panel === this.active)
        ?.focus();
    }
  }

  /** Direct children only, so tabs nested inside a panel aren't included. */
  private getButtons() {
    return Array.from(
      this.el.querySelectorAll<HTMLOrbTabButtonElement>(
        ":scope > orb-tab-button",
      ),
    );
  }

  private getPanels() {
    return Array.from(
      this.el.querySelectorAll<HTMLOrbTabPanelElement>(":scope > orb-tab-panel"),
    );
  }

  /**
   * Arrow keys move to the previous or next tab and select it, wrapping at the
   * ends. Home and End go to the first and last tab. Horizontal tabs use left
   * and right, flipped in right-to-left pages. Vertical tabs use up and down.
   */
  @Listen("keydown")
  onKeyDown(e: KeyboardEvent) {
    const { target } = e;
    const button =
      target instanceof HTMLElement ? target.closest("orb-tab-button") : null;
    // Ignore nested tabs and keys pressed on the close button.
    if (!button || button.parentElement !== this.el) return;
    const origin = e.composedPath()[0];
    if (!(origin instanceof HTMLElement) || origin.getAttribute("role") !== "tab") {
      return;
    }

    const vertical = this.orientation === "vertical";
    const rtl = getComputedStyle(this.el).direction === "rtl";
    const previousKey = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";

    const buttons = this.getButtons();
    const index = buttons.indexOf(button);
    let next: HTMLOrbTabButtonElement | undefined;
    switch (e.key) {
      case nextKey:
        next = buttons[(index + 1) % buttons.length];
        break;
      case previousKey:
        next = buttons[(index - 1 + buttons.length) % buttons.length];
        break;
      case "Home":
        next = buttons[0];
        break;
      case "End":
        next = buttons[buttons.length - 1];
        break;
      case "Enter":
      case " ":
        next = button;
        break;
      default:
        return;
    }

    e.preventDefault();
    if (next.panel) this.active = next.panel;
    next.focus();
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
      <Host role="tablist" aria-orientation={this.orientation}>
        <style>{`:host{--mode:${this.pills ? "pills" : "tabs"};--orientation:${this.orientation};}`}</style>
        <slot name="tabs" ref={(el) => (this.tabSlot = el)}></slot>
        <slot name="panels" ref={(el) => (this.panelSlot = el)}></slot>
      </Host>
    );
  }
}
