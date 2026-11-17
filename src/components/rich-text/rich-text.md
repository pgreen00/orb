---
title: 'OrbRichText | <orb-rich-text>'
sidebar_label: 'Rich Text Editor'
wide: true
---

## Usage

A rich text editor for formatted content. Its value is HTML, which is always cleaned to the editor's own schema, so what's saved is safe to display. Read it with `getContent()` or the `value` property, and read plain text with `getText()`.

The editor is also a form field. Give it a `name`, and the form gets its HTML under that name. See Forms below.

::: live-code-demo

```html
<orb-rich-text label="Notes" note="Formatting is kept when you save." value="<p>Start <strong>here</strong>.</p>"></orb-rich-text>
```

:::

Set `label` and `note` as text, or slot your own content into the `label` and `note` slots. Set `placeholder` to the text shown while the editor is empty. `min-height` and `max-height` size the writing area, which scrolls past its maximum.

::: live-code-demo

```html
<orb-rich-text label="Sizing" min-height="120px" max-height="200px" placeholder="Type a few lines to see it scroll." value="<p>Line one.</p><p>Line two.</p><p>Line three.</p><p>Line four.</p><p>Line five.</p><p>Line six.</p><p>Line seven.</p><p>Line eight.</p>"></orb-rich-text>
```

:::

## Blocks

The text style select sets the selected blocks to a paragraph or a heading, Heading 1 to 6. The quote button wraps the selected blocks in a quote, and the code button makes them a code block. Quotes can hold several paragraphs, and a quoted heading stays a heading inside the quote.

::: live-code-demo

```html
<orb-rich-text label="Block types" value='<h2>A heading</h2><p>A paragraph with <strong>bold</strong> and <em>italic</em> text.</p><blockquote><p>A quote, which can hold several paragraphs.</p><p>Like this one.</p></blockquote><pre><code class="language-javascript">const greeting = "hello";</code></pre>'></orb-rich-text>
```

:::

A horizontal line (the separator control) splits the block at the caret, and puts the line between the halves.

Indent and outdent step a paragraph or heading in by 2em at a time, up to eight steps. In a list they nest the items instead. The line height control sets the spacing of the selected blocks.

::: live-code-demo

```html
<orb-rich-text label="Layout" value='<p style="margin-inline-start: 2em">Indented one step.</p><p style="margin-inline-start: 4em; line-height: 2">Indented two steps, with double line height.</p><p style="text-align: center">Centered.</p><hr><p style="text-align: right">Right-aligned, after a horizontal line.</p>'></orb-rich-text>
```

:::

### Code blocks

A code block holds its text as plain text, with no formatting inside. Its language comes from a `language-…` class, which the code language select sets. That select appears only while the caret is in a code block, at the end of the toolbar, so in a narrow editor it's under **More formatting**. The languages offered are the `codeLanguages` property (set it as a property, not an attribute). Languages the highlighter doesn't know are offered but not colored.

::: live-code-demo

```html
<orb-rich-text id="code-demo" label="Code" value='<p>Install with <code>npm install orb-style</code>, then run:</p><pre><code class="language-javascript">const total = [1, 2, 3].reduce((sum, n) => sum + n, 0);
console.log(total);</code></pre>'></orb-rich-text>
```

```javascript
// Only these languages appear in the language picker.
document.querySelector("#code-demo").codeLanguages = ["javascript", "typescript", "python", "css", "json"];
```

:::

Code is colored with the CSS Custom Highlight API, after a short pause in typing. The colors are the `--editor-code-*` properties. Browsers without that API show plain code.

Formatting commands don't apply inside a code block. The code button turns the block back into a paragraph.

## Lists and tasks

Lists nest. Tab nests an item under the item before it, and Shift+Tab brings it back out. Items after a nested item stay in its sublist, so their order doesn't change.

::: live-code-demo

```html
<orb-rich-text label="Project plan" value='<ol><li>Research<ul><li>Read the spec</li><li>Interview two users</li></ul></li><li>Draft<ul><li>Outline</li></ul></li><li>Ship</li></ol>'></orb-rich-text>
```

:::

A task list adds a checkbox to each item. Click a checkbox to check it. The checked state is saved as the `checked` attribute, so `getContent()` has it, and undo reverts it. The list style select sets how the markers look, such as numbers, letters or bullets, for the list the caret is in.

The saved HTML below updates as you check and uncheck tasks.

::: live-code-demo

```html
<orb-rich-text id="task-demo" label="Checklist" value='<ul><li><input type="checkbox">Write the docs</li><li><input type="checkbox" checked>Add demos</li><li><input type="checkbox">Review</li></ul>'></orb-rich-text>
<p id="task-output" style="font-family: monospace; font-size: 0.85em; white-space: pre-wrap;"></p>
```

```javascript
const editor = document.querySelector("#task-demo");
const output = document.querySelector("#task-output");
const show = async () => (output.textContent = await editor.getContent());
editor.addEventListener("orbEditorChange", show);
show();
```

:::

::: live-code-demo

```html
<orb-rich-text label="List styles" value='<ol style="list-style-type: upper-roman"><li>Roman numerals</li><li>Second item</li></ol><ul style="list-style-type: square"><li>Square bullets</li></ul>'></orb-rich-text>
```

:::

## Text styles

The font and size selects set the font of the selected text. The color and background controls open a palette of swatches. **Default** removes the color, and **Custom…** takes any other color. The text color and background controls show their current color under the icon. With nothing selected, the choice applies to the text typed next, and is dropped when the caret moves.

The `fonts` prop lists the fonts the font select offers, as `{ label, value }` objects where the value is a CSS font stack. `fontSizes` lists the sizes in points, separated by spaces. `colors` is the palette. Set `fonts` and `colors` as properties, not attributes.

::: live-code-demo

```html
<orb-rich-text label="Text styles" toolbar="fontFamily fontSize color background | bold italic underline" value='<p>Plain, <span style="color: rgb(224, 102, 102)">red</span>, <span style="background-color: rgb(255, 217, 102)">highlighted</span>, <span style="font-family: Georgia, serif">Georgia</span> and <span style="font-size: 24pt">large</span> text.</p>'></orb-rich-text>
```

:::

::: live-code-demo

```html
<orb-rich-text id="brand-demo" label="Brand" toolbar="fontFamily fontSize color background" value="<p>Choose a font and color from the brand's palette.</p>"></orb-rich-text>
```

```javascript
const editor = document.querySelector("#brand-demo");
editor.fonts = [
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: '"Courier New", monospace' },
];
editor.fontSizes = "10 12 16 20";
editor.colors = ["#1d4ed8", "#15803d", "#b91c1c", "#6b21a8", "#000000", "#ffffff"];
```

:::

## Markdown shortcuts

Typing Markdown turns into formatting as you type. Each rule runs when the character that completes its syntax is typed.

| Type | Result |
|---|---|
| `#` then a space, up to `######` | Heading 1 to 6 |
| `-`, `*` or `+` then a space | Bulleted list |
| `1.` then a space | Numbered list, starting at that number |
| `[ ]` then a space. `[x]` makes it checked. | Task |
| `>` then a space | Quote |
| Three backticks and a language, then Enter | Code block in that language |
| `---` then Enter | Horizontal line |
| `**bold**` or `__bold__` | Bold |
| `*italic*` or `_italic_` | Italic |
| `~~strike~~` | Strikethrough |
| `` `code` `` | Inline code |
| A web address, then a space or Enter | Link |

Block rules need their syntax at the start of a paragraph, with nothing after it. Rules don't apply inside a code block.

Backspace right after a rule undoes it, and brings back the typed text. Undo does the same, because the typed text and the rule are separate undo steps.

::: live-code-demo

```html
<orb-rich-text label="Try it" placeholder="Type # then a space, or **bold** some text…"></orb-rich-text>
```

:::

## Symbols and emoji

The special characters control opens a grid of symbols, grouped by category, with a search field. The emoji control opens the same kind of picker, with emoji grouped by kind. Each has a **Recently used** row, kept in this browser. A picked character takes the formats set for the text typed next. The emoji data loads the first time the picker opens, and skin tones aren't offered.

::: live-code-demo

```html
<orb-rich-text label="Symbols" toolbar="specialCharacter emoji" value="<p>Put the caret after a word, then pick a symbol or an emoji.</p>"></orb-rich-text>
```

:::

## Toolbar

The `toolbar` prop lists the controls in order. Separate groups with `|`. A group that doesn't fit the width moves into a **More formatting** menu, where a select becomes a submenu. The default toolbar is long, so on a typical window some of its groups, such as the code language select, are under More formatting. Commands that aren't listed are still available from their keyboard shortcuts.

Command ids: `undo`, `redo`, `blockType`, `quote`, `code`, `bold`, `italic`, `underline`, `strike`, `fontFamily`, `fontSize`, `color`, `background`, `clearFormatting`, `link`, `media`, `bulletList`, `orderedList`, `taskList`, `indent`, `outdent`, `listStyle`, `justifyLeft`, `justifyCenter`, `justifyRight`, `justifyFull`, `lineHeight`, `separator`, `specialCharacter`, `emoji`, `codeLanguage`.

`listStyle` shows only in a list, and `codeLanguage` only in a code block.

::: live-code-demo

```html
<orb-rich-text toolbar="bold italic | blockType | bulletList taskList | link"></orb-rich-text>
```

:::

::: live-code-demo

```html
<orb-rich-text label="Clear formatting" value='<p>Select the <strong>bold</strong>, <em>italic</em>, <code>code</code> and <a href="https://example.com">link</a> words, then choose Clear formatting. The link stays.</p>'></orb-rich-text>
```

:::

## Forms

The editor submits its HTML under its `name`. It also validates `required`, and can show a custom error.

- `value` is the current content, and `defaultValue` is what a form reset returns to. It defaults to the first `value`.
- `required` blocks submission until there's text or an image or table in the editor.
- `readonly` keeps the content in the form and blocks edits. `disabled`, or a disabled `fieldset` around the editor, takes it out of the form.
- Typing reaches the form after a short pause. Reading the form with `new FormData(form)` or submitting it still gets the latest content. The editor replaces any other entry in that form with the same `name`, so give it a name no other field uses.
- `setCustomValidity(message)` blocks submission with a message. Pass an empty string to clear it. `resetValidity()` clears it and hides the error until the user interacts again.
- `change` fires once when focus leaves the editor, not when it moves to the toolbar or a menu. `input` fires for typing and for every command, with the command's `inputType`.

::: live-code-demo

```html
<form id="notes-form" style="display: grid; gap: 1rem; max-width: 32rem;">
  <orb-rich-text name="notes" label="Meeting notes" note="Required" required value="<p>Agenda</p>"></orb-rich-text>
  <div style="display: flex; gap: 0.5rem;">
    <orb-button type="submit">Save</orb-button>
    <orb-button type="reset" fill="outline">Reset</orb-button>
  </div>
  <p id="form-output" role="status">Not submitted.</p>
</form>
```

```javascript
const form = document.querySelector("#notes-form");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const notes = new FormData(form).get("notes");
  document.querySelector("#form-output").textContent = `Saved ${notes.length} characters of HTML.`;
});
```

:::

::: live-code-demo

```html
<form style="display: grid; gap: 1rem; max-width: 32rem;">
  <orb-rich-text label="Readonly" name="locked" readonly value="<p>You can read this, but not change it. It's still submitted with the form.</p>"></orb-rich-text>
  <orb-rich-text label="Disabled" name="off" disabled value="<p>Greyed out, and left out of the form.</p>"></orb-rich-text>
</form>
```

:::

## Content

Pasted content is cleaned on the way in. Bold, italic, underline and strikethrough set by Word or Google Docs styles become the matching formatting, so Google Docs' bold wrapper doesn't make the whole paste bold. Word's paragraph-based lists become real lists, nested by level. Scripts, styles, unknown elements and unsafe links are removed. Colors, fonts and font sizes on text are kept when they're valid CSS. Other styles are dropped. Pasting into a code block always inserts plain text. Plain text that reads as Markdown, such as a heading, a list or **bold** text, is rendered when it's pasted. Set `markdown-paste` to `false` to paste it as it is.

Images are non-editable pieces that the caret can't go into. Click one to select it. Delete or Backspace then removes it, and the selection outline is never saved.

::: live-code-demo

```html
<orb-rich-text label="Images" value='<p>Click the picture to select it, then press Delete.</p><p><img alt="A sample image" src="data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27200%27%20height=%2780%27%3E%3Crect%20width=%27200%27%20height=%2780%27%20rx=%2710%27%20fill=%27%23cfe3ff%27/%3E%3Ctext%20x=%2716%27%20y=%2748%27%20font-family=%27sans-serif%27%20font-size=%2720%27%3EA%20sample%20image%3C/text%3E%3C/svg%3E"></p>'></orb-rich-text>
```

:::

Placeholder text is shown while the editor is empty. Pasting from Word or Google Docs keeps the formatting that matters and drops the rest.

::: live-code-demo

```html
<orb-rich-text placeholder="Paste from Word or Google Docs…"></orb-rich-text>
```

:::

::: live-code-demo

```html
<orb-rich-text label="Links" value='<p>Read the <a href="https://example.com">example site</a>. Select the words and press Ctrl+K to change the address.</p>'></orb-rich-text>
```

:::

Untrusted HTML is cleaned before it's shown, so a script in it never runs.

::: live-code-demo

```html
<orb-rich-text id="unsafe-demo" label="Content from an API" value="<p>Loaded text</p>"></orb-rich-text>
<p><orb-button id="load-unsafe" fill="outline">Load untrusted HTML</orb-button></p>
<p id="unsafe-output" role="status" style="font-family: monospace; white-space: pre-wrap;"></p>
```

```javascript
const editor = document.querySelector("#unsafe-demo");
const output = document.querySelector("#unsafe-output");
document.querySelector("#load-unsafe").addEventListener("click", async () => {
  await editor.setContent(`<h3 onclick="alert(1)">Safe heading</h3><p>Some text<script>console.log("ran")<\/script> with a <a href="javascript:alert(1)">bad link</a> and <span style="color: red">red text</span>.</p>`);
  output.textContent = await editor.getContent();
});
```

:::

## Examples

### Setting content from code

`setContent()` and `value` clean the HTML the same way paste does, so untrusted markup from an API is safe to pass in. Setting content starts a new undo history, and fires no `input` or `change` event.

```javascript
const editor = document.querySelector("orb-rich-text");
await editor.setContent("<h1>Release notes</h1><ul><li>Faster search</li></ul>");
console.log(await editor.getContent());
```

::: live-code-demo

```html
<orb-rich-text id="io-demo" label="Content" value="<p>Edit me, then use the buttons.</p>"></orb-rich-text>
<p>
  <orb-button id="io-get" fill="outline">Get HTML</orb-button>
  <orb-button id="io-text" fill="outline">Get text</orb-button>
  <orb-button id="io-clear" fill="outline">Clear</orb-button>
</p>
<p id="io-output" role="status" style="font-family: monospace; white-space: pre-wrap;"></p>
```

```javascript
const editor = document.querySelector("#io-demo");
const output = document.querySelector("#io-output");
document.querySelector("#io-get").addEventListener("click", async () => (output.textContent = await editor.getContent()));
document.querySelector("#io-text").addEventListener("click", async () => (output.textContent = await editor.getText()));
document.querySelector("#io-clear").addEventListener("click", () => editor.clear());
```

:::

`orbEditorChange` fires after each change, with the saved HTML, the text and whether the editor is empty. Here it drives a word count.

::: live-code-demo

```html
<orb-rich-text id="count-demo" label="Word count" placeholder="Type something…"></orb-rich-text>
<p id="count-output" role="status"></p>
```

```javascript
const editor = document.querySelector("#count-demo");
const output = document.querySelector("#count-output");
editor.addEventListener("orbEditorChange", (event) => {
  const words = event.detail.text.trim() ? event.detail.text.trim().split(/\s+/).length : 0;
  output.textContent = event.detail.isEmpty ? "Empty" : `${words} words`;
});
```

:::

## Keyboard

Shortcuts use Ctrl, or ⌘ on Apple devices.

| Key | Action |
|---|---|
| Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y | Undo, redo |
| Ctrl+B, Ctrl+I, Ctrl+U | Bold, italic, underline |
| Ctrl+Shift+X | Strikethrough |
| Ctrl+K | Insert or edit a link |
| Ctrl+\\ | Clear formatting |
| Ctrl+Alt+0 | Paragraph |
| Ctrl+Alt+1 to 6 | Headings 1 to 6. Pressing the current heading's shortcut returns it to a paragraph. |
| Ctrl+Shift+7, 8, 9 | Numbered list, bulleted list, task list |
| Ctrl+Alt+Enter | Check or uncheck the task the caret is in |
| Ctrl+Shift+L, E, R, J | Align left, center, right, justify |
| Ctrl+[ and Ctrl+] | Outdent, indent |
| Ctrl+/ | Show this list of shortcuts |
| Alt+F10 | Move focus to the toolbar |
| Left, Right, Home, End (on the toolbar) | Move between toolbar controls |
| Enter | Split the block. In a list, adds an item, and on an empty item leaves the list. In a task, the new item gets a checkbox. In a quote, leaves the quote from an empty last paragraph. In a code block, adds a line, and two empty lines in a row leave the block. |
| Shift+Enter | A line break in the same block |
| Backspace at the start of a block | Joins it to the block before. In a list, outdents. In a quote, removes the quote. At the top, turns a heading into a paragraph. |
| Backspace right after a checkbox or image | Removes it |
| Delete at the end of a block | Joins the block after it |
| Backspace or Delete with a selected image or rule | Removes it |
| Tab, Shift+Tab (in a list or code block) | Indent or outdent the items or lines. Elsewhere Tab moves focus. |
| Escape, then Tab | Leaves a list or code block instead of indenting. The next key goes back to normal. |
| Up, Down (in a code block, at its first or last line) | Moves to a new paragraph before or after the block, if there isn't one |
| Backspace right after a Markdown rule | Undoes the rule, which brings back the typed text |

With no text selected, a bold, italic or underline shortcut, or a color or font from the toolbar, applies to the text typed next. It's dropped when the caret moves.

**Manual test:**
- Select a word and press Ctrl+B or ⌘B. It becomes bold, and **Bold** shows as pressed in the toolbar.
- Press Ctrl+Z, then Ctrl+Shift+Z. The bold is removed, then restored.
- Press Ctrl+K with a word selected. The link popover opens. Enter a URL and press Enter. The word becomes a link.
- Enter `javascript:alert(1)` as the URL. The field reports an error, and no link is added.
- Click the caret into a link. The popover shows its URL, with **Edit**, **Remove** and **Open**.
- Open the text style select and choose **Heading 3**, then **Paragraph** to revert. Click **Quote**, then the code button. Each applies to the selected paragraph, and clicking it again reverts.
- Click the code button, type a few lines of JavaScript, and check that keywords and strings get colors after a moment. Choose another language from the code language select.
- Press Enter three times at the end of a code block. The third Enter leaves the block for a paragraph.
- Put the caret in a bulleted item and press Tab. The item nests under the one before it. Press Shift+Tab to bring it back.
- Check a task: click its checkbox. Press Ctrl+Z to uncheck it again.
- Pick **Insert image**, then click the image and press Delete. The image is removed.
- Narrow the window until groups move into **More formatting**. A select there opens as a submenu, and its choices still apply.
- Press Ctrl+/. The list of shortcuts opens, and Escape closes it.
- Put the form in the demo above, type, and submit. The status shows the saved length. Empty the editor and submit. The **Required** error appears after the first submit.
- Click **Reset**. The content returns to the starting text, and the error clears.
- Select a word and pick a red swatch from the text color control. The word turns red. Pick **Default** and the color is removed.
- Choose **Georgia** from the font select, then **18** from the size select. The selected text changes to both.
- With nothing selected, pick a background color and type. The new text is highlighted, and stops being highlighted once the caret moves.
- Type `# Title` then a space. It becomes a heading. Type `**bold**` and press Backspace. The literal `**bold**` comes back.
- Paste a line of Markdown, such as `- one`, from a text file. It becomes a list.
- Open special characters, search for "euro", and insert €. Open emoji, insert one, and check it's in **Recently used** when you open the picker again.

## Accessibility

- The content area is a `textbox` with `aria-multiline`. Its name comes from the host's `aria-label`, then the slotted label, the `label` prop, a `<label for>` that points at the editor, and finally "Rich text editor".
- The `note` prop is the description, by reference. A slotted note is copied as text, since a description can't refer to content outside the shadow root. The host's `aria-description`, when set, takes precedence over both.
- Required, readonly, disabled and invalid states are set on the content area with `aria-required`, `aria-readonly`, `aria-disabled` and `aria-invalid`. The invalid state appears after the user interacts with the field.
- The toolbar is a `toolbar` with a single Tab stop. Each command has an accessible name, toggles report `aria-pressed`, and shortcuts are in `aria-keyshortcuts`. A text style or line height select is a button with a menu of options.
- Task checkboxes aren't in the Tab order. Keyboard users check the task the caret is in with Ctrl+Alt+Enter.
- The color and symbol pickers are grids. Arrow keys move between cells, and Home and End go to the first and last. Picking a value closes the picker and returns focus to the text.
- Clicking a `<label>` for the editor moves focus into the text, not to the first toolbar button.
- The editor doesn't change focus when toolbar controls are clicked with the mouse, so the selection is kept.
- Tab leaves a list or code block after Escape, so keyboard users never get stuck. The shortcut list explains this.
- Spellcheck is on by default. Set `spellcheck="false"` to turn it off.
- Still to check: a manual pass with VoiceOver and NVDA, which the automated tests can't cover.
