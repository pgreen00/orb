import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-toc",
  styleUrl: "orb-toc.css",
  shadow: true,
})
export class OrbToc {
  render() {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("a[data-toc]"),
    );
    return (
      <Host>
        <div part="main-content">
          <slot />
        </div>
        <aside
          role="navigation"
          part="toc-content"
          aria-label="Table of Contents"
        >
          {links.map((t) => (
            <div>
              <orb-link href={t.href}>{t.textContent}</orb-link>
            </div>
          ))}
        </aside>
      </Host>
    );
  }
}
