import { Component, Element, Listen } from "@stencil/core";
import { OrbDetailsCustomEvent } from "../../components";

/**
 * Accordions are wrappers for <orb-link href="../orb-details">OrbDetails</orb-link>. When an inner detail is opened, the others are automatically closed.
 * The implementation follows the [aria implementation of an accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
 */
@Component({
  tag: "orb-accordion",
  styleUrl: "orb-accordion.css",
  shadow: true,
})
export class OrbAccordion {
  @Element() el: HTMLOrbAccordionElement;

  @Listen("expand")
  onExpand({ target }: OrbDetailsCustomEvent<void>) {
    this.el
      .querySelectorAll("orb-details")
      .forEach((section) => (section.open = section === target));
  }

  @Listen("keydown")
  onKeydown(ev: KeyboardEvent) {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      const sections = Array.from(this.el.querySelectorAll("orb-details"));
      const index = sections.indexOf(ev.target as HTMLOrbDetailsElement);
      const nextIndex = ev.key === "ArrowDown" ? index + 1 : index - 1;
      if (nextIndex >= 0 && nextIndex < sections.length) {
        sections[nextIndex].focus();
      }
    }
    if (ev.key === "Home") {
      ev.preventDefault();
      const sections = Array.from(this.el.querySelectorAll("orb-details"));
      sections[0].focus();
    }
    if (ev.key === "End") {
      ev.preventDefault();
      const sections = Array.from(this.el.querySelectorAll("orb-details"));
      sections[sections.length - 1].focus();
    }
  }

  render() {
    return <slot />;
  }
}
