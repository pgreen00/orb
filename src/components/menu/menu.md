---
title: 'OrbMenu | <orb-menu>'
sidebar_label: 'Menu'
---

## Usage

A menu is a list of actions. Put `<orb-mi>` items in an `<orb-menu>`, and put the menu in an `<orb-popover>` with a button in its `trigger` slot. Choosing an item emits `orbSelect` with the item's `value`, then closes the menu. In a popover with `show-on="hover"`, clicking an item leaves the menu open until the pointer leaves it.

::: live-code-demo

```html
<orb-popover placement="bottom-start" arrow="false" offset-y="4">
  <orb-button slot="trigger">File</orb-button>
  <orb-menu id="file-menu" label="File">
    <orb-mi value="new">New</orb-mi>
    <orb-mi value="open">Open…</orb-mi>
    <orb-mi value="save">Save</orb-mi>
    <orb-divider></orb-divider>
    <orb-mi value="close">Close</orb-mi>
  </orb-menu>
</orb-popover>
<p id="file-output" role="status" style="margin-top: 1rem;">Choose an item.</p>
```

```javascript
const output = document.querySelector("#file-output");
document.querySelector("#file-menu").addEventListener("orbSelect", (event) => {
  output.textContent = `Chose ${event.detail.value}`;
});
```

:::

Menus opened from the keyboard move focus to an item, and return it to the button when they close. Menus opened with the mouse leave focus alone, and items highlight as the pointer moves over them.

**Manual test:**
- Click **File**. The menu opens with no item highlighted. Hovering highlights items.
- Click **Save**. The status reads `Chose save` and the menu closes, with no focus ring left on **File**.
- Click **File**, then press Down. **New** is focused, and the arrow keys work from there.
- Click **File**, then press Escape. The menu closes.
- Tab to **File** and press Enter. The menu opens with **New** focused. Press Escape. The menu closes and focus returns to **File**.
- With **File** focused, press Down to open the menu on the first item, or Up to open it on the last.

## Examples

### Context Menu

For a context menu, leave out the trigger and call the popover's `show()` method with the `contextmenu` event. The menu opens at the pointer. Use `placement="bottom-start"` so it opens below and after the pointer, like the browser's own menu. Calling `show()` again while it's open moves it to the new spot.

::: live-code-demo

```html
<div id="context-area" style="display: grid; place-items: center; height: 10rem; border: 1px dashed currentColor; border-radius: 0.5rem;">
  Right-click here
</div>
<orb-popover id="context-popover" placement="bottom-start" arrow="false" offset-y="0">
  <orb-menu label="Window">
    <orb-mi>
      <iconify-icon icon="mdi:minimize" slot="icon"></iconify-icon>
      Minimize
      <span slot="details">⌘M</span>
    </orb-mi>
    <orb-mi>
      <iconify-icon icon="mdi:zoom-in" slot="icon"></iconify-icon>
      Zoom
    </orb-mi>
    <orb-mi>
      <iconify-icon icon="mdi:fullscreen" slot="icon"></iconify-icon>
      Fill
    </orb-mi>
    <orb-mi>
      <iconify-icon icon="mdi:image-filter-center-focus" slot="icon"></iconify-icon>
      Center
    </orb-mi>
  </orb-menu>
</orb-popover>
```

```javascript
const popover = document.querySelector("#context-popover");
document.querySelector("#context-area").addEventListener("contextmenu", (event) => {
  event.preventDefault();
  popover.show(event);
});
```

:::

**Manual test:**
- Right-click inside the box. The menu opens at the pointer, with no item highlighted.
- With the menu open, right-click another spot in the box. The menu moves there without closing or flashing.
- Right-clicking outside the box shows the browser's own menu.
- Click outside the menu or press Escape to close it.

### Icons and Details

Put an icon in an item's `icon` slot, and extra text such as a keyboard shortcut in its `details` slot. Details are lined up at the end of the item.

::: live-code-demo

```html
<orb-popover placement="bottom-start" arrow="false" offset-y="4">
  <orb-button slot="trigger">Edit</orb-button>
  <orb-menu label="Edit">
    <orb-mi>
      <iconify-icon icon="mdi:undo" slot="icon"></iconify-icon>
      Undo
      <kbd slot="details">⌘Z</kbd>
    </orb-mi>
    <orb-mi>
      <iconify-icon icon="mdi:redo" slot="icon"></iconify-icon>
      Redo
      <kbd slot="details">⇧⌘Z</kbd>
    </orb-mi>
    <orb-divider></orb-divider>
    <orb-mi>
      <iconify-icon icon="mdi:content-cut" slot="icon"></iconify-icon>
      Cut
      <kbd slot="details">⌘X</kbd>
    </orb-mi>
    <orb-mi>
      <iconify-icon icon="mdi:content-copy" slot="icon"></iconify-icon>
      Copy
      <kbd slot="details">⌘C</kbd>
    </orb-mi>
    <orb-mi>
      <iconify-icon icon="mdi:content-paste" slot="icon"></iconify-icon>
      Paste
      <kbd slot="details">⌘V</kbd>
    </orb-mi>
  </orb-menu>
</orb-popover>
```

:::

**Manual test:**
- Icons line up in one column and the shortcuts line up at the right edge.
- Shortcuts are a muted color but still readable.

### Checkbox and Radio Items

Set `type="checkbox"` for an item that toggles. It stays open after it's chosen so several can be changed at once. Set `type="radio"` for a set of options where only one can be checked. Radio items are grouped by their parent element, so wrap each set in an element, such as a `div`, when a menu has more than one. `orbSelect` reports the item's new `checked` state.

::: live-code-demo

```html
<orb-popover placement="bottom-start" arrow="false" offset-y="4">
  <orb-button slot="trigger">View</orb-button>
  <orb-menu id="view-menu" label="View">
    <orb-mi type="checkbox" value="ruler" checked>Ruler</orb-mi>
    <orb-mi type="checkbox" value="grid">Grid</orb-mi>
    <orb-divider></orb-divider>
    <div>
      <orb-mi type="radio" value="small">Small</orb-mi>
      <orb-mi type="radio" value="medium" checked>Medium</orb-mi>
      <orb-mi type="radio" value="large">Large</orb-mi>
    </div>
  </orb-menu>
</orb-popover>
<p id="view-output" role="status" style="margin-top: 1rem;">Ruler on, grid off, medium.</p>
```

```javascript
const menu = document.querySelector("#view-menu");
const output = document.querySelector("#view-output");
menu.addEventListener("orbSelect", () => {
  const on = (value) => menu.querySelector(`[value="${value}"]`).checked;
  const size = [...menu.querySelectorAll('[type="radio"]')].find((item) => item.checked).value;
  output.textContent = `Ruler ${on("ruler") ? "on" : "off"}, grid ${on("grid") ? "on" : "off"}, ${size}.`;
});
```

:::

**Manual test:**
- **Ruler** and **Medium** show checkmarks. All labels line up, whether or not they're checked.
- Click **Grid**. It gets a checkmark, the menu stays open, and the status updates.
- Click **Large**. **Medium** loses its checkmark, the menu closes, and the status updates.
- Screen readers announce checkbox items as "checked" or "not checked", and radio items as one of a set.

### Disabled and Danger Items

`disabled` items can still be focused with the arrow keys, so screen reader users know they exist, but they can't be chosen. `variant="danger"` marks destructive actions.

::: live-code-demo

```html
<orb-popover placement="bottom-start" arrow="false" offset-y="4">
  <orb-button slot="trigger">Actions</orb-button>
  <orb-menu label="Actions">
    <orb-mi>Rename</orb-mi>
    <orb-mi disabled>Move <span slot="details">No folders</span></orb-mi>
    <orb-mi>Duplicate</orb-mi>
    <orb-divider></orb-divider>
    <orb-mi variant="danger">
      <iconify-icon icon="mdi:delete" slot="icon"></iconify-icon>
      Delete
    </orb-mi>
  </orb-menu>
</orb-popover>
```

:::

**Manual test:**
- **Move** is dimmed. Clicking it does nothing and the menu stays open.
- Arrow onto **Move**. It takes focus, and Enter does nothing.
- **Delete** is red, including its icon.

### Submenus

For a submenu, put an `<orb-popover>` in the menu with an item in its `trigger` slot and a nested `<orb-menu>` inside. The item gets an arrow. Opening a submenu keeps its parent open, and choosing an item in it closes them all.

Set `show-on="hover"` on submenu popovers so they open as the pointer moves over their item, like desktop menus. Keyboard users open them with Right or Enter either way.

::: live-code-demo

```html
<orb-popover placement="bottom-start" arrow="false" offset-y="4">
  <orb-button slot="trigger">Share</orb-button>
  <orb-menu id="share-menu" label="Share">
    <orb-mi value="link">Copy link</orb-mi>
    <orb-popover placement="right-start" arrow="false" offset-y="4" show-on="hover">
      <orb-mi slot="trigger">Send to</orb-mi>
      <orb-menu label="Send to">
        <orb-mi value="email">Email</orb-mi>
        <orb-mi value="messages">Messages</orb-mi>
        <orb-popover placement="right-start" arrow="false" offset-y="4" show-on="hover">
          <orb-mi slot="trigger">Social</orb-mi>
          <orb-menu label="Social">
            <orb-mi value="mastodon">Mastodon</orb-mi>
            <orb-mi value="bluesky">Bluesky</orb-mi>
          </orb-menu>
        </orb-popover>
      </orb-menu>
    </orb-popover>
    <orb-mi value="embed">Embed</orb-mi>
  </orb-menu>
</orb-popover>
<p id="share-output" role="status" style="margin-top: 1rem;">Choose an item.</p>
```

```javascript
const output = document.querySelector("#share-output");
document.querySelector("#share-menu").addEventListener("orbSelect", (event) => {
  output.textContent = `Shared with ${event.detail.value}`;
});
```

:::

**Manual test:**
- Open **Share** and hover **Send to**. The submenu opens beside it, and the **Share** menu stays open. Hovering **Copy link** closes the submenu.
- Hover **Send to**, then move diagonally down into the submenu, crossing **Embed** on the way. The submenu stays open.
- Hover **Social** and click **Bluesky**. Every menu closes and the status reads `Shared with bluesky`. `orbSelect` bubbles, so the listener on the top menu hears items chosen in submenus.
- With the keyboard, arrow to **Send to** and press Right. The submenu opens on **Email**. Press Left. It closes and focus returns to **Send to**.
- Press Escape in a submenu. Only that submenu closes.
- Click outside. Every menu closes.

### Menubar

Set `bar` for a horizontal menubar, like the one at the top of a desktop app. Each item usually opens a menu. Once a menu is open, hovering another item switches to its menu.

::: live-code-demo

```html
<orb-menu bar label="Editor" id="menubar">
  <orb-popover placement="bottom-start" arrow="false" offset-y="4">
    <orb-mi slot="trigger">File</orb-mi>
    <orb-menu label="File">
      <orb-mi value="new">New</orb-mi>
      <orb-mi value="open">Open…</orb-mi>
      <orb-popover placement="right-start" arrow="false" offset-y="4" show-on="hover">
        <orb-mi slot="trigger">Open recent</orb-mi>
        <orb-menu label="Open recent">
          <orb-mi value="birds.md">birds.md</orb-mi>
          <orb-mi value="notes.md">notes.md</orb-mi>
        </orb-menu>
      </orb-popover>
      <orb-divider></orb-divider>
      <orb-mi value="save">Save <kbd slot="details">⌘S</kbd></orb-mi>
    </orb-menu>
  </orb-popover>
  <orb-popover placement="bottom-start" arrow="false" offset-y="4">
    <orb-mi slot="trigger">Edit</orb-mi>
    <orb-menu label="Edit">
      <orb-mi value="undo">Undo <kbd slot="details">⌘Z</kbd></orb-mi>
      <orb-mi value="redo">Redo <kbd slot="details">⇧⌘Z</kbd></orb-mi>
    </orb-menu>
  </orb-popover>
  <orb-popover placement="bottom-start" arrow="false" offset-y="4">
    <orb-mi slot="trigger">View</orb-mi>
    <orb-menu label="View">
      <orb-mi type="checkbox" value="sidebar" checked>Sidebar</orb-mi>
      <orb-mi type="checkbox" value="minimap">Minimap</orb-mi>
    </orb-menu>
  </orb-popover>
  <orb-mi value="help">Help</orb-mi>
</orb-menu>
<p id="menubar-output" role="status" style="margin-top: 1rem;">Choose an item.</p>
```

```javascript
const output = document.querySelector("#menubar-output");
document.querySelector("#menubar").addEventListener("orbSelect", (event) => {
  output.textContent = `Chose ${event.detail.value}`;
});
```

:::

**Manual test:**
- Tab into the menubar. Only one item is in the Tab order, and Tab again leaves the menubar.
- Left and Right move between **File**, **Edit**, **View**, and **Help**, wrapping at the ends.
- Down opens a menu on its first item. Up opens it on its last.
- In an open menu, Left and Right switch to the neighboring menu. On **Open recent**, Right opens its submenu instead.
- Click **File** and hover **Open recent**. Its submenu opens.
- Click **File**, then move the pointer over **Edit**. The **Edit** menu replaces the **File** menu.
- Click **Help**. It's chosen directly, since it doesn't open a menu.

### Keeping the Menu Open

Call `preventDefault()` on `orbSelect` to keep the menu open after an item is chosen, for example while an action runs.

::: live-code-demo

```html
<orb-popover placement="bottom-start" arrow="false" offset-y="4">
  <orb-button slot="trigger">Counter</orb-button>
  <orb-menu id="counter-menu" label="Counter">
    <orb-mi value="add">Add one</orb-mi>
    <orb-mi value="done">Done</orb-mi>
  </orb-menu>
</orb-popover>
<p id="counter-output" role="status" style="margin-top: 1rem;">Count: 0</p>
```

```javascript
let count = 0;
const output = document.querySelector("#counter-output");
document.querySelector("#counter-menu").addEventListener("orbSelect", (event) => {
  if (event.detail.value === "add") {
    event.preventDefault();
    output.textContent = `Count: ${++count}`;
  }
});
```

:::

**Manual test:**
- Click **Add one** a few times. The count goes up and the menu stays open.
- Click **Done**. The menu closes.

## Accessibility

### Keyboard

| Key | Menu | Menubar |
| --- | --- | --- |
| Down / Up | Next or previous item, wrapping | Opens the item's menu on its first or last item |
| Right / Left | Right opens a submenu. Left closes a submenu. In a menubar's menu, both move to the neighboring menu | Next or previous item, wrapping |
| Home / End | First or last item | First or last item |
| Enter / Space | Chooses the item, or opens its submenu | Opens the item's menu, or chooses it |
| Escape | Closes the innermost menu and returns focus to the item or button that opened it. Also works on the button of a menu opened with the mouse | |
| Letters | Moves to the next item starting with the typed text | |
| Tab | Leaves the menu and closes every open menu | Leaves the menubar |

Right and Left are swapped in right-to-left pages.

### Manual test checklist

- [ ] Menus have the `menu` role and menubars have the `menubar` role, with `aria-orientation` set. Each is named by its `label`.
- [ ] Items have the `menuitem`, `menuitemcheckbox`, or `menuitemradio` role, and checkable items have `aria-checked`.
- [ ] Disabled items have `aria-disabled="true"` and stay reachable with the arrow keys.
- [ ] A button or item that opens a menu has `aria-haspopup="menu"`, and `aria-expanded` that follows the menu's state.
- [ ] Opening a menu from the keyboard moves focus to its first item, and closing it from the keyboard returns focus to the button that opened it. With the mouse, focus doesn't move.
- [ ] Clicking items with the mouse never leaves a focus highlight behind.
- [ ] Only one item in each menu is in the Tab order.
- [ ] Focused items show a visible focus ring when using the keyboard.
- [ ] Icons, checkmarks, and submenu arrows aren't announced.
- [ ] In forced colors mode, the focused item and checkmarks are still visible.
