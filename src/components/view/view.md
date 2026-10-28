---
title: 'OrbView | <orb-view>'
sidebar_label: 'View'
---

## Usage

A view lays out a page's worth of content: a header with a label, a body, and a footer for actions. By default it scrolls its own content, which suits overlays, so give it a height. The header and footer stay in place.

::: live-code-demo

```html
<div style="height: 22rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view label="Edit profile" heading-level="2">
    <p>Scroll this content. The header and footer stay in place.</p>
    <p style="height: 30rem;">A tall paragraph to make the view scroll.</p>
    <p>The end of the content.</p>
    <orb-button slot="footer" fill="outline">Cancel</orb-button>
    <orb-button slot="footer" color="primary">Save</orb-button>
  </orb-view>
</div>
```

:::

**Manual test:**
- Scroll inside the box. Only the content scrolls, and the header and footer stay pinned.
- The page itself doesn't scroll while you scroll the view's content, even at the ends.

### Page Scrolling

Set `scrollable` to `false` when the view lays out a whole page and the page, `body`, or `main` scrolls instead. The view grows to fit its content, and the header and footer stick to the edges of whatever scrolls. In the landmarks layout, they stick just below the page header and above the page footer, using `--top-height` and `--foot-height`. Set `--sticky-top` and `--sticky-bottom` on the view to change the offsets.

This demo puts the view inside a scrolling box, standing in for the page. The box isn't the page, so the demo sets both offsets to `0`.

::: live-code-demo

```html
<div style="height: 22rem; overflow: auto; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md);">
  <p style="padding: 1rem;">Content above the view scrolls normally.</p>
  <orb-view label="Settings" heading-level="2" scrollable="false" fade style="--sticky-top: 0px; --sticky-bottom: 0px;">
    <p style="height: 30rem;">The surrounding box scrolls, not the view. The header sticks to the top of the box once you reach it, and the footer sticks to the bottom.</p>
    <orb-button slot="footer" color="primary">Save</orb-button>
  </orb-view>
  <p style="padding: 1rem;">Content after the view.</p>
</div>
```

:::

**Manual test:**
- The view has no scrollbar of its own. The box scrolls.
- Scroll down. The header sticks to the top of the box and the footer to its bottom.
- The content fades under the header and footer, and the fade stays lined up while the box scrolls.
- After scrolling past the view, its header and footer scroll away with it.

### In an Overlay

Views are usually the content of an `orb-overlay`. Add `closable` for a close button that closes the overlay.

::: live-code-demo

```html
<orb-button id="view-overlay-trigger">Open view</orb-button>
<orb-overlay trigger="view-overlay-trigger" side="left">
  <orb-view label="New project" heading-level="2" closable>
    <orb-textbox label="Name"><input /></orb-textbox>
    <p style="height: 40rem;">More fields would go here.</p>
    <orb-button slot="footer" fill="outline" data-overlay="hide">Cancel</orb-button>
    <orb-button slot="footer" color="primary" data-overlay="hide role--save">Create</orb-button>
  </orb-view>
</orb-overlay>
```

:::

**Manual test:**
- The close button in the header closes the overlay. It's named "Close".
- Cancel and Create close it too, through `data-overlay="hide"`.
- The header and footer use the overlay's background, not the page's.

### Header Styles

Set `header` to `minimal` (the default), `prominent`, or `none`. A `minimal` header is compact and stays in place. A `prominent` header is large and airy, for a page's main title, and scrolls away with the content so it doesn't take up space once the reader is past it.

Use the `details` slot for content under the label, such as a description, status, or tabs.

::: live-code-demo

```html
<div style="height: 32rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view label="Button" header="prominent">
    <div slot="details">
      <orb-pill color="primary">Stable</orb-pill>
      <small style="margin-inline-start: 0.5rem;">Last updated Oct 15, 2026</small>
      <p style="margin-top: 1.5rem;">Buttons start an action. Their labels say what will happen when the user interacts with them.</p>
    </div>
    <orb-button slot="header-end" fill="outline" size="sm">GitHub</orb-button>
    <h3>Live demo</h3>
    <p style="height: 40rem;">Scroll down. The header scrolls away with the content.</p>
  </orb-view>
</div>
```

:::

::: live-code-demo

```html
<div style="height: 14rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view header="none">
    <p>A view without a header. The footer is still there.</p>
    <orb-button slot="footer">Done</orb-button>
  </orb-view>
</div>
```

:::

**Manual test:**
- The prominent title is large, with roomy padding, and the details sit under it at a readable width.
- Scrolling moves the prominent header out of view. A minimal header stays pinned.
- Narrow the window. The prominent title shrinks with the view's width.
- With `header="none"`, no header is rendered.

### Header Slots

`header-start` goes before the label, and `header-end` goes before the actions menu and close button. Use the `label` slot instead of the `label` attribute for a custom heading.

::: live-code-demo

```html
<div style="height: 12rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view closable>
    <orb-button slot="header-start" class="icon-only" fill="clear" aria-label="Back">
      <iconify-icon icon="mdi:arrow-left" aria-hidden="true"></iconify-icon>
    </orb-button>
    <h2 slot="label" style="margin: 0;">Custom <em>heading</em></h2>
    <orb-button slot="header-end" size="sm" fill="outline">Share</orb-button>
    <p>Content</p>
  </orb-view>
</div>
```

:::

### Actions Menu

Put `orb-mi` items in the `actions` slot to show them in a menu at the end of the header. The menu button only appears when there are actions, and choosing one closes the menu.

::: live-code-demo

```html
<div style="height: 12rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view id="actions-view" label="Report" heading-level="2">
    <orb-mi slot="actions" value="duplicate">Duplicate</orb-mi>
    <orb-mi slot="actions" value="export">Export</orb-mi>
    <orb-mi slot="actions" value="delete">Delete</orb-mi>
    <p id="actions-output" role="status">Choose an action from the menu.</p>
  </orb-view>
</div>
```

```javascript
const view = document.querySelector("#actions-view");
view.addEventListener("action", (event) => {
  document.querySelector("#actions-output").textContent = `Chose ${event.detail.value}`;
});
```

:::

**Manual test:**
- The menu button is named "More actions". It opens a menu with three items.
- Choosing an item closes the menu and updates the status line.
- Remove the `orb-mi` elements in devtools. The menu button disappears.

### Footer

Buttons in the `footer` slot sit at the bottom right. When the view is narrower than 30rem, they stack full width, with the last button, usually the primary action, on top. Without footer content, no footer is rendered.

::: live-code-demo

```html
<div style="height: 14rem; max-width: 22rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view label="Narrow view" heading-level="3">
    <p>The footer buttons stack because this view is narrow.</p>
    <orb-button slot="footer" fill="outline">Cancel</orb-button>
    <orb-button slot="footer" color="primary">Save</orb-button>
  </orb-view>
</div>
```

:::

**Manual test:**
- The buttons stack full width with Save on top.
- In the prominent demo under "Header Styles", there's no footer and no empty space for one.

### Fade

Add `fade` to fade content out as it scrolls under the header and footer. The fade replaces the header and footer borders as the separator. An edge only fades when there's hidden content past it, so the top and bottom of the content stay crisp. Set `--fade-size` on the `main-content` part to change the fade distance.

::: live-code-demo

```html
<div style="height: 22rem; border: 1px solid var(--orb-divider-color); border-radius: var(--orb-radius-md); overflow: hidden;">
  <orb-view label="Release notes" heading-level="2" fade>
    <h3>Version 2.0</h3>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus.</p>
    <p>Donec ullamcorper nulla non metus auctor fringilla. Vestibulum id ligula porta felis euismod semper.</p>
    <h3>Version 1.5</h3>
    <p>Maecenas sed diam eget risus varius blandit sit amet non magna. Cras mattis consectetur purus sit amet fermentum.</p>
    <p>Nullam quis risus eget urna mollis ornare vel eu leo. Aenean lacinia bibendum nulla sed consectetur.</p>
    <h3>Version 1.0</h3>
    <p>Etiam porta sem malesuada magna mollis euismod. Duis mollis, est non commodo luctus, nisi erat porttitor ligula.</p>
    <orb-button slot="footer" color="primary">Got it</orb-button>
  </orb-view>
</div>
```

:::

**Manual test:**
- The header and footer have no borders.
- At the top, the content under the header is crisp and the bottom edge fades.
- Scroll a little. The top edge starts fading under the header.
- Scroll to the bottom. The last paragraph is crisp above the footer.
- Resize the window. The fade stays lined up with the header and footer.

## Accessibility

- The `label` renders as a heading. Set `heading-level` to fit the page's heading structure, for example `2` inside an overlay on a page that already has an `h1`.
- The actions button is named "More actions" and the close button "Close".
- The view is a scroll container but isn't focusable itself. Whether keyboard users can scroll content that has nothing focusable in it depends on the browser.

### Manual test checklist

- [ ] The label is announced as a heading at the `heading-level`.
- [ ] Tab reaches the header buttons, the content, and the footer buttons in order.
- [ ] The actions and close buttons have names.
- [ ] In the "Fade" demo, check whether you can scroll the text with the keyboard in each browser. If not, the view may need `tabindex="0"` and a name on its content area.
