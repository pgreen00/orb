import {
  Component,
  Element,
  Event,
  EventEmitter,
  Fragment,
  Host,
  Prop,
  State,
} from "@stencil/core";
import { EllipsisHorizIcon, SlashIcon } from "../../utils/icons";

@Component({
  tag: "orb-breadcrumbs",
  styleUrl: "breadcrumbs.css",
  shadow: true,
})
export class Breadcrumbs {
  @Element() host: HTMLElement;
  @Prop() itemsBeforeCollapse = 1;
  @Prop() itemsAfterCollapse = 1;
  @Prop() maxItems?: number;
  @Event() expandClick: EventEmitter;
  @State() crumbs: (
    | { href?: string; text: string; type: "crumb" }
    | { type: "collapse"; crumbs: { href?: string; text: string }[] }
  )[] = [];
  @State() collapsed = true;

  private setCrumbs = () => {
    const children = Array.from(this.host.querySelectorAll("orb-breadcrumb"));
    if (this.maxItems && children.length > this.maxItems) {
      this.crumbs = [
        ...children
          .filter((_, index) => index < this.itemsBeforeCollapse)
          .map((c) => ({
            href: c.href,
            text: c.textContent,
            type: "crumb" as const,
          })),
        {
          type: "collapse",
          crumbs: children
            .filter(
              (_, index) =>
                index >= this.itemsBeforeCollapse &&
                index < children.length - this.itemsAfterCollapse,
            )
            .map((c) => ({ href: c.href, text: c.textContent })),
        },
        ...children
          .filter(
            (_, index) => index >= children.length - this.itemsAfterCollapse,
          )
          .map((c) => ({
            href: c.href,
            text: c.textContent,
            type: "crumb" as const,
          })),
      ];
    } else {
      this.crumbs = children.map((c) => ({
        href: c.href,
        text: c.textContent,
        type: "crumb",
      }));
    }
  };

  render() {
    return (
      <Host role="navigation">
        <slot onSlotchange={this.setCrumbs} />
        {this.crumbs.map((c, i) => {
          const isLast = i == this.crumbs.length - 1;
          if (c.type == "crumb") {
            return (
              <Fragment>
                {c.href ? (
                  <a
                    aria-current={isLast ? "page" : null}
                    class={{ crumb: true, last: isLast }}
                    href={c.href}
                  >
                    {c.text}
                  </a>
                ) : (
                  <button class={{ crumb: true, last: isLast }} type="button">
                    {c.text}
                  </button>
                )}
                {!isLast && <SlashIcon />}
              </Fragment>
            );
          } else {
            if (this.collapsed) {
              return (
                <Fragment>
                  <button
                    type="button"
                    class="collapse"
                    onClick={() => (this.collapsed = false)}
                  >
                    <EllipsisHorizIcon />
                  </button>
                  <SlashIcon />
                </Fragment>
              );
            } else {
              return c.crumbs.map((t) => (
                <Fragment>
                  {t.href ? (
                    <a class="crumb" href={t.href}>
                      {t.text}
                    </a>
                  ) : (
                    <button class="crumb" type="button">
                      {t.text}
                    </button>
                  )}
                  <SlashIcon />
                </Fragment>
              ));
            }
          }
        })}
      </Host>
    );
  }
}
