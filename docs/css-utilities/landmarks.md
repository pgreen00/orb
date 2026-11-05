---
title: Landmarks
section: css-utilities
layout: css-utilities.njk
description: Put a header, a sidebar, a main area, and a footer in the body, and Orb lays out the page and keeps the header and footer in place.
---

## Page Structure

Orb styles the body as a grid of page regions. Give the page's elements the matching tags, and they're placed for you. A header sticks to the top, a footer sticks to the bottom, and a sidebar sticks beside the main content and scrolls on its own.

Use real landmark elements where they fit, so screen readers can list the regions. The `data-landmark` attribute is for regions with no matching element.

```html
<body>
  <header>...</header>
  <div data-landmark="subheader">...</div>
  <nav data-landmark="sidebar" aria-label="Section navigation">...</nav>
  <main>...</main>
  <footer>...</footer>
</body>
```

## Landmarks

| Element | Placement | Notes |
| --- | --- | --- |
| `<header>` | Top of the page, sticky | 64px tall, with a bottom border. Sits above the subheader |
| `data-landmark="subheader"` | Below the header, sticky | 64px tall. Use it for a second bar, such as tabs or a breadcrumb |
| `data-landmark="sidebar"` | Left of the main content, sticky | Scrolls on its own, with a right border. Hidden below 768px |
| `<main>` | Fills the rest of the page | Holds the page's content |
| `<footer>` | Bottom of the page, sticky | 48px tall, with a top border |

The sidebar is shown from 768px wide. Below that, it's hidden, so put anything the small-screen reader needs in the main content too.

## Sizes and Colors

The header and subheader are 64px tall, and the footer is 48px. Those heights are fixed. These properties can be changed:

| Property | Default | Controls |
| --- | --- | --- |
| `--sidebar-width` | `clamp(215px, 22vw, 305px)` | Width of the sidebar |
| `--border-color` | `--orb-divider-color` | The lines around the header, sidebar, and footer |

Set them on `body`, or on the sidebar for `--sidebar-width`. The layout also sets height values such as `--head-height` from the regions on the page, so don't set those yourself.

```css
body {
  --sidebar-width: 18rem;
}
```

## Scrolling Views in a Page

An [`orb-view`](../../components/view/) with `scrollable="false"` lays out a whole page, and the page scrolls. Its header and footer then stick below and above the landmarks' header and footer. Use this for a page with a long, scrolling view, and keep the default `scrollable` for overlays.

**Manual test:**
- Scroll the page. The header stays at the top, and the content scrolls under it without showing through.
- The footer, if the page has one, stays at the bottom.
- Scroll a long sidebar. It scrolls on its own, and the page doesn't move.
- Resize the window below 768px. The sidebar disappears, and the main content takes the full width.
- This site uses these landmarks. Its header, section sidebar, and page content are all placed this way.

## Accessibility

**Manual test checklist:**

- [ ] The regions use the right elements, such as `<header>`, `<nav>`, `<main>`, and `<footer>`, so screen readers can jump between them.
- [ ] A sidebar that's hidden below 768px doesn't hold content that's only in the sidebar. Keep it in the main content too.
- [ ] A sticky header or footer doesn't cover focused content. Tab to an item near the edge, and check it scrolls into view above the bar.
- [ ] The page has one `<main>`.
