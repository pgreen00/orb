import {
  AttachInternals,
  Component,
  Element,
  Host,
  Prop,
  Watch,
} from "@stencil/core";

const TEMPLATE_ROOT_CLASS = "orb--tab-panel-template-root";

/**
 * Content inside a `<template>` child is lazy loaded: it's cloned into the
 * panel the first time the panel is selected. With an offload delay, the clone
 * is removed again after the panel has been inactive for that long, and
 * re-created the next time it's selected.
 */
@Component({
  tag: "orb-tab-panel",
  styleUrl: "tab-panel.css",
  shadow: true,
  formAssociated: true,
})
export class TabPanel {
  @AttachInternals({
    states: {
      /**
       * The panel is currently being displayed
       */
      active: false,
    },
  })
  internals: ElementInternals;
  @Element() el: HTMLElement;
  private offloadTimer?: ReturnType<typeof setTimeout>;

  @Prop() name?: string;

  /**
   * Milliseconds the panel stays inactive before its template content is
   * removed. Overrides `offload-delay` on `orb-tabs`. Only applies to content
   * inside a `<template>`.
   */
  @Prop() offloadDelay?: number;

  componentWillLoad() {
    this.onSelectedChange(this.el.dataset.selected);
  }

  disconnectedCallback() {
    clearTimeout(this.offloadTimer);
  }

  /** `orb-tabs` sets `data-selected` on the active panel. */
  @Watch("data-selected")
  onSelectedChange(selected?: string) {
    const isSelected = selected === "";
    this.internals.states[isSelected ? "add" : "delete"]("active");

    clearTimeout(this.offloadTimer);
    if (isSelected) {
      this.loadTemplate();
    } else {
      this.scheduleOffload();
    }
  }

  private get delay(): number | undefined {
    const tabs = this.el.parentElement as HTMLOrbTabsElement | null;
    return this.offloadDelay ?? tabs?.offloadDelay;
  }

  private get templateRoot() {
    return this.el.querySelector(`:scope > .${TEMPLATE_ROOT_CLASS}`);
  }

  private loadTemplate() {
    if (this.templateRoot) return;
    const template =
      this.el.querySelector<HTMLTemplateElement>(":scope > template");
    if (!template) return;

    const root = document.createElement("div");
    root.classList.add(TEMPLATE_ROOT_CLASS);
    root.append(document.importNode(template.content, true));
    this.el.append(root);
  }

  private scheduleOffload() {
    const delay = this.delay;
    if (delay == null || !this.templateRoot) return;
    this.offloadTimer = setTimeout(() => this.templateRoot?.remove(), delay);
  }

  render() {
    return (
      <Host role="tabpanel">
        <slot></slot>
      </Host>
    );
  }
}
