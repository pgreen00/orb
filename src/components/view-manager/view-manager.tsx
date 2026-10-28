import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  Watch,
} from "@stencil/core";

//todo: timing issue with viewmount on page load

export interface ViewChangeDetail {
  /** Id of the view navigated away from */
  from: string;
  /** Id of the view navigated to */
  to: string;
}

export interface ViewNavigateOptions {
  /** `backwards` reverses the slide animation. Defaults to `forwards`. */
  direction?: "forwards" | "backwards";
  /**
   * Updates the breadcrumbs: going forwards adds the view, going backwards
   * removes crumbs back to it. Without it, the view starts a new trail.
   */
  crumbs?: boolean;
}

const ANIMATION_MS = 250;

/**
 * Manages a set of `orb-view` children, showing one at a time. Use it for
 * multi-step wizards and nested flows, such as adding a related record
 * without leaving a form. It animates between views, keeps breadcrumbs, places
 * a shared `orb-wizard` in views that show it, and lazy loads each view's
 * `<template>`.
 *
 * Navigate with `data-view-link="<id>"` on any button inside the manager, or
 * call `navigate()`.
 *
 * @slot - `orb-view` elements, each with an `id`
 * @slot wizard - An `orb-wizard`, moved to the top of the active view's content when it has `show-wizard`
 */
@Component({
  tag: "orb-view-manager",
  styleUrl: "view-manager.css",
  shadow: true,
})
export class ViewManager {
  @Element() el!: HTMLElement;
  private loaded = false;
  private navigating = false;
  private settingValue = false;
  private clones = new WeakMap<HTMLElement, ChildNode[]>();

  /**
   * The `id` of the view to show. Defaults to the first view. Setting it
   * switches views without an animation and emits `viewMount`.
   */
  @Prop({ mutable: true }) value?: string;

  /**
   * View ids in the breadcrumb trail. Store this with `value` to restore a
   * flow, for example after a page refresh.
   */
  @Prop({ mutable: true }) crumbs: string[] = [];

  /**
   * Emitted after `navigate()` or a `data-view-link` button changes the view
   */
  @Event({ bubbles: false }) viewChange: EventEmitter<ViewChangeDetail>;

  /**
   * Emitted when a view is shown without navigating: on load, or when `value`
   * is set
   */
  @Event({ bubbles: false }) viewMount: EventEmitter<string>;

  async componentDidLoad() {
    await customElements.whenDefined("orb-view");
    this.loaded = true;
    await this.mount(this.value ?? this.views[0]?.id);
  }

  @Watch("value")
  onValueChange(value?: string) {
    if (this.settingValue || !this.loaded) return;
    this.mount(value);
  }

  @Watch("crumbs")
  onCrumbsChange() {
    if (this.navigating) return;
    const active = this.activeView;
    if (active) this.syncCrumbs(active);
  }

  /**
   * Shows the view with this `id`, animating between views. Prefer
   * `data-view-link` attributes for navigation in markup.
   */
  @Method()
  async navigate(id: string, options: ViewNavigateOptions = {}) {
    if (this.navigating) return;
    const current = this.activeView;
    const next = this.views.find((view) => view.id === id);
    if (!next || next === current) return;
    if (!current) {
      this.value = id;
      return;
    }

    this.navigating = true;
    const direction = options.direction ?? "forwards";
    this.crumbs = this.nextCrumbs(id, direction, !!options.crumbs);
    const hadFocus = current.matches(":focus-within");
    current.inert = true;

    await this.activate(next);
    await this.animate(current, next, direction);
    await this.deactivate(current);
    current.inert = false;

    this.setValue(id);
    this.navigating = false;
    if (hadFocus) this.focusView(next);
    this.viewChange.emit({ from: current.id, to: id });
  }

  /**
   * Buttons with `data-view-link="<id>"` navigate to that view. Add
   * `data-view-dir="backwards"` to reverse the animation, and
   * `data-view-crumbs` to update the breadcrumbs. The click keeps propagating,
   * so the same button can also use `data-wizard` or `data-overlay`.
   */
  @Listen("click")
  onClick(event: MouseEvent) {
    const link = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.dataset.viewLink !== undefined,
      );
    if (!link) return;
    this.navigate(link.dataset.viewLink, {
      direction: link.dataset.viewDir === "backwards" ? "backwards" : "forwards",
      crumbs: link.dataset.viewCrumbs !== undefined,
    });
  }

  private get views() {
    return Array.from(this.el.querySelectorAll<HTMLOrbViewElement>(":scope > orb-view"));
  }

  private get activeView() {
    return this.views.find((view) => view.dataset.viewActive !== undefined);
  }

  /** The wizard lives in the manager, or inside whichever view shows it. */
  private get wizard() {
    return this.el.querySelector<HTMLElement>(
      ':scope > [slot="wizard"], :scope > orb-view > [slot="wizard"]',
    );
  }

  private setValue(id: string) {
    this.settingValue = true;
    this.value = id;
    this.settingValue = false;
  }

  private nextCrumbs(id: string, direction: string, crumbs: boolean) {
    if (!crumbs) return [id];
    if (direction === "forwards") {
      return this.crumbs[this.crumbs.length - 1] === id ? this.crumbs : [...this.crumbs, id];
    }
    const index = this.crumbs.lastIndexOf(id);
    return index === -1 ? [id] : this.crumbs.slice(0, index + 1);
  }

  /** Shows a view without animating, for the first load and for `value`. */
  private async mount(id?: string) {
    const views = this.views;
    const next = views.find((view) => view.id === id);
    if (!next) return;
    for (const view of views) {
      if (view !== next && view.dataset.viewActive !== undefined) await this.deactivate(view);
    }
    if (this.crumbs[this.crumbs.length - 1] !== id) this.crumbs = [id];
    if (next.dataset.viewActive === undefined) await this.activate(next);
    this.setValue(id);
    this.viewMount.emit(id);
  }

  private async activate(view: HTMLOrbViewElement) {
    await view.init?.();
    this.cloneTemplate(view);
    this.placeWizard(view);
    this.syncCrumbs(view);
    view.dataset.viewActive = "";
  }

  private async deactivate(view: HTMLOrbViewElement) {
    delete view.dataset.viewActive;
    this.destroyTemplate(view);
    await view.destroy?.();
  }

  private syncCrumbs(view: HTMLOrbViewElement) {
    const views = this.views;
    view.crumbs = this.crumbs.map((id) => ({
      id,
      label: views.find((v) => v.id === id)?.label ?? id,
    }));
  }

  /** Moves the shared wizard into the view, or back to the manager to hide it. */
  private placeWizard(view: HTMLOrbViewElement) {
    const wizard = this.wizard;
    if (!wizard) return;
    const target = view.showWizard ? view : this.el;
    if (wizard.parentElement !== target) target.append(wizard);
  }

  /**
   * Appends the template's content directly to the view, so elements with
   * `slot="footer"` and other slots still land in the right place. The cloned
   * nodes are remembered so only they are removed later.
   */
  private cloneTemplate(view: HTMLOrbViewElement) {
    const template = view.querySelector<HTMLTemplateElement>(":scope > template");
    if (!template || this.clones.has(view)) return;
    const fragment = document.importNode(template.content, true);
    this.clones.set(view, Array.from(fragment.childNodes));
    view.append(fragment);
  }

  private destroyTemplate(view: HTMLOrbViewElement) {
    this.clones.get(view)?.forEach((node) => node.remove());
    this.clones.delete(view);
  }

  /** Slides the views past each other, or crossfades with reduced motion. */
  private async animate(
    current: HTMLElement,
    next: HTMLElement,
    direction: "forwards" | "backwards",
  ) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rtl = getComputedStyle(this.el).direction === "rtl";
    const sign = (direction === "forwards" ? 1 : -1) * (rtl ? -1 : 1);
    const offset = reduce ? 0 : 30;

    next.animate(
      [
        { opacity: 0, transform: `translateX(${sign * offset}%)` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: ANIMATION_MS, easing: "ease-out" },
    );
    await current.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: `translateX(${-sign * offset}%)` },
      ],
      { duration: ANIMATION_MS, easing: "ease-in", fill: "forwards" },
    ).finished;
    current.getAnimations().forEach((animation) => animation.cancel());
  }

  /**
   * Focuses the new view's heading, so keyboard and screen reader users land
   * at the start of it instead of on the page body.
   */
  private focusView(view: HTMLOrbViewElement) {
    const heading = view.shadowRoot?.querySelector<HTMLElement>('[part="label"]');
    const fallback = view.querySelector<HTMLElement>(
      'h1, h2, h3, h4, h5, h6, [role="heading"], button, [href], input, select, textarea, [tabindex]',
    );
    (heading ?? fallback)?.focus();
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
