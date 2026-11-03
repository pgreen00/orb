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
    <a data-orb="button accent" class="orb-font-lg" href="#native-controls-stay-native">See it in action</a>
    <a data-orb="button" class="orb-font-lg" href="https://github.com/pgreen00/orb" target="_blank">View on GitHub</a>
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
