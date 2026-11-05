---
title: "OrbFloatingButton | <orb-floating-button>"
sidebar_label: "Floating Button"
---

## Usage

Put an `orb-button` inside `orb-floating-button`, with an `aria-label` if the button has no text. The wrapper handles the position, the shadow, and showing and hiding. The button is still a normal button, so its size, color, and click handler work as usual.

### Placement

Set `placement` to one of six positions: `bottom-end` (the default), `bottom-start`, `bottom`, `top-end`, `top-start`, or `top`. The `-start` and `-end` placements follow the text direction. Change `--floating-offset` to move the button away from the edges.

::: live-code-demo

```html
<div style="position: relative; height: 8rem; transform: translateZ(0);">
  <orb-floating-button open>
    <orb-button color="primary" class="icon-only" aria-label="Add">
      <iconify-icon icon="mdi:plus" aria-hidden="true"></iconify-icon>
    </orb-button>
  </orb-floating-button>
</div>
<div style="position: relative; height: 8rem; transform: translateZ(0); margin-top: 1rem;">
  <orb-floating-button open placement="top-start">
    <orb-button fill="outline" aria-label="Edit">
      <iconify-icon icon="mdi:pencil" aria-hidden="true"></iconify-icon>
      Edit
    </orb-button>
  </orb-floating-button>
</div>
```

:::

A fixed button is placed against the viewport. The `transform` on the demo boxes makes each one the containing block, so the buttons stay inside their examples.

### Showing After Scrolling

Set `scroll-threshold` to a number of pixels. The button opens once the window is scrolled past that point, and closes when the page is scrolled back above it. This site uses it for its back-to-top button, so scroll down this page to see it.

```html
<orb-floating-button scroll-threshold="400">
  <orb-button class="icon-only" color="primary" id="back-to-top" aria-label="Back to top">
    <iconify-icon icon="mdi:arrow-up" aria-hidden="true"></iconify-icon>
  </orb-button>
</orb-floating-button>
<script>
  document.querySelector("#back-to-top").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
</script>
```

Without `scroll-threshold`, the button shows whenever `open` is set. Listen for `orbOpenChange` to follow the state, for example to move focus when the button closes.

**Manual test:**
- Scroll down this page. The site's back-to-top button fades in past about 400px, and fades out again when you scroll back to the top.
- Activate the back-to-top button. The page scrolls to the top, and focus moves to the page heading.
- In the demos above, the buttons stay in their boxes and don't cover the page.
- With reduced motion on, the button appears and disappears without the fade or slide.

**Accessibility checklist:**
- [ ] The button has an accessible name, from `aria-label` or visible text.
- [ ] A hidden button can't be reached by Tab and is hidden from screen readers.
- [ ] The button doesn't cover the page's main content at the default placement and offset.
- [ ] Motion is turned off with `prefers-reduced-motion`.
