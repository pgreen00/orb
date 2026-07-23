import { Component, Host } from "@stencil/core";

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
      <Host role="navigation" aria-label="Table of Contents">
        {links.map((t) => (
          <div>
            <orb-link href={t.href}>{t.textContent}</orb-link>
          </div>
        ))}
      </Host>
    );
  }
}
