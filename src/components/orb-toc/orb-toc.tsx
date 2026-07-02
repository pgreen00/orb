import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "je-toc",
  styleUrl: "je-toc.css",
  shadow: true,
})
export class JeToc {
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
              <je-link href={t.href}>{t.textContent}</je-link>
            </div>
          ))}
        </aside>
      </Host>
    );
  }
}
