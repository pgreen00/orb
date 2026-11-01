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
import lightStyles from "./crumbs-light.css";

const stylesheet = new CSSStyleSheet();
stylesheet.replaceSync(lightStyles());
document.adoptedStyleSheets = [...document.adoptedStyleSheets, stylesheet];

type TrailItem =
  | { type: "crumb"; el: HTMLElement }
  | { type: "collapse"; crumbs: HTMLElement[] };

/**
 * A breadcrumb trail. Each child element is a crumb, usually an `<a>` for a
 * link or a `<button>` for apps that navigate with click handlers. The crumbs
 * stay in the page: the trail assigns each one to a slot in a list and adds
 * the separators between them, so your own elements, attributes, and listeners
 * work as written. The last crumb is the current page and gets
 * `aria-current="page"`.
 *
 * @slot - The crumbs, in order from the top of the hierarchy
 *
 * @part list - The ordered list of crumbs
 * @part item - Each list item
 * @part current - The list item for the current page
 * @part collapse - The button that shows collapsed crumbs
 * @part separator - The slash between crumbs
 */
@Component({
  tag: "orb-crumbs",
  styleUrl: "crumbs.css",
  shadow: {
    slotAssignment: "manual",
  },
})
export class Crumbs {
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
   * hidden crumb elements. Call `preventDefault()` to keep them collapsed, for
   * example to show them in your own menu.
   */
  @Event({ cancelable: true }) orbExpandClick: EventEmitter<HTMLElement[]>;

  @State() trail: TrailItem[] = [];
  @State() collapsed = true;

  private lastCrumbs: HTMLElement[] = [];
  private focusRevealedCrumb?: HTMLElement;

  /** Re-reads the crumbs when one is added or removed. */
  private observer = new MutationObserver(() => this.setCrumbs());

  componentWillLoad() {
    this.internals.role = "navigation";
    this.internals.ariaLabel = "Breadcrumbs";
  }

  connectedCallback() {
    // Document styles don't reach into shadow roots, such as an orb-view's
    // header, so the crumb styles are adopted there too.
    const root = this.host.getRootNode();
    if (root instanceof ShadowRoot && !root.adoptedStyleSheets.includes(stylesheet)) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, stylesheet];
    }
    this.observer.observe(this.host, { childList: true });
    this.setCrumbs();
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  componentDidRender() {
    // Crumbs are page elements, so they can be focused directly.
    this.focusRevealedCrumb?.focus();
    this.focusRevealedCrumb = undefined;
  }

  @Watch("maxItems")
  @Watch("itemsBeforeCollapse")
  @Watch("itemsAfterCollapse")
  handleCollapseChange() {
    this.collapsed = true;
    this.setCrumbs();
  }

  private setCrumbs() {
    const crumbs = Array.from(this.host.children) as HTMLElement[];

    // A different set of crumbs is a new trail, such as after navigating in a
    // single-page app, so it starts collapsed again.
    const changed =
      crumbs.length !== this.lastCrumbs.length ||
      crumbs.some((el, i) => el !== this.lastCrumbs[i]);
    if (changed) this.collapsed = true;
    this.lastCrumbs = crumbs;

    // The last crumb is the current page.
    crumbs.forEach((el, i) => {
      if (i === crumbs.length - 1) el.setAttribute("aria-current", "page");
      else if (el.getAttribute("aria-current") === "page") el.removeAttribute("aria-current");
    });

    const toCrumb = (el: HTMLElement) => ({ type: "crumb" as const, el });
    const before = Math.max(0, this.itemsBeforeCollapse);
    const after = Math.max(1, this.itemsAfterCollapse);
    const hiddenCount = crumbs.length - before - after;

    if (this.maxItems && crumbs.length > this.maxItems && hiddenCount > 0) {
      this.trail = [
        ...crumbs.slice(0, before).map(toCrumb),
        { type: "collapse", crumbs: crumbs.slice(before, before + hiddenCount) },
        ...crumbs.slice(before + hiddenCount).map(toCrumb),
      ];
    } else {
      this.trail = crumbs.map(toCrumb);
    }
  }

  private expand(e: MouseEvent, crumbs: HTMLElement[]) {
    const event = this.orbExpandClick.emit(crumbs);
    if (event.defaultPrevented) return;
    // Only moves focus when the button had it, so a mouse click in a browser
    // that doesn't focus buttons doesn't pull focus into the trail.
    if (this.host.shadowRoot.activeElement === e.currentTarget) this.focusRevealedCrumb = crumbs[0];
    this.collapsed = false;
  }

  private renderSeparator() {
    return <SlashIcon class="separator" part="separator" aria-hidden="true" />;
  }

  /**
   * A list item with a slot for one crumb. Crumbs that aren't assigned to a
   * slot, such as collapsed ones, aren't rendered.
   */
  private renderCrumb(el: HTMLElement, isLast: boolean) {
    return (
      <li part={isLast ? "item current" : "item"} class={{ current: isLast }}>
        <slot ref={(slot) => slot?.assign(el)} />
        {!isLast && this.renderSeparator()}
      </li>
    );
  }

  private renderCollapse(crumbs: HTMLElement[]) {
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
      if (item.type === "crumb") return this.renderCrumb(item.el, isLast);
      if (this.collapsed) return this.renderCollapse(item.crumbs);
      return item.crumbs.map((el) => this.renderCrumb(el, false));
    });

    return (
      <Host>
        <ol part="list">{items}</ol>
      </Host>
    );
  }
}
