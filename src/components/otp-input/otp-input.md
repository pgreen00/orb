---
title: 'OrbOtpInput | <orb-otp-input>'
sidebar_label: 'One Time Passcode'
---

## Usage

`<orb-otp-input>` collects one-time passcodes, PINs, and other fixed-length codes, one character per segment. Use it for SMS verification, two-factor authentication, and invite codes.

It works with forms like any other control. It submits its value under its `name`, it validates when the form is submitted, and it resets with the form.

::: live-code-demo

```html
<orb-otp-input label="Verification code"></orb-otp-input>
```

:::

**Manual test:**
- Six empty segments show under the label. The first one is outlined in the focus color once you click into the field.
- Type `1`, `2`, `3`. Each digit fills the next segment and the caret moves on.

## Labels and Notes

Set `label` and `note` for plain text, or put an `<orb-label>` and an `<orb-note>` in the default slots for markup. The label names the field for screen readers, and the note is read after it.

::: live-code-demo

```html
<orb-otp-input label="Security code" note="Check your authenticator app"></orb-otp-input>
```

:::

**Manual test:**
- The label shows above the segments and the note below them.
- With a screen reader, the field is announced with its label, followed by its note.

## Length

Use `length` to change the number of segments. The default is `6`.

::: live-code-demo

```html
<orb-stack>
  <orb-otp-input label="Card PIN" length="4"></orb-otp-input>
  <orb-otp-input label="Backup code" length="8"></orb-otp-input>
</orb-stack>
```

:::

## Format

Use `format` to group segments with literal separators. Each `#` is a segment and any other character is shown as a separator. Setting `format` overrides `length`, so there's no need to set both.

::: live-code-demo

```html
<orb-stack>
  <orb-otp-input label="Invite code" type="alphanumeric" format="### ###"></orb-otp-input>
  <orb-otp-input label="License key" type="alphanumeric" format="####-####-####"></orb-otp-input>
</orb-stack>
```

:::

Separators are never part of the value. `format="###-###"` with `123456` has the value `123456`.

## Type

`type` sets which characters a segment accepts. Characters the type doesn't allow are dropped as they're typed or pasted.

| Type | Accepts | Best for |
| --- | --- | --- |
| `numeric` default | Digits 0–9 | SMS and 2FA codes, PINs |
| `alpha` | Letters A–Z | Letter-only codes |
| `alphanumeric` | Letters and digits | Invite codes, serial numbers |

The `numeric` type also sets `inputmode` on the input, so mobile devices show the number pad.

::: live-code-demo

```html
<orb-stack>
  <orb-otp-input label="Numeric" type="numeric"></orb-otp-input>
  <orb-otp-input label="Alpha" type="alpha"></orb-otp-input>
  <orb-otp-input label="Alphanumeric" type="alphanumeric"></orb-otp-input>
</orb-stack>
```

:::

## Case

`case` changes letters as they're entered. The default is `preserve`. Use `upper` to force uppercase or `lower` to force lowercase.

::: live-code-demo

```html
<orb-stack>
  <orb-otp-input label="Upper" type="alpha" case="upper"></orb-otp-input>
  <orb-otp-input label="Lower" type="alpha" case="lower"></orb-otp-input>
</orb-stack>
```

:::

## Mask

Add `mask` to show `--mask-char` (a bullet by default) in place of each entered character. The value is still available through `value`. Masking is visual only, so screen readers still announce the characters.

::: live-code-demo

```html
<orb-otp-input label="PIN" mask length="4"></orb-otp-input>
```

:::

Add `with-mask` to also show the mask character in empty segments, so the field reads like a password field before anything is typed.

::: live-code-demo

```html
<orb-otp-input label="PIN" mask with-mask length="4"></orb-otp-input>
```

:::

Change the character with the `--mask-char` custom property. It must be a quoted string.

::: live-code-demo

```html
<orb-otp-input id="custom-mask-char" label="PIN" mask with-mask length="4"></orb-otp-input>

<style>
  #custom-mask-char {
    --mask-char: '*';
  }
</style>
```

:::

## Appearance

`appearance` changes how the segments look. The default is `outlined`.

::: live-code-demo

```html
<orb-stack>
  <orb-otp-input label="Outlined" appearance="outlined"></orb-otp-input>
  <orb-otp-input label="Filled" appearance="filled"></orb-otp-input>
  <orb-otp-input label="Filled outlined" appearance="filled-outlined"></orb-otp-input>
  <orb-otp-input label="Contained" appearance="contained"></orb-otp-input>
</orb-stack>
```

:::

## Size

`size` changes the size of each segment. The default is `md`.

::: live-code-demo

```html
<orb-stack>
  <orb-otp-input label="Extra small" size="xs"></orb-otp-input>
  <orb-otp-input label="Small" size="sm"></orb-otp-input>
  <orb-otp-input label="Medium" size="md"></orb-otp-input>
  <orb-otp-input label="Large" size="lg"></orb-otp-input>
</orb-stack>
```

:::

## Disabled and Readonly

`disabled` stops all interaction. A disabled field is left out of the form data.

`readonly` shows the value without allowing edits. A readonly field can still be focused, and its value is submitted with the form.

::: live-code-demo

```html
<orb-stack>
  <orb-otp-input label="Verification code" disabled value="391824"></orb-otp-input>
  <orb-otp-input label="Confirmation code" readonly value="483920"></orb-otp-input>
</orb-stack>
```

:::

## Value

Use `value` to fill the segments up front, for example when a code arrives in a link's query parameter. Read `value` at any time to get what's entered.

::: live-code-demo

```html
<orb-otp-input label="Magic link code" value="271828"></orb-otp-input>
```

:::

## Pasting

Pasting fills the segments from the caret onward. Characters that don't match `type` are dropped, so pasting `"ABC-123"` into a `numeric` field gives `123`.

::: live-code-demo

```html
<orb-copy-button value="314159">
  <orb-button>Copy code: 314159</orb-button>
</orb-copy-button>

<orb-otp-input label="Paste your code below"></orb-otp-input>
```

:::

## Autofill

`autocomplete` defaults to `one-time-code`, which lets browsers and operating systems offer SMS codes. Set `autocomplete="off"` for a PIN that shouldn't be suggested.

## Autosubmit

Add `autosubmit` to submit the containing form once every segment is filled. `orbComplete` fires first and can be cancelled. Call `preventDefault()` to stop the submission.

::: live-code-demo

```html
<form class="autosubmit">
  <orb-otp-input name="code" label="SMS verification code" autosubmit></orb-otp-input>
</form>

<script type="module">
  const form = document.querySelector('.autosubmit');

  form.addEventListener('submit', event => {
    event.preventDefault();
    alert(`Submitted code: ${new FormData(event.target).get('code')}`);
  });
</script>
```

:::

To run your own logic when the code is complete, such as verifying it over the network, listen for `orbComplete` without setting `autosubmit`.

## Validation

Add `required` to require a code before submission. A partly filled field is always invalid, even without `required`, with a message asking for all the characters.

The message appears after the user leaves the field or tries to submit the form, not on the first keystroke. A partial code would otherwise show an error while the user is still typing.

::: live-code-demo

```html
<form class="validation">
  <orb-otp-input name="code" label="Two-factor code" required></orb-otp-input>
  <br />
  <orb-button type="submit">Continue</orb-button>
</form>

<script type="module">
  const form = document.querySelector('.validation');

  form.addEventListener('submit', event => {
    event.preventDefault();
    alert('Code accepted!');
  });
</script>
```

:::

**Manual test:**
- Type `12` and leave the field. A message asks for all the characters, and the segments turn red.
- Click **Continue** with the field empty. It shows a message, and the form doesn't submit.

## Custom Validity

Use `setCustomValidity()` to set your own message. Pass an empty string to clear it. The form won't submit while a custom message is set.

::: live-code-demo

```html
<form class="custom-validity">
  <orb-otp-input name="code" label="Verification code" note="The correct code is 314159." required></orb-otp-input>
  <br />
  <orb-button type="submit">Verify</orb-button>
</form>

<script type="module">
  const form = document.querySelector('.custom-validity');
  const otp = form.querySelector('orb-otp-input');

  otp.addEventListener('orbValueChange', () => {
    // Only flag complete entries. Partial input is already invalid.
    const isValid = otp.value.length < otp.length || otp.value === '314159';
    otp.setCustomValidity(isValid ? '' : 'That code didn’t match. Check your device and try again.');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    alert('Code accepted!');
  });
</script>
```

:::

## Customizing

Use the `--segment-size`, `--segment-gap`, and `--segment-border-radius` custom properties, along with the `segment` part, to style the segments.

::: live-code-demo

```html
<orb-otp-input id="styled-otp" label="Card PIN" length="4"></orb-otp-input>

<style>
  #styled-otp {
    --segment-size: 3.5rem;
    --segment-gap: 0.75rem;
    --segment-border-radius: 0.75rem;
  }

  #styled-otp::part(segment) {
    font-size: 1.5rem;
    font-weight: 700;
    background-color: light-dark(var(--orb-primary-50), var(--orb-primary-900));
    border-color: var(--orb-primary-500);
  }
</style>
```

:::

Combine parts with custom states to react to what the field is doing. `--filled` applies once every segment is filled, `--blank` before anything is entered, and `invalid` while the value fails validation. `invalid` applies right away, while `user-invalid` waits for the user to interact.

::: live-code-demo

```html
<orb-otp-input class="stateful-otp" label="Two-factor code" required></orb-otp-input>

<style>
  .stateful-otp:state(--filled)::part(segment) {
    background-color: light-dark(var(--orb-success-50), var(--orb-success-900));
    border-color: var(--orb-success-500);
  }

  .stateful-otp:state(invalid)::part(segment) {
    border-color: var(--orb-danger-500);
  }
</style>
```

:::

## Forms

The value is submitted under `name`, and `form.reset()` puts back the initial `value`.

::: live-code-demo

```html
<form id="pin-form">
  <orb-otp-input name="pin" label="Card PIN" length="4" value="0000"></orb-otp-input>
  <orb-button type="submit">Save</orb-button>
  <orb-button type="reset">Reset</orb-button>
  <p id="pin-output" role="status">Not saved yet.</p>
</form>

<script type="module">
  const form = document.querySelector('#pin-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const pin = new FormData(form).get('pin');
    document.querySelector('#pin-output').textContent = `Saved ${pin}.`;
  });
</script>
```

:::

## Accessibility

The field is a single text input with a visually hidden element. Screen readers announce it as one field, named by its label, and read its note after the label. The segments are decorative. Always give the field a label.

| Key | Behavior |
| --- | --- |
| ← → | Move between segments |
| Tab | Moves focus to the next form control |
| Enter | Submits the containing form |
| Backspace | Removes the character in the current segment, shifting later characters left, and moves back |
| Delete | Removes the character in the current segment, shifting later characters left, and stays put |

### Manual test checklist

- [ ] The field is named by its label, and its note is read after it.
- [ ] Each entered character is announced as it's typed, even when `mask` hides it on screen.
- [ ] Invalid state is announced when it appears, and the field reports `aria-invalid`.
- [ ] The focus ring on the active segment is visible in light and dark mode.
- [ ] In forced colors mode, segment borders and the active segment are still visible.
- [ ] With `prefers-reduced-motion`, the caret doesn't blink.
- [ ] On a phone, `one-time-code` autofill fills the whole code in one step.
