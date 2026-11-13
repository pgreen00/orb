---
title: 'OrbMenu | <orb-menu>'
sidebar_label: 'Menu'
---

## Usage

A menu is a list of actions. Put `<orb-mi>` items in an `<orb-menu>`, and set the menu's `for` to the id of the button that opens it. The button and the menu must be in the same document or shadow root. Choosing an item emits `orbSelect` with the item's `value`, then closes the menu.

Set `mode` to `single` or `multi` to make the menu a list of options instead. See Single and Multiple Selection below.

::: live-code-demo

```html
<orb-button id="file-button">File</orb-button>
<orb-menu id="file-menu" for="file-button">
  <orb-mi value="new">New</orb-mi>
  <orb-mi value="open">Open…</orb-mi>
  <orb-mi value="save">Save</orb-mi>
  <orb-divider></orb-divider>
  <orb-mi value="close">Close</orb-mi>
</orb-menu>
<p id="file-output" role="status" style="margin-top: 1rem;">Choose an item.</p>
```

```javascript
const output = document.querySelector("#file-output");
document.querySelector("#file-menu").addEventListener("orbSelect", (event) => {
  output.textContent = `Chose ${event.detail.value}`;
});
```

:::

Menus opened from the keyboard move focus to an item, and return it to the button when they close. Menus opened with the mouse leave focus alone, and items highlight as the pointer moves over them. The menu sets `aria-haspopup="menu"` and `aria-expanded` on its button, and takes its name from the button unless you set `label`.

**Manual test:**
- Click **File**. The menu opens below it, with no item highlighted. Hovering highlights items.
- Click **Save**. The status reads `Chose save` and the menu closes, with no focus ring left on **File**.
- Click **File**, then press Down. **New** is focused, and the arrow keys work from there.
- Click **File**, then press Escape. The menu closes.
- Click **File**, then click it again. The menu closes.
- Tab to **File** and press Enter. The menu opens with **New** focused. Press Escape. The menu closes and focus returns to **File**.
- With **File** focused, press Down to open the menu on the first item, or Up to open it on the last.

## Examples

### Placement

Menus open below their button, lined up with its start. Set `placement` to open elsewhere, such as `bottom-end` for a button at the end of a toolbar. Menus flip to the other side when there isn't room.

::: live-code-demo

```html
<div style="display: flex; justify-content: flex-end;">
  <orb-button id="account-button" fill="outline">Account</orb-button>
  <orb-menu for="account-button" placement="bottom-end">
    <orb-mi value="profile">Profile</orb-mi>
    <orb-mi value="settings">Settings</orb-mi>
    <orb-mi value="sign-out">Sign out</orb-mi>
  </orb-menu>
</div>
```

:::

**Manual test:**
- Click **Account**. The menu's end edge lines up with the button's end edge.
- Scroll so **Account** is near the bottom of the window, then open it. The menu opens above the button.

### Context Menu

Set `show-on="context-menu"` to open the menu where its `for` element is right-clicked. The context menu key and Shift+F10 open it too, at the element. Right-clicking somewhere else in the element while the menu is open moves it there.

::: live-code-demo

```html
<div id="context-area" tabindex="0" style="display: grid; place-items: center; height: 10rem; border: 1px dashed currentColor; border-radius: 0.5rem;">
  Right-click here
</div>
<orb-menu for="context-area" show-on="context-menu" label="Window">
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
```

:::

**Manual test:**
- Right-click inside the box. The menu opens at the pointer, with no item highlighted.
- With the menu open, right-click another spot in the box. The menu moves there without closing.
- Right-clicking outside the box shows the browser's own menu, and closes this one.
- Tab to the box and press Shift+F10. The menu opens at the box with **Minimize** focused.

### Icons and Details

Put an icon in an item's `icon` slot, and extra text such as a keyboard shortcut in its `details` slot. Details are lined up at the end of the item.

::: live-code-demo

```html
<orb-button id="edit-button">Edit</orb-button>
<orb-menu for="edit-button">
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
```

:::

**Manual test:**
- Icons line up in one column and the shortcuts line up at the end.
- Shortcuts are a muted color but still readable.

### Checkbox and Radio Items

Set `type="checkbox"` for an item that toggles. It stays open after it's chosen so several can be changed at once. Set `type="radio"` for a set of options where only one can be checked. Radio items are grouped by their parent element, so wrap each set in an element, such as a `div`, when a menu has more than one. `orbSelect` reports the item's new `checked` state.

::: live-code-demo

```html
<orb-button id="view-button">View</orb-button>
<orb-menu id="view-menu" for="view-button">
  <orb-mi type="checkbox" value="ruler" checked>Ruler</orb-mi>
  <orb-mi type="checkbox" value="grid">Grid</orb-mi>
  <orb-divider></orb-divider>
  <div>
    <orb-mi type="radio" value="small">Small</orb-mi>
    <orb-mi type="radio" value="medium" checked>Medium</orb-mi>
    <orb-mi type="radio" value="large">Large</orb-mi>
  </div>
</orb-menu>
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

### Single and Multiple Selection

Set `mode="single"` for a list where one option is selected, such as a sort order. Choosing an option selects it and closes the menu. Set `mode="multi"` for a list where several options can be selected, such as filters. Choosing an option toggles it, and the menu stays open.

Both modes make the menu a listbox, and every item acts as a radio or checkbox item, so `type` is ignored. Set `checked` on the options that start selected. Set `label` when the button shows the selected value, so the menu keeps its name as the selection changes. Opening the menu from the keyboard focuses the selected option.

Submenus, menubars, and `show-on="context-menu"` don't work with `single` or `multi`. The menu logs a warning to the console if you use them.

::: live-code-demo

```html
<orb-button id="sort-button">Sort: Name</orb-button>
<orb-menu id="sort-menu" for="sort-button" mode="single" label="Sort by">
  <orb-mi value="name" checked>Name</orb-mi>
  <orb-mi value="date">Date</orb-mi>
  <orb-mi value="size">Size</orb-mi>
</orb-menu>
<orb-button id="filter-button">Filter</orb-button>
<orb-menu id="filter-menu" for="filter-button" mode="multi" label="Filter by">
  <orb-mi value="images" checked>Images</orb-mi>
  <orb-mi value="video" checked>Video</orb-mi>
  <orb-mi value="audio">Audio</orb-mi>
</orb-menu>
<p id="list-output" role="status" style="margin-top: 1rem;">Sorted by Name. Showing Images, Video.</p>
```

```javascript
const output = document.querySelector("#list-output");
const sortButton = document.querySelector("#sort-button");
const sortMenu = document.querySelector("#sort-menu");
const filterMenu = document.querySelector("#filter-menu");
const chosen = (menu) => [...menu.querySelectorAll("orb-mi")]
  .filter((item) => item.checked)
  .map((item) => item.textContent.trim())
  .join(", ");
const update = () => {
  sortButton.textContent = `Sort: ${chosen(sortMenu)}`;
  output.textContent = `Sorted by ${chosen(sortMenu)}. Showing ${chosen(filterMenu)}.`;
};
sortMenu.addEventListener("orbSelect", update);
filterMenu.addEventListener("orbSelect", update);
```

:::

**Manual test:**
- Click **Sort: Name**, then **Date**. The menu closes, the button reads `Sort: Date`, and the status updates. Only one option in the menu is checked.
- Tab to the **Sort** button and press Down. **Date** is focused, since it's selected.
- Click **Filter**, then click **Audio**. It gets a checkmark, the menu stays open, and the status updates.
- Click **Images**. It loses its checkmark, and the menu stays open.
- Screen readers announce the **Sort** menu as a list with one option selected, and the **Filter** menu as a list where several options can be selected.

### Disabled and Danger Items

`disabled` items can still be focused with the arrow keys, so screen reader users know they exist, but they can't be chosen. `variant="danger"` marks destructive actions.

::: live-code-demo

```html
<orb-button id="actions-button">Actions</orb-button>
<orb-menu for="actions-button">
  <orb-mi>Rename</orb-mi>
  <orb-mi disabled>Move <span slot="details">No folders</span></orb-mi>
  <orb-mi>Duplicate</orb-mi>
  <orb-divider></orb-divider>
  <orb-mi variant="danger">
    <iconify-icon icon="mdi:delete" slot="icon"></iconify-icon>
    Delete
  </orb-mi>
</orb-menu>
```

:::

**Manual test:**
- **Move** is dimmed. Clicking it does nothing and the menu stays open.
- Arrow onto **Move**. It takes focus, and Enter does nothing.
- **Delete** is red, including its icon.

### Submenus

For a submenu, give an item an id and point another `<orb-menu>` at it with `for`. Put the submenu inside the menu it opens from, so `orbSelect` from the submenu bubbles up to a listener on the top menu. The item gets an arrow, and the submenu opens beside it.

Submenus open when the pointer rests on their item, or with Right, Enter, or Space. Opening a submenu keeps its parent open, and choosing an item in it closes them all.

::: live-code-demo

```html
<orb-button id="share-button">Share</orb-button>
<orb-menu id="share-menu" for="share-button">
  <orb-mi value="link">Copy link</orb-mi>
  <orb-mi id="send-to-item">Send to</orb-mi>
  <orb-menu for="send-to-item">
    <orb-mi value="email">Email</orb-mi>
    <orb-mi value="messages">Messages</orb-mi>
    <orb-mi id="social-item">Social</orb-mi>
    <orb-menu for="social-item">
      <orb-mi value="mastodon">Mastodon</orb-mi>
      <orb-mi value="bluesky">Bluesky</orb-mi>
    </orb-menu>
  </orb-menu>
  <orb-mi value="embed">Embed</orb-mi>
</orb-menu>
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
- Open **Share** and hover **Send to**. The submenu opens beside it, and the **Share** menu stays open. Resting on **Copy link** closes the submenu.
- Hover **Send to**, then move diagonally down into the submenu, crossing **Embed** on the way. The submenu stays open.
- Hover **Social** and click **Bluesky**. Every menu closes and the status reads `Shared with bluesky`.
- With the keyboard, arrow to **Send to** and press Right. The submenu opens on **Email**. Press Left. It closes and focus returns to **Send to**.
- Press Escape in a submenu. Only that submenu closes.
- Click outside. Every menu closes.

### Keeping the Menu Open

Call `preventDefault()` on `orbSelect` to keep the menu open after an item is chosen, for example while an action runs.

::: live-code-demo

```html
<orb-button id="counter-button">Counter</orb-button>
<orb-menu id="counter-menu" for="counter-button">
  <orb-mi value="add">Add one</orb-mi>
  <orb-mi value="done">Done</orb-mi>
</orb-menu>
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

### Inline Menus

Without `for`, the menu shows in the page instead of opening from a button, such as in a sidebar or a dialog.

::: live-code-demo

```html
<orb-menu label="Sort by" style="max-width: 14rem;">
  <orb-mi type="radio" value="name" checked>Name</orb-mi>
  <orb-mi type="radio" value="date">Date</orb-mi>
  <orb-mi type="radio" value="size">Size</orb-mi>
</orb-menu>
```

:::

**Manual test:**
- The menu shows in the page, with no box or shadow.
- Tab to it. One item takes focus, and Up and Down move between items.

## Accessibility

### Keyboard

| Key | Action |
| --- | --- |
| Enter / Space / Down | On the button, opens the menu on its first item. In `single` and `multi` menus, on the selected option |
| Up | On the button, opens the menu on its last item. In `single` and `multi` menus, on the selected option |
| Down / Up | Next or previous item, wrapping |
| Home / End | First or last item |
| Enter / Space | Chooses the item, or opens its submenu. In `single` menus, selects the option and closes the menu. In `multi` menus, toggles the option and keeps the menu open |
| Right | Opens the item's submenu. In a menubar's menu, moves to the next menu |
| Left | Closes a submenu. In a menubar's menu, moves to the previous menu |
| Escape | Closes the innermost menu and returns focus to the item or button that opened it |
| Letters | Moves to the next item starting with the typed text |
| Tab | Leaves the menu and closes every open menu |

Right and Left are swapped in right-to-left pages.

### Manual test checklist

- [ ] Menus in `actions` mode have the `menu` role with `aria-orientation="vertical"`. Menus in `single` and `multi` modes have the `listbox` role, and `multi` menus also have `aria-multiselectable="true"`. All are named by `label`, or by their button.
- [ ] Items in `actions` mode have the `menuitem`, `menuitemcheckbox`, or `menuitemradio` role, and checkable items have `aria-checked`. Items in `single` and `multi` modes have the `option` role and `aria-selected`, and no `aria-checked`.
- [ ] Dividers in `single` and `multi` menus are hidden from screen readers, since listboxes can't contain separators.
- [ ] Disabled items have `aria-disabled="true"` and stay reachable with the arrow keys.
- [ ] A button or item that opens a menu has `aria-haspopup="menu"`, or `aria-haspopup="listbox"` in `single` and `multi` modes, and `aria-expanded` that follows the menu's state.
- [ ] Opening a menu from the keyboard moves focus to its first item, and closing it from the keyboard returns focus to the button that opened it. With the mouse, focus doesn't move.
- [ ] Opening a `single` or `multi` menu from the keyboard focuses its selected option, or the first item if none is selected.
- [ ] Clicking items with the mouse never leaves a focus highlight behind.
- [ ] Only one item in each menu is in the Tab order.
- [ ] Focused items show a visible focus ring when using the keyboard.
- [ ] Icons, checkmarks, and submenu arrows aren't announced.
- [ ] In forced colors mode, the menu's border, the focused item, and checkmarks are still visible.
