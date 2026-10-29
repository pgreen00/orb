---
title: 'OrbRange | <orb-range>'
sidebar_label: 'Range'
---

## Usage

A range picks a number between `min` and `max`. Set `label` for the visible label and `note` for extra info, the same as the other form controls. While the thumb is dragged, or an arrow key is held, a tooltip shows the value.

::: live-code-demo

```html
<orb-range label="Brightness" note="Applies to the whole screen" value="40"></orb-range>
```

:::

**Manual test:**
- Drag the thumb. A tooltip shows the value and moves with the thumb.
- Release the thumb. The tooltip fades out.
- Click on the track. The thumb jumps there, and the tooltip shows for the click.

## Units and Precision

Set `unit` to add a unit to the tooltip. Decimals in `step` set how many digits show, so a step of `0.1` shows `-10.0`.

::: live-code-demo

```html
<orb-range label="Volume" min="-60" max="0" step="0.1" unit="dB" value="-10"></orb-range>
```

:::

**Manual test:**
- The tooltip reads `-10.0 dB` at the start.
- Each step changes the value by a tenth, and the tooltip always shows one decimal place.
- Screen readers announce the same text, such as "-10.0 dB".

## Accent

Set `accent` to color the track left of the thumb, which shows how far along the range the value is.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-range label="Opacity" value="60" accent></orb-range>
  <orb-range label="Speed" value="25"></orb-range>
</orb-stack>
```

:::

**Manual test:**
- The **Opacity** track is blue to the left of the thumb and gray to the right. **Speed** is gray all the way.
- Drag the **Opacity** thumb to the far left. The blue disappears. Drag it to the far right, and the whole track is blue.
- Use the arrow keys on **Opacity**. The blue edge follows the thumb, with no gap or overlap.

### Split

Set `accent="split"` to accent from the center instead. Between the center and the thumb the track is accented, on whichever side the thumb is. This suits a range with a middle point, such as a pan control.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-range label="Pan" min="-100" max="100" value="-30" accent="split"></orb-range>
  <orb-range label="Balance" min="-100" max="100" value="60" accent="split"></orb-range>
</orb-stack>
```

:::

**Manual test:**
- **Pan** is at -30. Blue runs from the thumb to the center, and the track left of the thumb is gray.
- **Balance** is at 60. Blue runs from the center to the thumb, and the track left of the center is gray.
- Drag **Pan** to the far left. Blue fills from the center to the left end. Drag it back to the center, and no blue shows.
- Use the arrow keys on **Balance** through the center. The blue span shrinks to nothing at the center and grows on the other side.

## Boosted

Set `boosted` for a larger vertical range, like a mixer fader. The lowest value is at the bottom. Combine it with `accent` to fill the track below the thumb.

::: live-code-demo

```html
<orb-stack mode="row" space="lg">
  <orb-range label="Complexity" boosted value="20"></orb-range>
  <orb-range label="Intensity" boosted accent value="75"></orb-range>
</orb-stack>
```

:::

**Manual test:**
- Both ranges are vertical, with the lowest value at the bottom. **Complexity** is near the bottom, and **Intensity** is near the top.
- Only **Intensity** has the blue fill below its thumb.
- Drag each thumb up and down. The value moves with the pointer, and the tooltip shows to the right of the thumb.
- Click the track. The thumb jumps to the click point.
- Focus a thumb and press Up or Right to increase, and Down or Left to decrease. Home goes to the bottom, and End goes to the top.

## Knob

Set `knob` to show the range as a rotary knob. Drag up to increase the value and down to decrease it. A drag across the whole range takes about 200 pixels. Combine it with `boosted` for a larger knob, and with `accent` to fill the arc up to the pointer.

::: live-code-demo

```html
<orb-stack mode="row" space="lg">
  <orb-range label="Gain" knob accent value="40"></orb-range>
  <orb-range label="Fill Complexity" knob boosted accent value="60"></orb-range>
  <orb-range label="Pan" knob accent="split" min="-100" max="100" value="-30"></orb-range>
</orb-stack>
```

:::

**Manual test:**
- Drag the **Gain** knob up. The value increases, the pointer turns clockwise, and the blue arc fills up to the pointer. Drag down, and it decreases.
- Drag far past the top or bottom. The value stops at the maximum or minimum, and doesn't keep changing.
- The tooltip shows below the knob while dragging, and hides when you let go.
- Click the knob without moving it. The value doesn't change.
- Tab to the knob. A focus ring appears around it. Up or Right increases the value, Down or Left decreases it, and Home and End go to the minimum and maximum.
- **Fill Complexity** is the large knob, about 6rem across, with the same look as the boosted reference.
- **Pan** is a knob with `accent="split"`, at -30 on a -100 to 100 range. Its blue arc runs from the top of the arc to the pointer on the left, and the arc right of the top stays gray. Drag it past the top, and the blue runs from the top to the pointer on the right.

## Keyboard and Events

Tab to the range, then use the arrow keys, Page Up and Page Down, or Home and End. The tooltip shows while a key is held. `orbValueChange` fires as the value changes, including during a drag. Use the native `change` event if you only need the final value.

::: live-code-demo

```html
<orb-range id="pan" label="Pan" min="-1" max="1" step="0.01" value="0"></orb-range>
<p id="pan-output" role="status">Pan: 0.00</p>
```

```javascript
const output = document.querySelector("#pan-output");
document.querySelector("#pan").addEventListener("orbValueChange", (event) => {
  output.textContent = `Pan: ${event.detail.toFixed(2)}`;
});
```

:::

**Manual test:**
- Press the Right arrow key. The status updates, and the tooltip shows while the key is held.
- Release the key. The tooltip fades out.
- Press Home. The value goes to `-1.00`. Press End to go to `1.00`.

## Forms

The range submits its value with the form, under its `name`. Resetting the form returns it to `originalValue`, which defaults to the initial value.

::: live-code-demo

```html
<form id="mix-form" style="display: grid; gap: 1rem;">
  <orb-range name="bass" label="Bass" value="50"></orb-range>
  <orb-range name="treble" label="Treble" value="70"></orb-range>
  <div style="display: flex; gap: 0.5rem;">
    <orb-button type="submit">Save</orb-button>
    <orb-button type="reset" fill="outline">Reset</orb-button>
  </div>
  <p id="mix-output" role="status">Not saved yet.</p>
</form>
```

```javascript
const form = document.querySelector("#mix-form");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  document.querySelector("#mix-output").textContent =
    `Saved bass ${data.get("bass")}, treble ${data.get("treble")}.`;
});
```

:::

**Manual test:**
- Move both ranges, then click **Reset**. Each returns to its starting value.
- Move a range and click **Save**. The status shows the values that were submitted.

## Disabled

Set `disabled` to keep the value visible but stop changes. A disabled range doesn't show a tooltip.

::: live-code-demo

```html
<orb-range label="Locked" value="30" disabled></orb-range>
```

:::

**Manual test:**
- The control is dimmed. Dragging and the arrow keys don't change it, and it's skipped in the Tab order.

## Accessibility

### Keyboard

| Key | Action |
| --- | --- |
| Right / Up | Increases the value by one step |
| Left / Down | Decreases the value by one step |
| Page Up / Page Down | Changes the value by a larger amount |
| Home / End | Moves to `min` or `max` |

### Manual test checklist

- [ ] The range has the `slider` role. Its accessible name is the `label`, and its description is the `note`.
- [ ] Screen readers announce the value with its unit, such as "-10.0 dB", through `aria-valuetext`.
- [ ] The tooltip is hidden from screen readers, so the value isn't announced twice.
- [ ] The focused thumb shows a visible focus ring.
- [ ] The tooltip doesn't block the thumb or the controls below it, and it ignores the pointer.
- [ ] The tooltip fades out with no motion when reduced motion is on.
- [ ] In forced colors mode, the tooltip keeps a visible border.
- [ ] A knob's drawn arc and pointer are hidden from screen readers. The native input keeps the slider role and value, so screen readers still announce the value and respond to the arrow keys.
