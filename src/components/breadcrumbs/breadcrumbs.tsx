import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import { EllipsisHorizIcon, SlashIcon } from "../../utils/icons";

interface CrumbData {
  el: HTMLOrbBreadcrumbElement;
  href?: string;
}

type TrailItem =
  | (CrumbData & { type: "crumb" })
  | { type: "collapse"; crumbs: CrumbData[] };

/**
 * A breadcrumb trail built from `<orb-breadcrumb>` children. Crumbs with an
 * `href` render as links, and crumbs without one render as buttons for apps
 * that navigate with click handlers. Each crumb's content is slotted into its
 * link or button, so icons and other markup render as written, and clicks
 * reach the `<orb-breadcrumb>`.
 *
 * @part list - The ordered list of crumbs
 * @part item - Each list item
 * @part crumb - Each crumb link or button
 * @part current - The crumb for the current page
 * @part collapse - The button that shows collapsed crumbs
 * @part separator - The slash between crumbs
 */
@Component({
  tag: "orb-breadcrumbs",
  styleUrl: "breadcrumbs.css",
  shadow: {
    slotAssignment: "manual",
  },
})
export class Breadcrumbs {
  @AttachInternals() internals: ElementInternals;
  @Element() host: HTMLElement;

  /**
   * Crumbs kept visible before the collapsed ones
   */
  @Prop() itemsBeforeCollapse = 1;

  /**
   * Crumbs kept visible after the collapsed ones. At least 1, so the current
   * page is always shown.
   */
  @Prop() itemsAfterCollapse = 1;

  /**
   * Collapses the middle crumbs when there are more than this many
   */
  @Prop() maxItems?: number;

  /**
   * Emitted when the collapsed-crumbs button is activated. The detail is the
   * hidden `<orb-breadcrumb>` elements. Call `preventDefault()` to keep them
   * collapsed, for example to show them in your own menu.
   */
  @Event({ cancelable: true }) expandClick: EventEmitter<HTMLOrbBreadcrumbElement[]>;

  @State() trail: TrailItem[] = [];
  @State() collapsed = true;

  private lastChildren: HTMLOrbBreadcrumbElement[] = [];
  private focusRevealedCrumb = false;

  /**
   * Re-reads the crumbs when one is added, removed, or gets a new `href`. Text
   * and markup changes inside a crumb render on their own through its slot.
   */
  private observer = new MutationObserver(() => this.setCrumbs());

  componentWillLoad() {
    this.internals.role = "navigation";
    this.internals.ariaLabel = "Breadcrumbs";
  }

  connectedCallback() {
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    this.setCrumbs();
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  componentDidRender() {
    if (!this.focusRevealedCrumb) return;
    this.focusRevealedCrumb = false;
    this.host.shadowRoot
      .querySelector<HTMLElement>(".revealed .crumb")
      ?.focus();
  }

  @Watch("maxItems")
  @Watch("itemsBeforeCollapse")
  @Watch("itemsAfterCollapse")
  handleCollapseChange() {
    this.collapsed = true;
    this.setCrumbs();
  }

  private setCrumbs = async () => {
    await customElements.whenDefined("orb-breadcrumb");
    const children = Array.from(
      this.host.querySelectorAll<HTMLOrbBreadcrumbElement>(
        ":scope > orb-breadcrumb",
      ),
    );

    // A different set of crumbs is a new trail, such as after navigating in a
    // single-page app, so it starts collapsed again.
    const changed =
      children.length !== this.lastChildren.length ||
      children.some((el, i) => el !== this.lastChildren[i]);
    if (changed) this.collapsed = true;
    this.lastChildren = children;

    const toData = (el: HTMLOrbBreadcrumbElement): CrumbData => ({
      el,
      href: el.href,
    });
    const toCrumb = (el: HTMLOrbBreadcrumbElement) => ({
      ...toData(el),
      type: "crumb" as const,
    });

    const before = Math.max(0, this.itemsBeforeCollapse);
    const after = Math.max(1, this.itemsAfterCollapse);
    const hiddenCount = children.length - before - after;

    if (this.maxItems && children.length > this.maxItems && hiddenCount > 0) {
      this.trail = [
        ...children.slice(0, before).map(toCrumb),
        { type: "collapse", crumbs: children.slice(before, before + hiddenCount).map(toData) },
        ...children.slice(before + hiddenCount).map(toCrumb),
      ];
    } else {
      this.trail = children.map(toCrumb);
    }
  };

  private expand(e: MouseEvent, crumbs: CrumbData[]) {
    const event = this.expandClick.emit(crumbs.map((c) => c.el));
    if (event.defaultPrevented) return;
    // Only move focus when the button had it, so a mouse click in a browser
    // that doesn't focus buttons doesn't pull focus into the trail.
    this.focusRevealedCrumb =
      this.host.shadowRoot.activeElement === e.currentTarget;
    this.collapsed = false;
  }

  /**
   * Clicks on a crumb's content already pass through its `<orb-breadcrumb>`.
   * Other clicks, such as Enter on a focused link, are re-dispatched on it, so
   * listeners on the crumb always hear about activation. The forwarded event is
   * cancelable: `preventDefault()` also cancels the original, which stops a
   * link from navigating so a client-side router can take over.
   */
  private forwardClick(e: MouseEvent, source: HTMLElement) {
    if (e.composedPath().includes(source)) return;
    // The forwarded event replaces this one, so listeners don't see two clicks.
    e.stopPropagation();
    const forwarded = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: e.button,
      buttons: e.buttons,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      detail: e.detail,
    });
    if (!source.dispatchEvent(forwarded)) e.preventDefault();
  }

  private renderCrumb(crumb: CrumbData, isLast: boolean) {
    const props = {
      class: { crumb: true, last: isLast },
      part: isLast ? "crumb current" : "crumb",
      "aria-current": isLast ? "page" : undefined,
      onClick: (e: MouseEvent) => this.forwardClick(e, crumb.el),
    };
    const content = <slot ref={(slot) => slot?.assign(crumb.el)} />;
    return crumb.href ? (
      <a {...props} href={crumb.href}>
        {content}
      </a>
    ) : (
      <button {...props} type="button">
        {content}
      </button>
    );
  }

  private renderSeparator() {
    return <SlashIcon class="separator" part="separator" aria-hidden="true" />;
  }

  private renderCollapse(crumbs: CrumbData[]) {
    const count = crumbs.length;
    return (
      <li part="item" key="collapse">
        <button
          type="button"
          class="collapse"
          part="collapse"
          aria-label={`Show ${count} more ${count === 1 ? "breadcrumb" : "breadcrumbs"}`}
          onClick={(e) => this.expand(e, crumbs)}
        >
          <EllipsisHorizIcon aria-hidden="true" />
        </button>
        {this.renderSeparator()}
      </li>
    );
  }

  render() {
    const items = this.trail.flatMap((item, i) => {
      const isLast = i === this.trail.length - 1;
      if (item.type === "crumb") {
        return (
          <li part="item">
            {this.renderCrumb(item, isLast)}
            {!isLast && this.renderSeparator()}
          </li>
        );
      }
      if (this.collapsed) return this.renderCollapse(item.crumbs);
      return item.crumbs.map((crumb, j) => (
        <li part="item" class={{ revealed: j === 0 }}>
          {this.renderCrumb(crumb, false)}
          {this.renderSeparator()}
        </li>
      ));
    });

    return (
      <Host>
        <ol part="list">{items}</ol>
      </Host>
    );
  }
}
