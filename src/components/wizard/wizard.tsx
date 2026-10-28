import {
  AttachInternals,
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

export interface WizardStepChangeDetail {
  /** Index of the newly active step */
  index: number;
  /** Index of the previously active step, or -1 if there wasn't one */
  previousIndex: number;
  step: HTMLOrbWizardItemElement;
  previousStep?: HTMLOrbWizardItemElement;
}

/** Steps narrower than this (in em) stack when `orientation="auto"`. */
const AUTO_STACK_EM_PER_STEP = 6;

let liveRegion: HTMLElement | undefined;

/**
 * Announces text through one visually hidden live region shared by every
 * wizard. It lives on `document.body` because the wizard has the `list` role,
 * which can only contain list items.
 */
function announce(text: string) {
  if (!liveRegion?.isConnected) {
    liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    Object.assign(liveRegion.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      margin: "-1px",
      padding: "0",
      border: "0",
      overflow: "hidden",
      clip: "rect(0 0 0 0)",
      whiteSpace: "nowrap",
    });
    document.body.append(liveRegion);
  }
  // Clearing first makes repeated identical messages announce again.
  liveRegion.textContent = "";
  requestAnimationFrame(() => (liveRegion!.textContent = text));
}

/** The step's label: its text, without the `icon` and `note` slots. */
function labelOf(item: HTMLElement) {
  return Array.from(item.childNodes)
    .filter((node) => !(node instanceof HTMLElement && node.slot))
    .map((node) => node.textContent)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Shows progress through a sequence of steps. Each `<orb-wizard-item>` is a
 * step, and the one with the `active` attribute is the current step. The
 * wizard only shows progress: render each step's content yourself, and mark
 * steps `completed` from your own code.
 *
 * @slot - One or more `<orb-wizard-item>` elements
 */
@Component({
  tag: "orb-wizard",
  styleUrl: "wizard.css",
  shadow: true,
})
export class Wizard {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLElement;

  /**
   * Accessible name for the wizard. Set it when a page has more than one.
   */
  @Prop() label?: string;

  /**
   * Renders each step as a button, so clicking it, or focusing it and pressing
   * Enter or Space, goes straight to it. Disabled and locked steps can't be
   * activated.
   */
  @Prop({ reflect: true }) clickable = false;

  /**
   * Requires steps to be completed in order. Every step after the first
   * incomplete one is locked and can't be reached until the steps before it
   * are `completed`.
   */
  @Prop({ reflect: true }) linear = false;

  /**
   * Layout direction. `auto` lays steps out in a row and stacks them when
   * there's less than about 6em of width per step.
   */
  @Prop({ reflect: true }) orientation: "horizontal" | "vertical" | "auto" =
    "horizontal";

  /**
   * Emitted before the active step changes. Call `preventDefault()` to stop
   * the change, for example to guard against unsaved data.
   */
  @Event({ cancelable: true }) orbBeforeStepChange: EventEmitter<WizardStepChangeDetail>;

  /**
   * Emitted after the active step changes through `next()`, `previous()`,
   * `goTo()`, a click, or a `data-wizard` button. Setting `active` on an item
   * directly doesn't emit it.
   */
  @Event() orbStepChange: EventEmitter<WizardStepChangeDetail>;

  /**
   * Emitted when every step that isn't disabled becomes completed
   */
  @Event() orbFinish: EventEmitter<void>;

  private allCompleted = false;
  private loaded = false;
  private resizeObserver = new ResizeObserver(() => this.sync());
  private mutationObserver = new MutationObserver((records) => {
    // An item that was just made active wins over any other active item.
    const activated = records
      .filter(
        (r) =>
          r.type === "attributes" &&
          r.attributeName === "active" &&
          (r.target as HTMLElement).hasAttribute("active"),
      )
      .map((r) => r.target as HTMLOrbWizardItemElement)
      .pop();
    this.sync(activated);
  });

  componentWillLoad() {
    this.internals.role = "list";
    this.onLabelChange();
  }

  async componentDidLoad() {
    await customElements.whenDefined("orb-wizard-item");
    this.startObserving();
    this.loaded = true;
  }

  /** Restarts the observers when the wizard is moved, for example between views. */
  connectedCallback() {
    if (this.loaded) this.startObserving();
  }

  private startObserving() {
    this.mutationObserver.observe(this.el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["active", "completed", "disabled", "loading", "error", "variant"],
    });
    this.resizeObserver.observe(this.el);
    this.sync();
  }

  disconnectedCallback() {
    this.mutationObserver.disconnect();
    this.resizeObserver.disconnect();
  }

  @Watch("label")
  onLabelChange() {
    this.internals.ariaLabel = this.label || null;
  }

  @Watch("clickable")
  @Watch("linear")
  @Watch("orientation")
  onLayoutChange() {
    this.sync();
  }

  /**
   * Goes to the step after the active one, skipping disabled steps. Does
   * nothing if that step is locked.
   */
  @Method()
  async next() {
    const items = this.items;
    const start = items.indexOf(this.activeItem);
    const target = items.slice(start + 1).find((item) => !item.disabled);
    if (target) await this.requestStep(target);
  }

  /**
   * Goes to the step before the active one, skipping disabled steps.
   */
  @Method()
  async previous() {
    const items = this.items;
    const start = items.indexOf(this.activeItem);
    const target = items
      .slice(0, Math.max(0, start))
      .reverse()
      .find((item) => !item.disabled);
    if (target) await this.requestStep(target);
  }

  /**
   * Goes to a step, given its index or element. Emits a cancelable
   * `orbBeforeStepChange`, then `orbStepChange`, and announces the new step to
   * screen readers. Does nothing if the step doesn't exist, is disabled, or is
   * locked.
   */
  @Method()
  async goTo(step: number | HTMLOrbWizardItemElement) {
    const target = typeof step === "number" ? this.items[step] : step;
    if (target) await this.requestStep(target);
  }

  /**
   * Buttons anywhere on the page with `data-wizard="next <id>"`,
   * `data-wizard="previous <id>"`, or `data-wizard="goto <id> <index>"` call
   * the matching method on the wizard with that id.
   */
  @Listen("click", { target: "document" })
  onDocumentClick(e: MouseEvent) {
    const invoker =
      e.target instanceof HTMLElement ? e.target.closest("[data-wizard]") : null;
    if (!invoker || !this.el.id) return;
    const [action, id, arg] = invoker.getAttribute("data-wizard")!.trim().split(/\s+/);
    if (id !== this.el.id) return;
    if (action === "next") this.next();
    else if (action === "previous") this.previous();
    else if (action === "goto" && arg != null) this.goTo(Number(arg));
  }

  /** Clicks on a clickable step's button go to that step. */
  @Listen("click")
  onClick(e: MouseEvent) {
    if (!this.clickable) return;
    const item = (e.target as HTMLElement).closest?.("orb-wizard-item");
    if (!item || item.parentElement !== this.el) return;
    const fromButton = e
      .composedPath()
      .some((node) => node instanceof HTMLButtonElement && node.part.contains("button"));
    if (fromButton) this.requestStep(item as HTMLOrbWizardItemElement);
  }

  private get items() {
    return Array.from(
      this.el.querySelectorAll<HTMLOrbWizardItemElement>(":scope > orb-wizard-item"),
    );
  }

  private get activeItem() {
    return this.items.find((item) => item.active);
  }

  /** Index of the first step that isn't completed or disabled. */
  private firstIncomplete(items: HTMLOrbWizardItemElement[]) {
    const index = items.findIndex((item) => !item.completed && !item.disabled);
    return index === -1 ? items.length : index;
  }

  private isLocked(items: HTMLOrbWizardItemElement[], item: HTMLOrbWizardItemElement) {
    return this.linear && items.indexOf(item) > this.firstIncomplete(items);
  }

  private async requestStep(target: HTMLOrbWizardItemElement) {
    const items = this.items;
    const previousStep = this.activeItem;
    const index = items.indexOf(target);
    if (
      index === -1 ||
      target === previousStep ||
      target.disabled ||
      this.isLocked(items, target)
    ) {
      return;
    }

    const detail: WizardStepChangeDetail = {
      index,
      previousIndex: previousStep ? items.indexOf(previousStep) : -1,
      step: target,
      previousStep,
    };
    if (this.orbBeforeStepChange.emit(detail).defaultPrevented) return;

    items.forEach((item) => (item.active = item === target));
    this.sync();
    this.orbStepChange.emit(detail);
    const label = labelOf(target);
    announce(`Step ${index + 1} of ${items.length}${label ? `: ${label}` : ""}`);
  }

  /**
   * Keeps exactly one step active and passes each step its position, lock
   * state, and layout through data attributes.
   */
  private sync(activated?: HTMLOrbWizardItemElement) {
    const items = this.items;
    if (!items.length) return;

    let active = activated ?? items.find((item) => item.active);
    if (!active) active = items.find((item) => !item.disabled) ?? items[0];
    items.forEach((item) => {
      if (item.active !== (item === active)) item.active = item === active;
    });

    const fontSize = parseFloat(getComputedStyle(this.el).fontSize) || 16;
    const stacked =
      this.orientation === "vertical" ||
      (this.orientation === "auto" &&
        this.el.clientWidth < items.length * AUTO_STACK_EM_PER_STEP * fontSize);

    const firstIncomplete = this.firstIncomplete(items);
    const setFlag = (el: HTMLElement, name: string, on: boolean) =>
      el.toggleAttribute(`data-${name}`, on);

    items.forEach((item, i) => {
      if (item.dataset.index !== String(i)) item.dataset.index = String(i);
      setFlag(item, "locked", this.linear && i > firstIncomplete);
      setFlag(item, "clickable", this.clickable);
      setFlag(item, "stacked", stacked);
      const previous = items[i - 1];
      setFlag(item, "previous-completed", !!previous?.completed);
      const previousVariant = previous?.error ? "danger" : previous?.variant;
      if (previousVariant && previousVariant !== "primary") {
        item.dataset.previousVariant = previousVariant;
      } else {
        delete item.dataset.previousVariant;
      }
    });

    const enabled = items.filter((item) => !item.disabled);
    const allCompleted = enabled.length > 0 && enabled.every((item) => item.completed);
    const { states } = this.internals;
    const setState = (name: string, on: boolean) =>
      on ? states.add(name) : states.delete(name);
    setState("stacked", stacked);
    setState("completed", allCompleted);
    setState("loading", items.some((item) => item.loading));

    if (allCompleted && !this.allCompleted && this.loaded) this.orbFinish.emit();
    this.allCompleted = allCompleted;
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
