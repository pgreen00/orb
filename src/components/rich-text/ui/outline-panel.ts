import { headingText, nestHeadings } from "../editing/outline";

/** The wait after the last update before the list is rebuilt, so typing doesn't rebuild it on every key */
const REBUILD_DELAY = 150;

export interface OutlinePanel {
  el: HTMLElement;
  update(headings: HTMLElement[]): void;
  setCurrent(heading: HTMLElement | null): void;
  destroy(): void;
}

/**
 * A list of the headings as nested buttons. The panel observes nothing itself:
 * the editor reports the current heading through setCurrent.
 */
export function createOutlinePanel({ onSelect }: { onSelect: (heading: HTMLElement) => void }): OutlinePanel {
  const el = document.createElement("nav");
  el.className = "outline";
  el.setAttribute("aria-label", "Outline");

  let headings: HTMLElement[] = [];
  let current: HTMLElement | null = null;
  let buttons = new Map<HTMLElement, HTMLButtonElement>();
  let timer: number | undefined;

  const highlight = () => {
    for (const [heading, button] of buttons) {
      if (heading === current) button.setAttribute("aria-current", "location");
      else button.removeAttribute("aria-current");
    }
  };

  const rebuild = () => {
    timer = undefined;
    buttons = new Map();
    el.replaceChildren(
      nestHeadings(headings, (heading) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = headingText(heading);
        button.addEventListener("click", () => {
          // A heading replaced since the last rebuild is no longer in the editor
          if (heading.isConnected) onSelect(heading);
        });
        buttons.set(heading, button);
        item.append(button);
        return item;
      }),
    );
    highlight();
  };

  return {
    el,
    update(next) {
      headings = next;
      clearTimeout(timer);
      timer = window.setTimeout(rebuild, REBUILD_DELAY);
    },
    setCurrent(heading) {
      current = heading;
      highlight();
    },
    destroy() {
      clearTimeout(timer);
      timer = undefined;
      el.replaceChildren();
    },
  };
}

/**
 * Reports the heading the reader is in: the last one whose top has reached the
 * top of the scroller, or null above the first. The observer watches a
 * zero-height line at the scroller's top edge, so it fires as a heading crosses
 * that edge, not after the heading has fully left. Returns a function that
 * stops observing. Re-observe after the headings change, since rebuilt
 * headings are new elements.
 */
export function observeHeadings(
  scroller: HTMLElement,
  headings: HTMLElement[],
  onCurrent: (heading: HTMLElement | null) => void,
): () => void {
  let last: HTMLElement | null | undefined;
  const report = () => {
    // clientTop skips the scroller's border, so the edge is the top of its padding box
    const edge = scroller.getBoundingClientRect().top + scroller.clientTop;
    let current: HTMLElement | null = null;
    for (let i = headings.length - 1; i >= 0; i--) {
      if (headings[i].getBoundingClientRect().top <= edge) {
        current = headings[i];
        break;
      }
    }
    if (current !== last) {
      last = current;
      onCurrent(current);
    }
  };
  const observer = new IntersectionObserver(report, { root: scroller, rootMargin: "0px 0px -100% 0px" });
  headings.forEach((heading) => observer.observe(heading));
  report();
  return () => observer.disconnect();
}
