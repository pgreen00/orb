import { AttachInternals, Component, Element, forceUpdate, Host, Method } from "@stencil/core";
import styles from "./toc.css";

const stylesheet = new CSSStyleSheet();
stylesheet.replaceSync(styles());
document.adoptedStyleSheets = [...document.adoptedStyleSheets, stylesheet];

@Component({
  tag: "orb-toc"
})
export class Toc {
  @Element() el: HTMLElement
  @AttachInternals() internals: ElementInternals

  componentWillLoad() {
    this.internals.role = "navigation"
    this.internals.ariaLabel = "Table of Contents"
  }

  @Method()
  async update() {
    forceUpdate(this.el)
  }

  render() {
    const root = this.el.getRootNode() as HTMLDocument | DocumentFragment | HTMLElement
    const links = Array.from(
      root.querySelectorAll<HTMLAnchorElement>("a[data-toc]"),
    );
    // Depth follows the heading hierarchy, not the raw level, so a skipped
    // level (h2 -> h4) or a first heading deeper than h2 doesn't over-indent.
    const stack: number[] = [];
    const items = links.map((link) => {
      const heading = link.closest("h1, h2, h3, h4, h5, h6");
      const level = heading ? Number(heading.tagName[1]) : 1;
      while (stack.length && stack[stack.length - 1] >= level) stack.pop();
      const depth = stack.length;
      stack.push(level);
      return { link, depth };
    });
    return (
      <Host>
        {items.map(({ link, depth }) => (
          <div style={{ "--orb-toc-depth": String(depth) }}>
            <a data-orb="quiet" href={link.href}>
              {link.textContent}
            </a>
          </div>
        ))}
      </Host>
    );
  }
}
