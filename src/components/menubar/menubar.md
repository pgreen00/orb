---
title: 'OrbMenubar | <orb-menubar>'
sidebar_label: 'Menubar'
---

## Usage

A menubar is a row of menus, like the one at the top of a desktop app. Put `<orb-mi>` items in an `<orb-menubar>`, give each item that opens a menu an id, and point an [`<orb-menu>`](../menu/) at it with `for`. Items without a menu are chosen directly.

Put the menus inside the menubar, so `orbSelect` from any of them reaches a listener on the menubar. Once a menu is open, hovering another item switches to its menu.

::: live-code-demo

```html
<orb-menubar label="Editor" id="menubar">
  <orb-mi id="bar-file">File</orb-mi>
  <orb-mi id="bar-edit">Edit</orb-mi>
  <orb-mi id="bar-view">View</orb-mi>
  <orb-mi value="help">Help</orb-mi>

  <orb-menu for="bar-file">
    <orb-mi value="new">New</orb-mi>
    <orb-mi value="open">Open…</orb-mi>
    <orb-mi id="bar-recent">Open recent</orb-mi>
    <orb-menu for="bar-recent">
      <orb-mi value="birds.md">birds.md</orb-mi>
      <orb-mi value="notes.md">notes.md</orb-mi>
    </orb-menu>
    <orb-divider></orb-divider>
    <orb-mi value="save">Save <kbd slot="details">⌘S</kbd></orb-mi>
  </orb-menu>
  <orb-menu for="bar-edit">
    <orb-mi value="undo">Undo <kbd slot="details">⌘Z</kbd></orb-mi>
    <orb-mi value="redo">Redo <kbd slot="details">⇧⌘Z</kbd></orb-mi>
  </orb-menu>
  <orb-menu for="bar-view">
    <orb-mi type="checkbox" value="sidebar" checked>Sidebar</orb-mi>
    <orb-mi type="checkbox" value="minimap">Minimap</orb-mi>
  </orb-menu>
</orb-menubar>
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
- Down, Enter, or Space opens a menu on its first item. Up opens it on its last.
- In an open menu, Left and Right switch to the neighboring menu. On **Open recent**, Right opens its submenu instead.
- Click **File**, then move the pointer over **Edit**. The **Edit** menu replaces the **File** menu.
- Hover **Open recent** in the **File** menu. Its submenu opens, and choosing **notes.md** reads `Chose notes.md`.
- Click **Help**. It's chosen directly, since it doesn't open a menu.
- Clicking an item doesn't leave a highlight on it after the pointer moves away.

## Accessibility

### Keyboard

| Key | Action |
| --- | --- |
| Right / Left | Next or previous item, wrapping. With a menu open, opens the neighbor's menu |
| Home / End | First or last item |
| Down / Enter / Space | Opens the item's menu on its first item, or chooses an item without a menu |
| Up | Opens the item's menu on its last item |

Right and Left are swapped in right-to-left pages. Inside the menus, the keys work as described for [`<orb-menu>`](../menu/#keyboard).

### Manual test checklist

- [ ] The menubar has the `menubar` role with `aria-orientation="horizontal"`, named by its `label`.
- [ ] Items that open a menu have `aria-haspopup="menu"`, and `aria-expanded` that follows their menu.
- [ ] Only one item is in the Tab order.
- [ ] Escape in a menu closes it and returns focus to its item in the menubar.
- [ ] Focused items show a visible focus ring when using the keyboard.
