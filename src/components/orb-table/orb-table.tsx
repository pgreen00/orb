import { Component, Element, h, Host, Prop, Watch } from "@stencil/core";

//striped rows
//density/spacing of rows
//hover/click on rows
//selection
//sorting
//filtering
//pagination
//sticky columns
//details (less important)
//groupings (less important)
//trees (less important)
//loading state (less important)
//empty state (less important)

//ideas
//programmtic api can utilitze template elements and document fragments
//api should include event listenrs like cell clicked and row clicked
//a context menu slot would be neat

@Component({
  tag: "orb-table",
  styleUrl: "orb-table.css",
  shadow: true,
})
export class OrbTable {
  @Element() host: HTMLElement;
  @Prop() columns?: number;
  @Prop() data: string[][];

  @Watch("columns", { immediate: true })
  onColumnsChange() {
    const columns =
      this.columns ??
      this.host.querySelectorAll(":scope > orb-tr[type=header] > orb-tc")
        .length;
    this.host.style.setProperty("--columns", columns.toString());
  }

  @Watch("data", { immediate: true })
  onDataChange() {
    const template =
      this.host.querySelector<HTMLTemplateElement>(":scope > template");
    const fragment = new DocumentFragment();

    const header = this.host.querySelector(":scope > orb-tr[type=header]");
    if (header) fragment.append(header);

    for (const row of this.data) {
      const rowFragment = document.importNode(template.content, true);
      const cols = Array.from(rowFragment.querySelectorAll("orb-tc"));
      for (let i = 0; i < cols.length; i++) {
        cols[i].textContent = row[i];
      }
      fragment.append(rowFragment);
    }

    const footer = this.host.querySelector(":scope > orb-tr[type=footer]");
    if (footer) fragment.append(footer);

    this.host.replaceChildren(fragment);
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
