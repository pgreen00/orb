<style>
  /* Hero */
  .orb-home-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--orb-spacing-md);
    text-align: center;
    max-width: 50rem;
    margin: 0 auto;
    padding: var(--orb-spacing-3xl) var(--orb-spacing-lg) var(--orb-spacing-2xl);
  }
  .orb-home-hero img {
    width: 4.5rem;
    height: 4.5rem;
  }
  .orb-home-hero h1 {
    margin: 0;
    font-size: clamp(2rem, 4.5vw, 3rem);
    font-weight: var(--orb-font-bold);
    line-height: 1.15;
    letter-spacing: -0.02em;
  }
  .orb-home-hero h1 em {
    font-style: normal;
    color: light-dark(var(--orb-primary-600), var(--orb-primary-300));
  }
  .orb-home-hero > p {
    margin: 0;
    font-size: var(--orb-font-lg);
    color: light-dark(var(--orb-neutral-650), var(--orb-neutral-250));
  }
  .orb-home-cta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--orb-spacing-sm);
  }
  .orb-home-cta a {
    text-decoration: none;
  }
  .orb-home-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--orb-spacing-2xs);
  }
  .orb-home-badges span {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: var(--orb-font-xs);
    padding: 0.15rem 0.6rem;
    border: solid 1px var(--orb-divider-color);
    border-radius: var(--orb-radius-pill);
    color: light-dark(var(--orb-neutral-600), var(--orb-neutral-300));
  }

  /* Principles */
  .orb-home-principles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--orb-spacing-md);
    max-width: 75rem;
    margin: 0 auto;
    padding: 0 var(--orb-spacing-lg) var(--orb-spacing-3xl);
  }
  .orb-home-principles article {
    display: flex;
    flex-direction: column;
    gap: var(--orb-spacing-xs);
    padding: var(--orb-spacing-lg);
    border: solid 1px var(--orb-divider-color);
    border-radius: var(--orb-radius-lg);
    background-color: light-dark(var(--orb-neutral-50), var(--orb-neutral-900));
  }
  .orb-home-principles iconify-icon {
    color: light-dark(var(--orb-primary-600), var(--orb-primary-300));
  }
  .orb-home-principles h3 {
    margin: 0;
  }
  .orb-home-principles p {
    margin: 0;
    color: light-dark(var(--orb-neutral-600), var(--orb-neutral-300));
  }

  /* Content column for the markdown-rendered sections below */
  main > h2,
  main > p,
  main > [id^="code-demo-"],
  main > orb-mesh,
  main > .orb-home-foot {
    max-width: 50rem;
    margin-inline: auto;
  }
  main > [id^="code-demo-"] {
    margin-block: var(--orb-spacing-md);
  }

  /* Overlay demo body */
  .orb-home-overlay-body {
    display: flex;
    flex-direction: column;
    gap: var(--orb-spacing-sm);
    padding: var(--orb-spacing-lg);
  }
  .orb-home-overlay-body h3 {
    margin: 0;
  }
  .orb-home-overlay-body p {
    margin: 0;
  }

  /* Component tiles */
  .orb-home-tile {
    display: flex;
    flex-direction: column;
    gap: var(--orb-spacing-2xs);
    padding: var(--orb-spacing-md);
    border: solid 1px var(--orb-divider-color);
    border-radius: var(--orb-radius-lg);
    text-decoration: none;
    color: inherit;
    transition: border-color var(--orb-transition-fast);
  }
  .orb-home-tile:hover {
    border-color: light-dark(var(--orb-primary-500), var(--orb-primary-300));
  }
  .orb-home-tile iconify-icon {
    color: light-dark(var(--orb-primary-600), var(--orb-primary-300));
  }
  .orb-home-tile span {
    font-size: var(--orb-font-sm);
    color: light-dark(var(--orb-neutral-600), var(--orb-neutral-300));
  }

  /* Footer */
  .orb-home-foot {
    padding-block: var(--orb-spacing-2xl);
    text-align: center;
  }
  .orb-home-foot p {
    margin: 0;
    max-width: 42rem;
  }
</style>

<section class="orb-home-hero">
  <img src="/orb.png" alt="" width="72" height="72" />
  <h1>Web components that work <em>with</em> the platform, not around it</h1>
  <p>
    Orb is a lightweight design system of custom elements that live side by side with
    native HTML. It doesn't reinvent the wheel — forms, overlays, and popovers build
    on the modern APIs the platform already gives you, so native baseline behavior
    and ARIA support come for free.
  </p>
  <div class="orb-home-cta">
    <a class="orb btn accent orb-font-lg" href="#native-controls-stay-native">See it in action</a>
    <a class="orb btn orb-font-lg" href="https://github.com/pgreen00/orb" target="_blank">View on GitHub</a>
  </div>
  <div class="orb-home-badges">
    <span>Popover API</span>
    <span>&lt;dialog&gt;</span>
    <span>ElementInternals</span>
    <span>:state()</span>
    <span>:user-invalid</span>
    <span>light-dark()</span>
  </div>
</section>

<section class="orb-home-principles">
  <article>
    <iconify-icon icon="mdi:code-tags" height="1.75rem"></iconify-icon>
    <h3>Wrappers, not replacements</h3>
    <p>
      Orb wraps the controls you already write instead of replacing them. Put a real
      <code>&lt;input&gt;</code>, <code>&lt;select&gt;</code>, or
      <code>&lt;textarea&gt;</code> inside <code>&lt;orb-textbox&gt;</code> and Orb
      handles the chrome — the native element stays in the DOM.
    </p>
  </article>
  <article>
    <iconify-icon icon="mdi:layers" height="1.75rem"></iconify-icon>
    <h3>Built on platform APIs</h3>
    <p>
      Popovers ride the native Popover API, modals and drawers render in a real
      <code>&lt;dialog&gt;</code>, and form controls participate through
      <code>ElementInternals</code>. The browser does the heavy lifting — Orb adds
      the last mile, not a parallel universe.
    </p>
  </article>
  <article>
    <iconify-icon icon="mdi:tune-variant" height="1.75rem"></iconify-icon>
    <h3>Upgraded controls, native baseline</h3>
    <p>
      New controls like <code>&lt;orb-checkbox&gt;</code> and
      <code>&lt;orb-toggle&gt;</code> offer real upgrades over
      <code>input[type=checkbox]</code> — mixed states, switch semantics, custom
      state — while keeping the native baseline behavior and ARIA support.
    </p>
  </article>
  <article>
    <iconify-icon icon="mdi:feather" height="1.75rem"></iconify-icon>
    <h3>Lightweight and framework-agnostic</h3>
    <p>
      Custom elements built with Stencil that work side by side with plain HTML or
      any framework — React, Angular, Vue, or none at all. Tree-shakeable, with
      theming driven entirely by CSS custom properties.
    </p>
  </article>
</section>

## Native controls stay native

`<orb-textbox>` is chrome around the control, not a re-implementation of it. Labels, notes, password toggles, and validation messages (driven by the native `:user-invalid` pseudo-class) come from Orb — autofill, constraint validation, and screen readers keep working because the real element is still there.

::: live-code-demo

```html
<orb-stack>
  <orb-textbox>
    <orb-label>Full Name</orb-label>
    <input required placeholder="Type your name..."/>
  </orb-textbox>
  <orb-textbox label="Email">
    <input type="email" placeholder="you@example.com"/>
  </orb-textbox>
  <orb-textbox label="Password">
    <input type="password"/>
  </orb-textbox>
  <orb-textbox label="Food">
    <select>
      <option hidden>Choose a food…</option>
      <optgroup label="Fruits">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
      </optgroup>
      <optgroup label="Vegetables">
        <option value="carrot">Carrot</option>
      </optgroup>
    </select>
  </orb-textbox>
  <orb-textbox label="Message">
    <textarea placeholder="Notes"></textarea>
    <orb-button slot="after" class="icon-only">
      <iconify-icon icon="mdi:send"></iconify-icon>
    </orb-button>
  </orb-textbox>
</orb-stack>
```

:::

## New form controls with a native baseline

`<orb-checkbox>` and `<orb-toggle>` aren't styled inputs — they're form-associated custom elements built on `ElementInternals`. They submit values with the form, respect `required` and `form.reset()`, expose their state to CSS through `:state()`, and carry proper `checkbox` and `switch` roles. The checkbox supports the mixed (indeterminate) state out of the box. Submit the form below and watch what `FormData` collects.

::: live-code-demo

```html
<form id="orb-home-form">
  <orb-stack space="md">
    <orb-textbox label="Full name">
      <input name="name" required placeholder="Type your name..."/>
    </orb-textbox>
    <orb-checkbox required name="terms" checked="mixed">
      I accept the terms and conditions
    </orb-checkbox>
    <orb-toggle name="newsletter" checked>
      Subscribe to the newsletter
    </orb-toggle>
    <orb-stack mode="row">
      <orb-button type="submit" color="primary">Submit</orb-button>
      <orb-button type="reset" fill="outline">Reset</orb-button>
    </orb-stack>
    <orb-note class="orb-home-form-output">
      Submit the form to see its FormData.
    </orb-note>
  </orb-stack>
</form>
```

```javascript
const form = document.querySelector('#orb-home-form')
const out = form.querySelector('.orb-home-form-output')
form.addEventListener('submit', ev => {
  ev.preventDefault()
  const entries = [...new FormData(form).entries()]
    .map(([key, value]) => `${key}="${value}"`)
    .join(', ')
  out.textContent = `FormData { ${entries} }`
})
```

:::

## Overlays on platform primitives

`<orb-popover>` shows content in the top layer through the native Popover API — light dismiss included — and positions with Floating UI so it flips and shifts to stay on screen. `<orb-overlay>` is a thin layer over a real `<dialog>` opened with `showModal()`, so focus trapping, Escape handling, and `::backdrop` come from the platform, not a re-implementation.

::: live-code-demo

```html
<orb-stack mode="row">
  <orb-popover placement="bottom-start">
    <orb-button slot="trigger">Open menu</orb-button>
    <orb-menu>
      <orb-mi value="edit">
        <iconify-icon slot="icon" icon="mdi:pencil"></iconify-icon>
        Edit
      </orb-mi>
      <orb-mi value="duplicate">
        <iconify-icon slot="icon" icon="mdi:content-copy"></iconify-icon>
        Duplicate
      </orb-mi>
      <orb-mi value="delete">
        <iconify-icon slot="icon" icon="mdi:delete"></iconify-icon>
        Delete
      </orb-mi>
    </orb-menu>
  </orb-popover>
  <orb-overlay size="sm">
    <orb-button slot="trigger" fill="outline">Open dialog</orb-button>
    <div class="orb-home-overlay-body">
      <h3>A native <code>&lt;dialog&gt;</code></h3>
      <p>
        Focus trapping, the Escape key, and the backdrop are provided by the
        platform. Orb only adds the open/close lifecycle, sizes, and animation.
      </p>
      <div>
        <orb-button onclick="this.closest('orb-overlay').hide()">Close</orb-button>
      </div>
    </div>
  </orb-overlay>
</orb-stack>
```

:::

## Explore the components

<orb-mesh space="md">
  <a class="orb tile" href="/components/textbox/" aria-labelledby="tile-textbox-label">
    <orb-card>
      <orb-stack align="center" space="2xs">
        <orb-color light="primary-600" dark="primary-300">
          <iconify-icon icon="mdi:form-textbox" height="1.75rem"></iconify-icon>
        </orb-color>
        <h4 id="tile-textbox-label">Textbox</h4>
        <span class="orb-font-sm">Labels, notes, and validation around the native controls you already use.</span>
      </orb-stack>
    </orb-card>
  </a>
  <a class="orb-home-tile" href="/components/checkbox/">
    <iconify-icon icon="mdi:checkbox-marked" height="1.75rem"></iconify-icon>
    <strong>Checkbox</strong>
    <span>Mixed-state, form-associated checkbox with a native baseline.</span>
  </a>
  <a class="orb-home-tile" href="/components/toggle/">
    <iconify-icon icon="mdi:toggle-switch" height="1.75rem"></iconify-icon>
    <strong>Toggle</strong>
    <span>A proper switch — role, form participation, and :state() included.</span>
  </a>
  <a class="orb-home-tile" href="/components/popover/">
    <iconify-icon icon="mdi:tooltip-text" height="1.75rem"></iconify-icon>
    <strong>Popover</strong>
    <span>Anchored, light-dismiss popovers on the native Popover API.</span>
  </a>
  <a class="orb-home-tile" href="/components/overlay/">
    <iconify-icon icon="mdi:window-restore" height="1.75rem"></iconify-icon>
    <strong>Overlay</strong>
    <span>Modals and drawers built on &lt;dialog&gt; and showModal().</span>
  </a>
  <a class="orb-home-tile" href="/components/button/">
    <iconify-icon icon="mdi:cursor-default-click" height="1.75rem"></iconify-icon>
    <strong>Button</strong>
    <span>Five colors, four sizes, three fills — with form-aware submit and reset.</span>
  </a>
  <a class="orb-home-tile" href="/components/menu/">
    <iconify-icon icon="mdi:menu" height="1.75rem"></iconify-icon>
    <strong>Menu</strong>
    <span>Menus and menu items for popovers, toolbars, and context menus.</span>
  </a>
  <a class="orb-home-tile" href="/components/grid/">
    <iconify-icon icon="mdi:table" height="1.75rem"></iconify-icon>
    <strong>Grid</strong>
    <span>Data tables with sorting, sticky columns, and selection.</span>
  </a>
</orb-mesh>

<div class="orb-home-foot">
  <p>
    Orb is in active development. Check out the <a href="/demos/grid/">data table demo</a>,
    browse the component docs in the sidebar, or follow along on
    <a class="orb underline" href="https://github.com/pgreen00/orb" target="_blank">GitHub</a>.
  </p>
</div>
