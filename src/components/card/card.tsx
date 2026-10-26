import { Component, Element, Host, Prop, State } from "@stencil/core";


export type CardLayout =
  | "stacked"
  | "horizontal"
  | "overlay"
  | "compact"
  | "stat"
  | "feature"
  | "profile"
  | "pricing";

/**
 * A container for related content. The `layout` prop picks the structure, and
 * each layout has its own named slots. The default slot always lands in the
 * layout's main text area, so a card with only default content works in any
 * layout. Sections whose slots are empty aren't shown.
 *
 * @slot - Main content: the body in stacked, horizontal, overlay, feature, and pricing; the title in compact; the value in stat; the name in profile.
 * @slot media - Image or video. Used by stacked, horizontal, overlay, and compact (as a thumbnail or avatar).
 * @slot header - Title area. Used by stacked, horizontal, overlay, feature, and pricing (as the tier name).
 * @slot footer - Actions. Used by stacked, horizontal, overlay, feature, profile, and pricing (as the call to action).
 * @slot subtitle - Secondary line. Used by compact and profile (as the role).
 * @slot end - Trailing action. Used by compact.
 * @slot label - Metric name. Used by stat.
 * @slot trend - Change or delta, colored by the `trend` prop. Used by stat.
 * @slot sparkline - Small chart. Used by stat.
 * @slot icon - Icon. Used by feature.
 * @slot cover - Cover image behind the avatar. Used by profile.
 * @slot avatar - Avatar. Used by profile.
 * @slot price - Price. Used by pricing.
 * @slot badge - Label pinned to the top edge, such as "Most popular". Used by pricing.
 *
 * @part base - The layout wrapper.
 * @part media - The media container.
 * @part content - The text area next to or below the media.
 * @part header - The header container.
 * @part body - The default slot container in stacked, horizontal, overlay, feature, and pricing.
 * @part footer - The footer container.
 * @part scrim - The gradient over the media in overlay.
 * @part title - The default slot container in compact.
 * @part subtitle - The subtitle container.
 * @part end - The trailing action container in compact.
 * @part label - The label container in stat.
 * @part value - The default slot container in stat.
 * @part trend - The trend container in stat.
 * @part sparkline - The sparkline container in stat.
 * @part icon - The icon container in feature.
 * @part cover - The cover container in profile.
 * @part avatar - The avatar container in profile.
 * @part name - The default slot container in profile.
 * @part price - The price container in pricing.
 * @part badge - The badge container in pricing.
 */
@Component({
  tag: "orb-card",
  styleUrl: "card.css",
  shadow: {
    delegatesFocus: true,
  },
})
export class Card {
  @Element() el!: HTMLElement;

  /** Names of the slots that currently have content. The default slot is `""`. */
  @State() filled = new Set<string>();

  /**
   * The structure of the card. Each layout renders different named slots.
   */
  @Prop({ reflect: true }) layout: CardLayout = "stacked";


  /**
   * Which side the media sits on in the horizontal layout. The card falls
   * back to stacked when it's narrower than 30rem.
   */
  @Prop({ reflect: true }) mediaPlacement: "start" | "end" = "start";

  /**
   * Content alignment in the feature and profile layouts
   */
  @Prop() align: "start" | "center" = "center";

  /**
   * Colors the trend slot in the stat layout: green for `up`, red for `down`.
   */
  @Prop({ reflect: true }) trend?: "up" | "down" | "flat";

  /**
   * Emphasizes the card with an accent border. Intended for the pricing layout.
   */
  @Prop({ reflect: true }) highlighted = false;

  componentWillLoad() {
    this.filled = this.readFilledSlots();
  }

  private readFilledSlots() {
    const filled = new Set<string>();
    this.el.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        filled.add((node as Element).getAttribute("slot") || "");
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        filled.add("");
      }
    });
    return filled;
  }

  private onSlotChange = () => {
    const next = this.readFilledSlots();
    const changed =
      next.size !== this.filled.size ||
      [...next].some((name) => !this.filled.has(name));
    if (changed) this.filled = next;
  };

  private has(...names: string[]) {
    return names.some((name) => this.filled.has(name));
  }

  private slot(name?: string) {
    return <slot name={name} onSlotchange={this.onSlotChange} />;
  }

  /** A wrapper around one slot, hidden while the slot is empty. */
  private section(part: string, name?: string) {
    return (
      <div part={part} hidden={!this.has(name ?? "")}>
        {this.slot(name)}
      </div>
    );
  }

  private renderStacked() {
    return (
      <div part="base" class="stacked">
        {this.section("media", "media")}
        <div part="content" hidden={!this.has("header", "", "footer")}>
          {this.section("header", "header")}
          {this.section("body")}
          {this.section("footer", "footer")}
        </div>
      </div>
    );
  }

  private renderHorizontal() {
    return (
      <div
        part="base"
        class={{ horizontal: true, "has-media": this.has("media") }}
      >
        {/* The fill wrapper is absolutely positioned so the media never sets the card's height. */}
        <div part="media" hidden={!this.has("media")}>
          <div class="media-fill">{this.slot("media")}</div>
        </div>
        <div part="content" hidden={!this.has("header", "", "footer")}>
          {this.section("header", "header")}
          {this.section("body")}
          {this.section("footer", "footer")}
        </div>
      </div>
    );
  }

  private renderOverlay() {
    return (
      <div part="base" class="overlay">
        {this.section("media", "media")}
        <div part="scrim" hidden={!this.has("media")} />
        <div part="content">
          {this.section("header", "header")}
          {this.section("body")}
          {this.section("footer", "footer")}
        </div>
      </div>
    );
  }

  private renderCompact() {
    return (
      <div part="base" class="compact">
        {this.section("media", "media")}
        <div part="content">
          {this.section("title")}
          {this.section("subtitle", "subtitle")}
        </div>
        {this.section("end", "end")}
      </div>
    );
  }

  private renderStat() {
    return (
      <div part="base" class="stat">
        {this.section("label", "label")}
        <div class="value-row" hidden={!this.has("", "trend")}>
          {this.section("value")}
          {this.section("trend", "trend")}
        </div>
        {this.section("sparkline", "sparkline")}
      </div>
    );
  }

  private renderFeature() {
    return (
      <div
        part="base"
        class={{ feature: true, centered: this.align !== "start" }}
      >
        {this.section("icon", "icon")}
        {this.section("header", "header")}
        {this.section("body")}
        {this.section("footer", "footer")}
      </div>
    );
  }

  private renderProfile() {
    return (
      <div
        part="base"
        class={{
          profile: true,
          "has-cover": this.has("cover"),
          centered: this.align !== "start",
        }}
      >
        {this.section("cover", "cover")}
        <div part="content">
          {this.section("avatar", "avatar")}
          {this.section("name")}
          {this.section("subtitle", "subtitle")}
          {this.section("footer", "footer")}
        </div>
      </div>
    );
  }

  private renderPricing() {
    return (
      <div part="base" class="pricing">
        {this.section("badge", "badge")}
        {this.section("header", "header")}
        {this.section("price", "price")}
        {this.section("body")}
        {this.section("footer", "footer")}
      </div>
    );
  }

  private renderLayout() {
    switch (this.layout) {
      case "horizontal":
        return this.renderHorizontal();
      case "overlay":
        return this.renderOverlay();
      case "compact":
        return this.renderCompact();
      case "stat":
        return this.renderStat();
      case "feature":
        return this.renderFeature();
      case "profile":
        return this.renderProfile();
      case "pricing":
        return this.renderPricing();
      default:
        return this.renderStacked();
    }
  }

  render() {
    return <Host>{this.renderLayout()}</Host>;
  }
}
