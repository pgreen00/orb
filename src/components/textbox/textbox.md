---
title: "OrbTextbox | <orb-textbox>"
sidebar_label: "Textbox"
---

## Usage

`<orb-textbox>` wraps a native `<input>`, `<select>`, or `<textarea>` that you write yourself. It adds a label, a note, a border, validation messages, and room for buttons. The control stays a real form control, so everything the browser already does keeps working: form submission, autofill, validation, the right mobile keyboard, undo, spellcheck, and screen reader support.

That's the point of this page. Native form controls can do almost everything a form needs, and many apps rebuild those features in JavaScript or a framework without needing to. Most of the sections below are about what the platform gives you for free, with `<orb-textbox>` adding the look.

::: live-code-demo

```html
<orb-textbox label="Full name" note="As it appears on your ID">
  <input name="name" autocomplete="name" required>
</orb-textbox>
```

:::

**Manual test:**
- The label shows above the box and the note below it.
- Click anywhere in the box. The input takes focus and the border turns the focus color.
- Type, then clear the field and click away. A "fill out this field" message shows below the box and the border turns red. The exact wording comes from your browser.

## Labels and Notes

Set `label` and `note` for plain text. For markup, put an `<orb-label>` and an `<orb-note>` inside instead. Either way, the label names the control and the note describes it for screen readers.

`<orb-label required>` adds an asterisk. It's only visual, so also set `required` on the control so the browser enforces it.

::: live-code-demo

```html
<orb-stack>
  <orb-textbox label="Email" note="We'll only use this for receipts">
    <input type="email" name="email" autocomplete="email">
  </orb-textbox>
  <orb-textbox>
    <orb-label required>Username</orb-label>
    <input name="username" autocomplete="username" required>
    <orb-note>Letters and numbers only. <a href="#usernames">Why?</a></orb-note>
  </orb-textbox>
</orb-stack>
```

:::

**Manual test:**
- **Username** has a red asterisk, and its note includes a link.
- With a screen reader, each field is announced with its label, followed by its note.

## Inputs

### Input Types

The `type` attribute does a lot of work. It picks the mobile keyboard, adds built-in validation, and some types come with a picker. Use the most specific type that fits.

| Type | What the browser gives you |
| --- | --- |
| `email` | An email keyboard, and a check that the value looks like an address. Add `multiple` to allow a comma-separated list. |
| `url` | A URL keyboard, and a check that the value is an absolute URL. |
| `tel` | A phone keypad. There's no format check, since phone formats vary, so add `pattern` if you need one. |
| `number` | A numeric keyboard, `min`, `max`, and `step` checks, and `valueAsNumber` to read the value as a number. |
| `search` | A search keyboard, and in most browsers a clear button and Escape to clear. |
| `password` | Hidden characters and password manager support. `<orb-textbox>` adds a show/hide button. |
| `date`, `time`, `datetime-local` | A native picker, `min` and `max` checks, and `valueAsNumber`. `date` and `time` also have `valueAsDate`. The value is always ISO, such as `2026-10-29`, whatever the display format. |
| `month`, `week` | A month or week picker, but not in every browser. Where they aren't supported, they fall back to a plain text field. |

For ranges, colors, and files, use [`<orb-range>`](../range/) and [`<orb-file-input>`](../file-input/).

::: live-code-demo

```html
<orb-stack>
  <orb-textbox label="Email">
    <input type="email" placeholder="you@example.com">
  </orb-textbox>
  <orb-textbox label="Website">
    <input type="url" placeholder="https://">
  </orb-textbox>
  <orb-textbox label="Phone">
    <input type="tel" autocomplete="tel">
  </orb-textbox>
  <orb-textbox label="Quantity">
    <input type="number" min="1" max="10" value="1">
  </orb-textbox>
  <orb-textbox label="Search">
    <input type="search" placeholder="Search birds">
  </orb-textbox>
  <orb-textbox label="Password">
    <input type="password" autocomplete="current-password">
  </orb-textbox>
  <orb-stack mode="row">
    <orb-textbox label="Date">
      <input type="date">
    </orb-textbox>
    <orb-textbox label="Time">
      <input type="time">
    </orb-textbox>
    <orb-textbox label="Date and time">
      <input type="datetime-local">
    </orb-textbox>
  </orb-stack>
</orb-stack>
```

:::

**Manual test:**
- Type `hello` in **Email** and click away. A message asks for an `@`.
- Type `example.com` in **Website** and click away. A message asks for a full URL.
- In **Quantity**, press Up and Down to step the number. Type `20` and click away. A message says the value must be 10 or less.
- Type in **Search**, then press Escape. The field clears in most browsers.
- Click the eye button in **Password**. The characters show, and clicking again hides them.
- The date and time fields open a native picker.
- On a phone, each field opens a different keyboard.

### Keyboards and Autofill

A few attributes make forms much faster to fill out, especially on phones:

| Attribute | What it does |
| --- | --- |
| `autocomplete` | Tells the browser and password manager what the field is, such as `name`, `email`, `street-address`, `postal-code`, `new-password`, or `one-time-code`. Autofill then fills it correctly. |
| `inputmode` | Picks the on-screen keyboard without changing validation, such as `numeric` for a code that's digits but isn't a number. |
| `enterkeyhint` | Labels the Enter key on mobile keyboards, such as `next`, `search`, `send`, or `done`. |
| `autocapitalize` | Controls automatic capitals on mobile, such as `words` for names or `off` for usernames. |
| `spellcheck` | Turns spellchecking off for things like codes and usernames. |

::: live-code-demo

```html
<orb-stack>
  <orb-textbox label="Verification code" note="Sent to your phone">
    <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" enterkeyhint="done" spellcheck="false">
  </orb-textbox>
  <orb-textbox label="Street address">
    <input name="address" autocomplete="street-address" autocapitalize="words" enterkeyhint="next">
  </orb-textbox>
  <orb-textbox label="ZIP code">
    <input name="zip" autocomplete="postal-code" inputmode="numeric" enterkeyhint="next">
  </orb-textbox>
</orb-stack>
```

:::

**Manual test:**
- On a phone, **Verification code** opens a number pad, and the Enter key reads "Done". iOS and Android offer the code from a text message above the keyboard.
- **Street address** and **ZIP code** offer saved addresses from autofill.
- **Street address** capitalizes each word on a phone.

### Editable Combobox

A `<datalist>` turns an input into a combobox. The browser suggests the list's options as you type, and you can still type anything. Link them by giving the datalist an `id` and the input a matching `list`. The datalist can go inside the textbox, since it's never displayed itself.

::: live-code-demo

```html
<orb-textbox label="Favorite bird" note="Pick one or type your own">
  <input name="bird" list="bird-list">
  <datalist id="bird-list">
    <option value="American Robin"></option>
    <option value="Barn Owl"></option>
    <option value="Black-capped Chickadee"></option>
    <option value="Steller's Jay"></option>
    <option value="Varied Thrush"></option>
  </datalist>
</orb-textbox>
```

:::

**Manual test:**
- Click the field or start typing. A list of birds appears. Some browsers only show it once you type, or show an arrow to open it.
- Type `th`. The list narrows to **Varied Thrush**.
- Type a bird that isn't in the list, such as `Osprey`. The value is accepted.
- Use Down and Enter to pick a suggestion with the keyboard.

To accept only the listed options, check the value with `setCustomValidity()`, covered under [Custom Messages](#custom-messages). The browser draws the suggestion list, so its look can't be styled.

::: live-code-demo

```html
<orb-textbox label="State" note="Pick a state from the list">
  <input id="state-input" name="state" list="state-list" required autocomplete="off">
  <datalist id="state-list">
    <option value="Idaho"></option>
    <option value="Oregon"></option>
    <option value="Washington"></option>
  </datalist>
</orb-textbox>
```

```javascript
const input = document.querySelector("#state-input");
input.addEventListener("input", () => {
  const options = [...input.list.options].map((option) => option.value);
  const listed = !input.value || options.includes(input.value);
  input.setCustomValidity(listed ? "" : "Pick a state from the list");
});
```

:::

**Manual test:**
- Type `Ore`, pick **Oregon**, and click away. No message shows.
- Type `Nevada` and click away. The message "Pick a state from the list" shows.
- Clear the field and click away. The browser's "fill out this field" message shows, since it's `required`.

## Selects

A `<select>` gives you a native picker that works with the keyboard, screen readers, and phones. Group options with `<optgroup>`, and disable options you want to show but not allow.

For a placeholder, start with an empty option. With `required`, the browser won't accept the empty choice. Add `hidden` to keep it out of the list once something's picked.

::: live-code-demo

```html
<orb-textbox label="Feeder type">
  <select name="feeder" required>
    <option value="" hidden>Choose a feeder</option>
    <optgroup label="Seed">
      <option value="tube">Tube</option>
      <option value="hopper">Hopper</option>
      <option value="platform">Platform</option>
    </optgroup>
    <optgroup label="Other">
      <option value="suet">Suet cage</option>
      <option value="nectar">Nectar</option>
      <option value="mealworm" disabled>Mealworm (sold out)</option>
    </optgroup>
  </select>
</orb-textbox>
```

:::

**Manual test:**
- The select shows "Choose a feeder" at first, and the option doesn't appear in the open list.
- The options are grouped under **Seed** and **Other**. **Mealworm** is dimmed and can't be picked.
- Focus the select and type `p`. **Platform** is selected without opening the list.
- Focus the select, then click away without picking. No message shows. Submitting a form with it empty would show one.

## Textareas

A `textarea` grows as you type, up to `--textarea-max-height` (15em by default), and then scrolls. It has no resize handle.

::: live-code-demo

```html
<orb-textbox label="Notes">
  <textarea name="notes" placeholder="Type a few lines…"></textarea>
</orb-textbox>
```

:::

**Manual test:**
- The box starts one line tall, with no resize handle in the corner.
- Type several lines. The box grows with each line.
- Keep typing past about ten lines. The box stops growing and the text scrolls.
- Delete the text. The box shrinks back to one line.

### Character Limits

`maxlength` stops typing at a limit, for inputs and textareas. Pair it with a counter in a utility slot so people can see how much room is left. `minlength` sets a minimum, which is checked when the field is validated.

::: live-code-demo

```html
<orb-textbox label="Field notes">
  <textarea id="notes-input" name="field-notes" maxlength="140" minlength="10"></textarea>
  <span slot="bottom-end" id="notes-count">0 / 140</span>
</orb-textbox>
```

```javascript
const input = document.querySelector("#notes-input");
const count = document.querySelector("#notes-count");
input.addEventListener("input", () => {
  count.textContent = `${input.value.length} / ${input.maxLength}`;
});
```

:::

**Manual test:**
- Type, and the counter updates with each character.
- At 140 characters, typing stops. Pasting a longer text is cut off at the limit.
- Type a few characters, fewer than 10, and click away. A message asks for at least 10 characters.

## Slots

### Start and After

Put content in the `start` slot to show it inside the border, before the control, such as an icon. Put content in the `after` slot to show it outside the border, after the box, such as a button.

::: live-code-demo

```html
<orb-textbox label="Search sightings">
  <iconify-icon slot="start" icon="mdi:magnify" aria-hidden="true"></iconify-icon>
  <input type="search" name="q" enterkeyhint="search">
  <orb-button slot="after">Search</orb-button>
</orb-textbox>
```

:::

**Manual test:**
- The magnifying glass shows inside the box, before the text.
- The **Search** button shows outside the box, on the same line.

### Utility Slots

Put content in `top-start`, `top-end`, `bottom-start`, or `bottom-end` to show it inside the border, above or below the control. Start content lines up at the start of the row, and end content at the end. Rows without content aren't shown. They work with inputs and selects too, but they're mostly for textareas, such as a message composer.

::: live-code-demo

```html
<orb-textbox id="composer">
  <orb-pill slot="top-start" removable>design-notes.pdf</orb-pill>
  <orb-pill slot="top-start" removable>mixer.png</orb-pill>
  <textarea aria-label="Message" placeholder="How do I write the reverse animation?"></textarea>
  <orb-button slot="bottom-start" class="icon-only" fill="clear" size="sm" aria-label="Attach a file">
    <iconify-icon icon="mdi:plus" aria-hidden="true"></iconify-icon>
  </orb-button>
  <orb-button slot="bottom-start" class="icon-only" fill="clear" size="sm" aria-label="Tools">
    <iconify-icon icon="mdi:tune-variant" aria-hidden="true"></iconify-icon>
  </orb-button>
  <orb-button slot="bottom-end" fill="clear" size="sm">Opus 5.5</orb-button>
  <orb-button slot="bottom-end" class="icon-only" fill="clear" size="sm" aria-label="Dictate">
    <iconify-icon icon="mdi:microphone" aria-hidden="true"></iconify-icon>
  </orb-button>
  <orb-button slot="bottom-end" class="icon-only" size="sm" aria-label="Send">
    <iconify-icon icon="mdi:arrow-up" aria-hidden="true"></iconify-icon>
  </orb-button>
</orb-textbox>
```

:::

**Manual test:**
- The two files show above the textarea, and the buttons show below it, all inside the border.
- The **+** and tools buttons are at the start of the bottom row, and the model, microphone, and send buttons are at the end.
- Click the empty space between the buttons, or around the textarea. The textarea takes focus. Clicking a button doesn't move focus to the textarea.
- Type several lines. The textarea grows, and the button rows stay above and below it.
- Tab through the box. Focus moves through the files, the textarea, then the buttons, in the order they're written.
- The border turns the focus color while anything inside has focus.

With an input, the rows work the same way, such as tags above a search field.

::: live-code-demo

```html
<orb-textbox label="Filters">
  <orb-pill slot="top-start" removable>Birds</orb-pill>
  <orb-pill slot="top-start" removable>Washington</orb-pill>
  <span slot="top-end">2 filters</span>
  <input type="search" placeholder="Add a filter">
</orb-textbox>
```

:::

**Manual test:**
- The tags show above the input, with "2 filters" at the end of the row.
- The input stays one line tall, and its label stays above the box.

## Validation

The browser validates form controls on its own. You describe the rules with attributes, and the browser checks them, blocks submission, and writes a message in the user's language. `<orb-textbox>` shows that message below the box and turns the border red.

The message only shows once someone has interacted with the field, by typing in it and leaving, or trying to submit the form. Fields nobody has touched stay quiet, which is the `:user-invalid` behavior from CSS.

### Built-in Rules

| Attribute | Checks | Works with |
| --- | --- | --- |
| `required` | The field isn't empty | All controls |
| `minlength`, `maxlength` | The text length | Text inputs, textareas |
| `min`, `max` | The value's range | `number`, dates and times |
| `step` | The value is a multiple of the step, counting from `min` | `number`, dates and times |
| `pattern` | The whole value matches a regular expression | Text inputs |
| `type` | The value fits the type, such as an email address | `email`, `url`, `number` |

`pattern` must match the whole value, so `[A-Z]{3}` means exactly three capital letters. Say what the pattern expects in the field's note, since the browser's message for it is generic.

::: live-code-demo

```html
<form id="band-form">
  <orb-stack>
    <orb-textbox label="Band code" note="Exactly 3 capital letters, such as AMR">
      <input name="band" required pattern="[A-Z]{3}" autocapitalize="characters" spellcheck="false">
    </orb-textbox>
    <orb-textbox label="Count">
      <input type="number" name="count" required min="1" max="500" step="1">
    </orb-textbox>
    <orb-textbox label="Seen on">
      <input type="date" name="date" required min="2026-01-01" max="2026-12-31">
    </orb-textbox>
    <orb-button type="submit">Save sighting</orb-button>
    <p id="band-output" role="status">Not saved yet.</p>
  </orb-stack>
</form>
```

```javascript
const form = document.querySelector("#band-form");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#band-output").textContent = "Saved.";
});
```

:::

**Manual test:**
- Click **Save sighting** with the form empty. The browser stops the submit, focuses the first field, and every field shows a message.
- Type `amr` in **Band code** and click away. A message asks you to match the format. Change it to `AMR`, and the message clears as you type.
- Type `2.5` in **Count** and click away. A message says the value isn't valid, because of `step="1"`.
- Pick a date in 2025 and click away. A message says it must be 2026-01-01 or later.
- Fill every field correctly and click **Save sighting**. The status reads "Saved."

### Custom Messages

When a rule can't be written as an attribute, set it in JavaScript with `setCustomValidity()`. Pass a message to mark the control invalid, or an empty string to mark it valid. The browser treats a custom message like any other failed rule: it blocks submission, and `<orb-textbox>` shows the message.

Set it every time the value changes, since it stays until you clear it. A common case is checking that two fields match.

::: live-code-demo

```html
<form id="signup-form">
  <orb-stack>
    <orb-textbox label="Password" note="At least 8 characters">
      <input id="signup-password" type="password" name="password" autocomplete="new-password" required minlength="8">
    </orb-textbox>
    <orb-textbox label="Confirm password">
      <input id="signup-confirm" type="password" autocomplete="new-password" required>
    </orb-textbox>
    <orb-button type="submit">Create account</orb-button>
    <p id="signup-output" role="status"></p>
  </orb-stack>
</form>
```

```javascript
const form = document.querySelector("#signup-form");
const password = document.querySelector("#signup-password");
const confirm = document.querySelector("#signup-confirm");

const checkMatch = () => {
  const matches = !confirm.value || confirm.value === password.value;
  confirm.setCustomValidity(matches ? "" : "Passwords don't match");
};
password.addEventListener("input", checkMatch);
confirm.addEventListener("input", checkMatch);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#signup-output").textContent = "Account created.";
});
```

:::

**Manual test:**
- Type `birdwatch` in both fields and click **Create account**. The status reads "Account created."
- Change **Confirm password** to `birdwatcher` and click away. "Passwords don't match" shows below it.
- Click **Create account**. The submit is blocked and focus moves to **Confirm password**.
- Fix the confirmation. The message clears as you type.

Server checks work the same way. Set `debounce` so the check only runs once the user pauses, and run it from [`orbValueChange`](#debounced-value-changes). Set the message when the answer comes back, then call `checkValidity()`. The answer often arrives after the user has moved on to the next field, and without that call the message wouldn't show until they came back and typed again. Like every message, it waits until the user has left the field once, so nobody gets an error while they're still typing.

::: live-code-demo

```html
<orb-textbox id="username-box" label="Username" note="Try admin, orb, or birds, which are taken" debounce="300">
  <input id="username-input" name="username" autocomplete="username" required>
  <span slot="bottom-end" id="username-status" aria-live="polite"></span>
</orb-textbox>
```

```javascript
const box = document.querySelector("#username-box");
const input = document.querySelector("#username-input");
const status = document.querySelector("#username-status");
const taken = ["admin", "orb", "birds"];

// Stands in for a request to your server.
const isTaken = (name) =>
  new Promise((resolve) => setTimeout(() => resolve(taken.includes(name.toLowerCase())), 400));

// On every keystroke, clear the old answer so it can't block the form.
input.addEventListener("input", () => {
  input.setCustomValidity("");
  status.textContent = "";
});

// Once the user pauses, check with the server.
box.addEventListener("orbValueChange", async (event) => {
  const name = event.detail;
  if (!name) return;
  status.textContent = "Checking…";
  const unavailable = await isTaken(name);
  if (name !== input.value) return; // The user kept typing.
  input.setCustomValidity(unavailable ? "That username is taken" : "");
  status.textContent = unavailable ? "" : "Available";
  input.checkValidity();
});
```

:::

**Manual test:**
- Type `owl`. After a moment, the counter row reads "Checking…", then "Available".
- Type `admin` and press Tab right away. After a moment, "That username is taken" shows below the box and the border turns red, even though focus has moved on.
- Click back in, type `admin2`, and wait. The message clears and the status reads "Available".
- Type quickly. Only one check runs, after you pause.

### Reading Validity

Every control has a `validity` object that says which rule failed, and a `validationMessage` with the browser's text. Use them to write your own messages for each case, or to decide what to show.

::: live-code-demo

```html
<orb-textbox label="Band code" note="3 to 6 capital letters">
  <input id="code-input" required pattern="[A-Z]{3,6}" maxlength="6">
</orb-textbox>
<pre id="code-validity" style="margin-top: 1rem;"></pre>
```

```javascript
const input = document.querySelector("#code-input");
const output = document.querySelector("#code-validity");
const flags = [
  "valueMissing", "typeMismatch", "patternMismatch", "tooLong", "tooShort",
  "rangeUnderflow", "rangeOverflow", "stepMismatch", "badInput", "customError",
];
const show = () => {
  const failing = flags.filter((flag) => input.validity[flag]);
  output.textContent = input.validity.valid
    ? "valid: true"
    : `valid: false\nfailing: ${failing.join(", ")}\nmessage: ${input.validationMessage}`;
};
input.addEventListener("input", show);
show();
```

:::

**Manual test:**
- At first, the output shows `valueMissing`, since the field is required and empty.
- Type `ab`. It shows `patternMismatch`.
- Type `ABC`. It shows `valid: true`.

### Validating on Your Own Terms

Add `novalidate` to a form to turn off the browser's popup and handle submission yourself, while keeping all the rules. In the submit handler, call `form.checkValidity()`. It returns whether every field is valid, and it shows each field's message below its box. `form.reportValidity()` does the same and also shows the browser's popup.

The `:user-invalid` and `:invalid` CSS pseudo-classes match invalid controls, if you want to style things yourself.

::: live-code-demo

```html
<form id="summary-form" novalidate>
  <orb-stack>
    <orb-textbox label="Email">
      <input type="email" name="email" required autocomplete="email">
    </orb-textbox>
    <orb-textbox label="Age">
      <input type="number" name="age" required min="13" max="120">
    </orb-textbox>
    <orb-button type="submit">Join the club</orb-button>
    <div id="summary-errors" role="alert"></div>
  </orb-stack>
</form>
```

```javascript
const form = document.querySelector("#summary-form");
const summary = document.querySelector("#summary-errors");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (form.checkValidity()) {
    summary.textContent = "Welcome to the club.";
    return;
  }
  const invalid = [...form.elements].filter((el) => el.willValidate && !el.validity.valid);
  summary.textContent = `Fix ${invalid.length} field${invalid.length === 1 ? "" : "s"} before joining.`;
  invalid[0].focus();
});
```

:::

**Manual test:**
- Click **Join the club** with the form empty. No browser popup shows. Instead, both fields show a message, the summary reads "Fix 2 fields before joining.", and focus moves to **Email**.
- Fill in both fields correctly and submit. The summary reads "Welcome to the club."
- A screen reader announces the summary when it changes.

## Forms

### Reading Values

You don't need to track each field in JavaScript. Give every control a `name`, and `new FormData(form)` collects them all when you need them. `Object.fromEntries()` turns that into a plain object.

For typed values, read `valueAsNumber` from number inputs and `valueAsDate` from date inputs. A reset button sets every field back to the value it started with.

::: live-code-demo

```html
<form id="trip-form">
  <orb-stack>
    <orb-textbox label="Trip name">
      <input name="trip" value="Spring migration">
    </orb-textbox>
    <orb-textbox label="People">
      <input id="trip-people" type="number" name="people" value="4" min="1">
    </orb-textbox>
    <orb-textbox label="Start date">
      <input id="trip-date" type="date" name="start" value="2026-04-12">
    </orb-textbox>
    <orb-textbox label="Region">
      <select name="region">
        <option>Puget Sound</option>
        <option selected>Olympic Peninsula</option>
        <option>Columbia Basin</option>
      </select>
    </orb-textbox>
    <orb-stack mode="row">
      <orb-button type="submit">Show values</orb-button>
      <orb-button type="reset" fill="outline">Reset</orb-button>
    </orb-stack>
    <pre id="trip-output"></pre>
  </orb-stack>
</form>
```

```javascript
const form = document.querySelector("#trip-form");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const people = document.querySelector("#trip-people").valueAsNumber;
  const start = document.querySelector("#trip-date").valueAsDate;
  document.querySelector("#trip-output").textContent =
    JSON.stringify(values, null, 2) +
    `\npeople as a number: ${people}\nstart as a date: ${start?.toDateString()}`;
});
```

:::

**Manual test:**
- Click **Show values**. The output lists every field by name, with all values as strings.
- The last two lines show the people count as a number and the start date as a date.
- Change the fields, then click **Reset**. Every field goes back to its starting value.

Listen for `input` to react on every keystroke, and `change` to react once the user commits a value, such as leaving the field or picking an option.

### Debounced Value Changes

For work that shouldn't run on every keystroke, such as searching as you type or checking with a server, set `debounce` to a number of milliseconds and listen for `orbValueChange` on the textbox. It fires with the control's value once the user stops changing it for that long. Without `debounce`, it fires on every change.

The native `input` event is never delayed, so validation, counters, and framework bindings like `v-model` stay instant. Only listeners on `orbValueChange` are debounced. It doesn't bubble, so listen on the textbox itself. It only fires for changes the user makes, not for values set from a script or a form reset.

::: live-code-demo

```html
<orb-textbox id="bird-search" label="Search birds" debounce="400">
  <iconify-icon slot="start" icon="mdi:magnify" aria-hidden="true"></iconify-icon>
  <input type="search" name="q" enterkeyhint="search" autocomplete="off">
</orb-textbox>
<p id="bird-results" role="status">Type to search.</p>
<p id="bird-searches">Searches run: 0</p>
```

```javascript
const birds = ["American Robin", "Barn Owl", "Bald Eagle", "Black-capped Chickadee", "Great Blue Heron", "Steller's Jay", "Varied Thrush"];
const results = document.querySelector("#bird-results");
const counter = document.querySelector("#bird-searches");
let searches = 0;

document.querySelector("#bird-search").addEventListener("orbValueChange", (event) => {
  const query = event.detail.trim().toLowerCase();
  counter.textContent = `Searches run: ${++searches}`;
  const matches = birds.filter((bird) => bird.toLowerCase().includes(query));
  results.textContent = !query
    ? "Type to search."
    : matches.length ? matches.join(", ") : "No birds found.";
});
```

:::

**Manual test:**
- Type `owl` quickly. The results update once you stop, and "Searches run" goes up by one, not three.
- Type slowly, pausing longer than the debounce between letters. A search runs after each pause.
- Clear the field with the search's clear button or by deleting. The results reset after a short pause.

### Disabling a Group

Wrap related fields in a `<fieldset>` and set `disabled` on it to disable them all at once. Disabled fields can't be focused or edited, and they're left out of `FormData` and validation.

::: live-code-demo

```html
<form id="shipping-form">
  <label style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem;">
    <input type="checkbox" id="same-address" checked>
    Ship to my billing address
  </label>
  <fieldset id="shipping-fields" disabled style="border: none; padding: 0; margin: 0;">
    <legend class="orb-visually-hidden">Shipping address</legend>
    <orb-stack>
      <orb-textbox label="Shipping street">
        <input name="ship-street" autocomplete="shipping street-address" required>
      </orb-textbox>
      <orb-textbox label="Shipping ZIP code">
        <input name="ship-zip" autocomplete="shipping postal-code" inputmode="numeric" required>
      </orb-textbox>
    </orb-stack>
  </fieldset>
</form>
```

```javascript
const checkbox = document.querySelector("#same-address");
const fields = document.querySelector("#shipping-fields");
checkbox.addEventListener("change", () => {
  fields.disabled = checkbox.checked;
});
```

:::

**Manual test:**
- With the box checked, the shipping fields can't be clicked into or reached with Tab.
- Uncheck the box. Both fields can be edited.

A control doesn't have to be inside its form. Give the form an `id` and the control a matching `form` attribute, and it's submitted with that form wherever it is on the page.

## Accessibility

Most of the accessibility comes from the native control, so write a real `<input>`, `<select>`, or `<textarea>` rather than a `div` with a role.

### Manual test checklist

- [ ] Each control is named by its label. With `label`, the name is set on the control. With an `<orb-label>`, the control is labelled by it.
- [ ] Each control is described by its note, so screen readers read the note after the label.
- [ ] A control with no visible label, such as the composer's textarea, has an `aria-label`.
- [ ] Icon-only buttons in the slots have an `aria-label`, and decorative icons have `aria-hidden="true"`.
- [ ] The validation message is announced when it appears, and the control is reported as invalid.
- [ ] The focus color on the border is visible against the page in light and dark mode.
- [ ] In forced colors mode, the border and the focus state are still visible.
- [ ] Tab moves through the slotted content and the control in the order they're written.
