import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-toc",
  styleUrl: "toc.css",
  shadow: true,
})
export class Toc {
  render() {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("a[data-toc]"),
    );
    return (
      <Host role="navigation" aria-label="Table of Contents">
        {links.map((t) => (
          <div>
            <orb-link accent={true} href={t.href}>
              {t.textContent}
            </orb-link>
          </div>
        ))}
      </Host>
    );
  }
}
