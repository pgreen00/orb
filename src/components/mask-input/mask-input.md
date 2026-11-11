---
title: 'OrbMaskInput | <orb-mask-input>'
sidebar_label: 'Mask Input'
---

## Usage

`<orb-mask-input>` formats what the user types as they type it, such as a phone number, a date, or a dollar amount. It goes inside an [`<orb-textbox>`](../textbox/), which supplies the label, the note, the border, and the validation message. The mask input itself has no border or label.

Set `mask` to pick a format. The value is the formatted text, and the form submits it under the element's `name`.

::: live-code-demo

```html
<orb-textbox label="Phone" note="US numbers only">
  <orb-mask-input mask="phone" name="phone" required></orb-mask-input>
</orb-textbox>
```

:::

**Manual test:**
- Click into **Phone** and type `5551234567`. The text reads `(555) 123-4567` as you type, with the separators added for you.
- Type a letter. It doesn't appear.

## Built-in Masks

These names work for `mask`. Each one only accepts the characters its format needs, and anything else is dropped as it's typed or pasted.

| Name | Format | Example value | Keyboard |
| --- | --- | --- | --- |
| `phone` | `(###) ###-####` | `(555) 123-4567` | Telephone |
| `zip` | `#####` | `55512` | Number pad |
| `ssn` | `###-##-####`, last four shown | `123-45-6789`, shown as `•••-••-6789` | Number pad |
| `credit-card` | `#### #### #### ####` | `5555 1234 5678 9012` | Number pad |
| `date` | `MM/DD/YYYY` | `03/15/2026` | Number pad |
| `time` | `HH:MM`, 24-hour | `14:30` | Number pad |
| `datetime` | `MM/DD/YYYY HH:MM` | `03/15/2026 14:30` | Number pad |
| `daterange` | `MM/DD/YYYY - MM/DD/YYYY` | `01/01/2026 - 12/31/2026` | Number pad |
| `currency` | `$1,234.56` | `$1,234.56` | Number pad |
| `number` | `1,234,567` | `1,234,567` | Number pad |

::: live-code-demo

```html
<orb-stack>
  <orb-textbox label="Phone">
    <orb-mask-input mask="phone"></orb-mask-input>
  </orb-textbox>
  <orb-textbox label="Date" note="Month, day, year">
    <orb-mask-input mask="date"></orb-mask-input>
  </orb-textbox>
  <orb-textbox label="Time" note="24-hour clock">
    <orb-mask-input mask="time"></orb-mask-input>
  </orb-textbox>
  <orb-textbox label="Amount">
    <orb-mask-input mask="currency"></orb-mask-input>
  </orb-textbox>
  <orb-textbox label="Quantity">
    <orb-mask-input mask="number"></orb-mask-input>
  </orb-textbox>
</orb-stack>
```

:::

Dates and times check each digit as it's typed. A first digit that can't start the value gets a zero in front, so typing `3` for the month gives `03`. A second digit that would make the value impossible is dropped, so `13` for the month stays at `1`. Days go up to 31 whatever the month, so `02/31` is accepted.

Currency is typed from the right, the way a register works. The last two digits are cents, so typing `5` gives `$0.05`, and typing `123456` after that gives `$51,234.56`. The leading zeros aren't part of the value.

`ssn` shows a bullet in place of each of the first five digits, so only the last four can be read on screen. The hidden positions don't change as you type, so a digit is never shown and then hidden. The value and the form still get every digit, and `unmasked` submits them without dashes. Copying or cutting from the field copies the bullets, not the digits. Screen readers read the bullets too, so say in the note what the field expects.

::: live-code-demo

```html
<orb-textbox label="Social security number" note="Nine digits. Only the last four are shown.">
  <orb-mask-input mask="ssn" name="ssn" required></orb-mask-input>
</orb-textbox>
```

:::

**Manual test:**
- In **Date**, type `3`. It reads `03`. Type `1` next, and it reads `03/1`.
- In **Amount**, type `5`. It reads `$0.05`. Type `1`, and it reads `$0.51`.
- In **Time**, type `2`, `5`. The second digit `5` is dropped, since the hour can't be `25`.
- In **Social security number**, type `123456789`. It reads `•••-••-6789`, and only the last four digits ever show.

## Patterns

Any `mask` value that isn't a built-in name is read as a pattern. Each `#` takes a digit, each `A` takes a letter, and each `*` takes a letter or a digit. Any other character is a separator that's added for you. A backslash makes the next character a literal, so `\#` is a `#` in the text.

::: live-code-demo

```html
<orb-stack>
  <orb-textbox label="Plate" note="Three letters, a space, then three digits">
    <orb-mask-input mask="AAA ###"></orb-mask-input>
  </orb-textbox>
  <orb-textbox label="Item code" note="Letter, digit, then any two characters">
    <orb-mask-input mask="A#**"></orb-mask-input>
  </orb-textbox>
</orb-stack>
```

:::

Separators appear only once something is typed after them. With `(###) ###-####`, typing `555` shows `(555`, and the `) ` appears when the next digit arrives. That way, Backspace never gets stuck behind a separator. Separators are never part of the value.

## Custom Masks

Set `mask` to an object to write your own rules. Two functions are required:

- `extract(text)` keeps the characters that make up the value and drops the rest.
- `format(raw)` builds the display from those characters, and adds the separators.

The optional functions are `complete(raw)`, which says whether the value is finished, `guide(raw, placeholder)`, which builds the rest of the mask for the guide, `unmask(raw)`, which returns the value that `unmasked` submits, and `conceal(display)`, which returns the text to show in place of the display, the way `ssn` hides digits. `conceal` must return text of the same length as the display.

::: live-code-demo

```html
<orb-textbox label="Hex color" note="Six hex digits, such as 1a2b3c">
  <orb-mask-input id="hex-mask" name="color"></orb-mask-input>
</orb-textbox>
```

```javascript
await customElements.whenDefined('orb-mask-input');
const hex = document.querySelector('#hex-mask');
hex.mask = {
  extract: (text) => text.replace(/[^0-9a-f]/gi, '').toLowerCase(),
  format: (raw) => (raw ? `#${raw.slice(0, 6)}` : ''),
  complete: (raw) => raw.length === 6,
  inputMode: 'text',
};
```

:::

`extract` and `format` have to agree. `extract(format(raw))` must give `raw` back, so the value stays the same however often the display is rebuilt. Setting `mask` after the element loads re-formats the current value.

### Registering Masks

To use the same mask in several places, register it by name with `registerMask(name, definition)` or `registerMasks({...})`, both exported from the package. A registered name takes precedence over a built-in name of the same spelling.

```js
import { registerMask } from 'orb-style';

registerMask('plate', {
  extract: (text) => text.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
  format: (raw) => (raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3, 6)}` : raw),
});
```

Then use `<orb-mask-input mask="plate">`.

Passing a definition registers it eagerly, so it ships in whatever bundle the `registerMask` call lands in. That's the right choice for small masks. For a heavier one, such as a mask that validates against a large table, register `{ load: () => import(...) }` instead. The module is code-split and fetched the first time a field uses the mask, and every field using it shares one load. The module can export the definition as its default export or be the definition itself.

```js
// Bundled eagerly. It's a few lines.
registerMask('plate', { extract, format });

// Code-split. The module is only downloaded if a field uses the mask.
registerMask('iban', { load: () => import('./masks/iban.js') });
```

While a lazy mask loads, the field shows its value but can't be edited, and it reports `aria-busy`. Once the mask arrives, the value is formatted with it. If the module fails to load, the error is logged and the field falls back to plain text.

Fields that are already on the page when a mask is registered pick it up, so registering from a deferred module works. Registering a name again replaces the mask everywhere it's used, and the fields re-format their values with it.

## Value

`value` is the formatted text, such as `(555) 123-4567`. Setting it accepts formatted text or raw characters, such as `5551234567`, and formats the result. The `value` property is updated as the user types, and setting it from code doesn't fire an `input` event.

Add `unmasked` to submit the unformatted value under `name` instead. Read `value` for the display, and use `unmasked` when the server expects digits only.

::: live-code-demo

```html
<form id="value-form">
  <orb-stack>
    <orb-textbox label="Shown as typed">
      <orb-mask-input name="shown" mask="phone" value="5551234567"></orb-mask-input>
    </orb-textbox>
    <orb-textbox label="Submitted unmasked">
      <orb-mask-input name="digits" mask="phone" value="5551234567" unmasked></orb-mask-input>
    </orb-textbox>
    <orb-button type="submit">Show submitted values</orb-button>
    <pre id="value-output"></pre>
  </orb-stack>
</form>
```

```javascript
const form = document.querySelector('#value-form');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  document.querySelector('#value-output').textContent = JSON.stringify(
    Object.fromEntries(new FormData(form)),
    null,
    2,
  );
});
```

:::

**Manual test:**
- Click **Show submitted values**. `shown` is `(555) 123-4567`, and `digits` is `5551234567`.

## Guide and Placeholder

The guide shows the rest of the mask in the positions that aren't filled yet, such as `(___) ___-____`. The guide's characters are the `placeholder-char`, which is `_` by default.

Set `guide` to choose when it shows:

| Value | Shows the guide |
| --- | --- |
| `focus` default | While the field has focus |
| `always` | Always, even when the field is empty and unfocused |
| `off` | Never |

`placeholder` is text shown in an empty field when the guide isn't showing, so the guide and the placeholder never overlap. Style the guide with the `--guide-color` custom property.

::: live-code-demo

```html
<orb-stack>
  <orb-textbox label="Guide on focus" note="The default">
    <orb-mask-input mask="phone"></orb-mask-input>
  </orb-textbox>
  <orb-textbox label="Guide always">
    <orb-mask-input mask="phone" guide="always" placeholder-char="·"></orb-mask-input>
  </orb-textbox>
  <orb-textbox label="No guide">
    <orb-mask-input mask="phone" guide="off" placeholder="(555) 555-5555"></orb-mask-input>
  </orb-textbox>
</orb-stack>
```

:::

**Manual test:**
- **Guide on focus** shows nothing until you click in. Then it shows `(___) ___-____`.
- **Guide always** shows `(···) ···-····` before you click in.
- **No guide** shows its placeholder while empty.

## Validation

Add `required` to require a value before submission. A partly filled field is invalid too, since the mask's value isn't finished. Messages come from the browser in the user's language, and `<orb-textbox>` shows them below the box after the user leaves the field or tries to submit.

::: live-code-demo

```html
<form id="validation-form">
  <orb-stack>
    <orb-textbox label="Phone" note="All ten digits">
      <orb-mask-input name="phone" mask="phone" required></orb-mask-input>
    </orb-textbox>
    <orb-button type="submit">Continue</orb-button>
    <p id="validation-output" role="status"></p>
  </orb-stack>
</form>
```

```javascript
const form = document.querySelector('#validation-form');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (form.checkValidity()) {
    document.querySelector('#validation-output').textContent = 'Phone accepted.';
  }
});
```

:::

Use `setCustomValidity()` for rules the mask can't express, such as a number that's already registered. Pass an empty string to clear the message.

**Manual test:**
- Click **Continue** with the field empty. The browser stops the submit, and the field shows a message after you've left it.
- Type `555` and leave the field. The message asks you to finish the number.
- Finish the number and click **Continue**. The output reads "Phone accepted."

## Events

The element fires three events:

- `input` fires on every change to the text, after it's formatted. It's an `InputEvent` that bubbles and crosses shadow boundaries, and its `inputType` says what caused it, such as `insertText`. It doesn't fire for a change made from code.
- `change` fires when the field loses focus after its value changed.
- `orbComplete` fires once each time the value becomes complete, with the formatted value as its `detail`. It can't be cancelled.

::: live-code-demo

```html
<orb-textbox label="Card number" note="Sixteen digits">
  <orb-mask-input id="card-input" mask="credit-card"></orb-mask-input>
</orb-textbox>
<p id="card-log" role="status">Type a card number.</p>
```

```javascript
const card = document.querySelector('#card-input');
const log = document.querySelector('#card-log');
let changes = 0;

card.addEventListener('input', () => {
  changes++;
});
card.addEventListener('orbComplete', (event) => {
  log.textContent = `Complete after ${changes} changes: ${event.detail}`;
});
```

:::

**Manual test:**
- Type sixteen digits. The log reads "Complete after 16 changes" with the grouped number.
- Delete one digit and type it again. The log updates, since the value became complete again.

## Keyboard and Editing

| Key | Behavior |
| --- | --- |
| Type | Adds the character at the caret. Characters the mask doesn't take are ignored. |
| Backspace | Deletes the character before the caret, skipping any separator in the way |
| Delete | Deletes the character after the caret, skipping any separator in the way |
| Option/Alt + Backspace | Deletes the group of characters before the caret, up to the previous separator |
| Enter | Submits the form, as in a native input |
| Tab | Moves to the next control, and selects everything when you tab in |
| Cmd/Ctrl + Z | Undoes the last change. Typing in a row counts as one change, if there's a pause of about a second between changes. |
| Cmd/Ctrl + Shift + Z | Redoes |

Pasted text is filtered the same way as typed text. `call 123-456-7890` pasted into `phone` gives `(123) 456-7890`.

If a change is made when the mask is full, such as typing in the middle of a complete number, the last character is pushed out.

Methods: `select()` focuses the field and selects its text. `setSelectionRange(start, end)` selects characters of the formatted text. `setCustomValidity(message)` and `resetValidity()` work as they do on the other form controls.

## Forms

The value is submitted under `name`, and `form.reset()` puts back the `value` the element started with, or `default-value` if you set it.

::: live-code-demo

```html
<form id="reset-form">
  <orb-stack>
    <orb-textbox label="Phone">
      <orb-mask-input name="phone" mask="phone" value="5551234567"></orb-mask-input>
    </orb-textbox>
    <orb-stack mode="row">
      <orb-button type="submit">Save</orb-button>
      <orb-button type="reset" fill="outline">Reset</orb-button>
    </orb-stack>
    <p id="reset-output" role="status">Not saved yet.</p>
  </orb-stack>
</form>
```

```javascript
const form = document.querySelector('#reset-form');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const phone = new FormData(form).get('phone');
  document.querySelector('#reset-output').textContent = `Saved ${phone}.`;
});
```

:::

**Manual test:**
- Delete a few digits, then click **Reset**. The field goes back to `(555) 123-4567`.

## Accessibility

The editable text is the accessible textbox. It's named by the label of the `<orb-textbox>` around it, and its note is read after the label. The host element doesn't have a role of its own, so the name isn't announced twice. The guide and placeholder are hidden from screen readers, so a screen reader reads only the formatted text. With a mask that conceals characters, such as `ssn`, the screen reader reads what's on screen, bullets included.

**Autofill isn't available.** Browsers offer autofill for native inputs, and this element is a formatted text field instead, so phone numbers, addresses, and card numbers won't be filled in by the browser. Use a native `<input>` where autofill matters more than formatting.

### Manual test checklist

- [ ] The field is named by its `<orb-textbox>` label, and its note is read after it.
- [ ] The guide and placeholder aren't read by a screen reader.
- [ ] Each change is announced as the formatted text, and invalid state is announced when it appears.
- [ ] With Tab, the whole value is selected, so typing replaces it.
- [ ] The guide's color is readable in light and dark mode.
- [ ] In forced colors mode, the text and the guide are still visible.
- [ ] Pasting text that contains separators keeps only the characters the mask takes.
