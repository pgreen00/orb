---
title: 'OrbTimer | <orb-timer>'
sidebar_label: 'Timer'
---

## Usage

A timer displays the time remaining in a countdown and emits an event when it reaches zero. The `duration` attribute sets the length of the countdown in milliseconds.

::: live-code-demo

```html
<orb-timer duration="30000"></orb-timer>
```

:::

### Autostart

Add the `autostart` attribute to start counting down as soon as the timer loads.

::: live-code-demo

```html
<orb-timer duration="10000" autostart></orb-timer>
```

:::

### Controls

Call `start()`, `pause()`, and `restart()` to control the countdown. Calling `start()` after the countdown has finished starts it again from the full duration.

::: live-code-demo

```html
<orb-timer id="controls-timer" duration="20000"></orb-timer>
<div class="orb-margin-top-sm">
  <orb-button id="timer-start-button">Start</orb-button>
  <orb-button id="timer-pause-button" fill="outline">Pause</orb-button>
  <orb-button id="timer-restart-button" fill="outline">Restart</orb-button>
</div>
```

```javascript
const timer = document.querySelector("#controls-timer");
document.querySelector("#timer-start-button").addEventListener("click", () => timer.start());
document.querySelector("#timer-pause-button").addEventListener("click", () => timer.pause());
document.querySelector("#timer-restart-button").addEventListener("click", () => timer.restart());
```

:::

### Events

The timer emits `orbCountdownComplete` when the countdown reaches zero.

::: live-code-demo

```html
<orb-timer id="event-timer" duration="5000" autostart></orb-timer>
<p id="event-status" class="orb-margin-top-sm">Counting down…</p>
```

```javascript
const timer = document.querySelector("#event-timer");
const status = document.querySelector("#event-status");
timer.addEventListener("orbCountdownComplete", () => {
  status.textContent = "Time's up!";
});
```

:::

### Duration

Durations of an hour or more are displayed as `h:mm:ss`.

::: live-code-demo

```html
<orb-timer duration="3723000"></orb-timer>
```

:::
