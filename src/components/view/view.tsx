import { Component, Element, Host, Prop, State } from "@stencil/core";
import { CloseIcon, EllipsisIcon } from "../../utils/icons";

/**
 * A layout for a page's worth of content, with a header, a body, and a footer
 * for actions. By default the view scrolls its own content, which suits
 * overlays. Turn off `scrollable` when the view lays out a whole page and the
 * page itself scrolls. Either way, the header and footer stay in place.
 *
 * @slot - The main content
 * @slot label - Replaces the `label` heading
 * @slot header-start - Content before the label, such as a back button
 * @slot header-end - Content at the end of the header, before the actions menu and close button
 * @slot details - Content under the label, such as a description, status, or tabs
 * @slot wizard - An `orb-wizard`, shown at the top of the content. `orb-view-manager` places its wizard here on views with `show-wizard`.
 * @slot actions - `orb-mi` menu items, shown in a menu at the end of the header
 * @slot footer - Buttons, shown in a footer at the bottom of the view
 *
 * @part header - The header
 * @part label - The `label` heading
 * @part details - The wrapper around the `details` slot
 * @part breadcrumbs - The breadcrumbs shown inside an `orb-view-manager`
 * @part main-content - The scrolling content area
 * @part footer - The footer
 */
@Component({
  tag: "orb-view",
  styleUrl: "view.css",
  shadow: true,
})
export class View {
  @Element() el: HTMLElement;
  private headerEl?: HTMLElement;
  private mainEl?: HTMLElement;
  private footerEl?: HTMLElement;
  private frame = 0;
  private resizeObserver = new ResizeObserver(() => this.scheduleFade());

  /**
   * The heading shown in the header
   */
  @Prop() label?: string;

  /**
   * Shows a close button in the header that closes the parent `orb-overlay`
   */
  @Prop() closable = false;

  /**
   * `minimal` is a compact header that stays in place while the content
   * scrolls. `prominent` is a large header that scrolls away with the content.
   * `none` hides the header.
   */
  @Prop({ reflect: true }) header: "none" | "minimal" | "prominent" = "minimal";

  /**
   * The heading level of the `label`
   */
  @Prop() headingLevel: "1" | "2" | "3" | "4" | "5" | "6" = "1";

  /**
   * Fades content out as it scrolls under the header and footer
   */
  @Prop({ reflect: true }) fade = false;

  /**
   * Makes the view its own scroll container, filling its parent's height. Use
   * this in overlays. Set it to `false` when the view lays out a whole page and
   * the page scrolls instead. The header and footer then stick below and above
   * the landmarks layout's page header and footer.
   */
  @Prop() scrollable = true;

  /**
   * Shows the view manager's wizard in this view's header. Only applies
   * inside an `orb-view-manager`.
   */
  @Prop() showWizard = false;

  /**
   * Runs before the view is shown. Only applies inside an `orb-view-manager`.
   */
  @Prop() init?: () => Promise<void> | void;

  /**
   * Runs after the view is hidden. Only applies inside an `orb-view-manager`.
   */
  @Prop() destroy?: () => Promise<void> | void;

  /**
   * Breadcrumbs from the parent `orb-view-manager`. Don't set directly.
   * @internal
   */
  @Prop() crumbs: { id: string; label: string }[] = [];

  @State() hasActions = false;
  @State() hasDetails = false;
  @State() hasWizard = false;
  @State() hasFooter = false;

  connectedCallback() {
    // Captured on the document, so it hears both the view's own scrolling and
    // the page's or an ancestor's when the view isn't scrollable.
    document.addEventListener("scroll", this.scheduleFade, { capture: true, passive: true });
    window.addEventListener("resize", this.scheduleFade, { passive: true });
  }

  componentDidLoad() {
    this.resizeObserver.observe(this.el);
    if (this.mainEl) this.resizeObserver.observe(this.mainEl);
    this.updateFade();
  }

  componentDidRender() {
    this.scheduleFade();
  }

  disconnectedCallback() {
    document.removeEventListener("scroll", this.scheduleFade, { capture: true });
    window.removeEventListener("resize", this.scheduleFade);
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.frame);
  }

  private hasContent = (ev: Event) =>
    (ev.target as HTMLSlotElement).assignedElements().length > 0;

  private scheduleFade = () => {
    if (!this.fade) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.updateFade());
  };

  /**
   * Positions the fade at the edges of the visible content, in
   * `main-content`'s own coordinates. The visible area is bounded by the sticky
   * header and footer, or by the view (when scrollable) or the window. Each
   * edge fades by up to `--fade-size`, scaled down by how much content is
   * actually hidden past it, so there's no fade at the very top or bottom.
   */
  private updateFade() {
    const main = this.mainEl;
    if (!this.fade || !main) return;

    const host = this.el;
    const mainStyle = getComputedStyle(main);
    const fadeSize = parseFloat(mainStyle.getPropertyValue("--fade-size")) || 32;
    const mainRect = main.getBoundingClientRect();
    // Without `scrollable`, the page scrolls, and the visible area sits
    // between the page's sticky header and footer.
    const bounds = this.scrollable
      ? host.getBoundingClientRect()
      : {
          top: parseFloat(mainStyle.scrollMarginTop) || 0,
          bottom: window.innerHeight - (parseFloat(mainStyle.scrollMarginBottom) || 0),
        };
    const isSticky = (el?: HTMLElement) =>
      !!el && !el.hidden && getComputedStyle(el).position === "sticky";

    const top = isSticky(this.headerEl)
      ? Math.max(bounds.top, this.headerEl.getBoundingClientRect().bottom)
      : bounds.top;
    const bottom = isSticky(this.footerEl)
      ? Math.min(bounds.bottom, this.footerEl.getBoundingClientRect().top)
      : bounds.bottom;

    const visibleTop = top - mainRect.top;
    const visibleBottom = bottom - mainRect.top;
    const topAmount = Math.min(Math.max(visibleTop, 0), fadeSize);
    const bottomAmount = Math.min(Math.max(mainRect.height - visibleBottom, 0), fadeSize);

    const set = (name: string, px: number) => host.style.setProperty(name, `${px}px`);
    set("--fade-start-edge", visibleTop);
    set("--fade-start", visibleTop + topAmount);
    set("--fade-end", visibleBottom - bottomAmount);
    set("--fade-end-edge", visibleBottom);
  }

  private renderHeader() {
    return (
      <header part="header" class={this.header} ref={(el) => (this.headerEl = el)}>
        {this.crumbs.length > 1 && (
          <orb-breadcrumbs part="breadcrumbs" class="crumbs" maxItems={3}>
            {this.crumbs.map((crumb) => (
              <orb-breadcrumb
                key={crumb.id}
                data-view-link={crumb.id}
                data-view-dir="backwards"
                data-view-crumbs
              >
                {crumb.label}
              </orb-breadcrumb>
            ))}
          </orb-breadcrumbs>
        )}
        <orb-toolbar>
          <slot name="header-start" />
          <slot name="label">
            {this.label && (
              // tabindex lets orb-view-manager move focus here after navigating.
              <span part="label" role="heading" aria-level={this.headingLevel} tabindex={-1}>
                {this.label}
              </span>
            )}
          </slot>
          <div class="end" slot="end">
            <slot name="header-end" />
            <orb-popover class={{ hide: !this.hasActions }}>
              <orb-button
                slot="trigger"
                class="icon-only"
                fill="clear"
                aria-label="More actions"
              >
                <EllipsisIcon aria-hidden="true" />
              </orb-button>
              <orb-menu label="More actions">
                <slot
                  name="actions"
                  onSlotchange={(e) => (this.hasActions = this.hasContent(e))}
                />
              </orb-menu>
            </orb-popover>
            {this.closable && (
              <orb-button
                class="icon-only"
                fill="clear"
                aria-label="Close"
                data-overlay="hide"
              >
                <CloseIcon aria-hidden="true" />
              </orb-button>
            )}
          </div>
        </orb-toolbar>
        <div part="details" class="details" hidden={!this.hasDetails}>
          <slot
            name="details"
            onSlotchange={(e) => (this.hasDetails = this.hasContent(e))}
          />
        </div>
      </header>
    );
  }

  render() {
    // A class rather than a reflected attribute, because an authored
    // `scrollable="false"` attribute stays on the element and would still match
    // `[scrollable]`.
    return (
      <Host class={{ scrollable: this.scrollable }}>
        {this.header !== "none" && this.renderHeader()}
        <div part="main-content" ref={(el) => (this.mainEl = el)}>
          <div class="wizard" hidden={!this.hasWizard}>
            <slot
              name="wizard"
              onSlotchange={(e) => (this.hasWizard = this.hasContent(e))}
            />
          </div>
          <slot />
        </div>
        <footer part="footer" hidden={!this.hasFooter} ref={(el) => (this.footerEl = el)}>
          <slot
            name="footer"
            onSlotchange={(e) => (this.hasFooter = this.hasContent(e))}
          />
        </footer>
      </Host>
    );
  }
}
