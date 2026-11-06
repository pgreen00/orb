<style>
  .orb-home-hero {
    display: flex;
    flex-direction: column;
    gap: var(--orb-spacing-xl);
    text-align: center;
    max-width: 65rem;
    margin: 0 auto;
    padding: var(--orb-spacing-3xl) var(--orb-spacing-lg) var(--orb-spacing-2xl);
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
  .orb-home-highlights {
    --min-column-size: 20rem;
  }
  .features-media {
    display: grid;
    place-items: center;
    aspect-ratio: 16 / 9;
    color: white;
    font-size: 3.5rem;
    background: linear-gradient(
      135deg,
      hsl(var(--hue) 55% 45%),
      hsl(calc(var(--hue) + 40) 60% 30%)
    );
  }
</style>

<section class="orb-home-hero">
  <h1>A design system that works <em>with</em> the platform, not around it</h1>
  <p>
    Orb is a design system of custom elements that live side by side with
    native HTML. It doesn't reinvent the wheel — it builds upon the modern 
    APIs the platform already gives you, prioritizing accessibility and
    developer experience.
  </p>
  <div class="orb-home-cta">
    <a data-orb="button accent" class="orb-font-lg" href="/installation">Getting Started</a>
    <a data-orb="button" class="orb-font-lg" href="https://github.com/pgreen00/orb" target="_blank">View on GitHub</a>
  </div>
  <orb-mesh space="md" class="orb-home-highlights">
    <orb-card layout="horizontal" media-placement="start">
      <div slot="media" class="features-media" style="--hue: 140;">
        <iconify-icon icon="mdi:lightning-bolt" aria-hidden="true"></iconify-icon>
      </div>
      <h3 slot="header" style="margin: 0;">Modern and fast</h3>
      Built on the browser's own APIs, like popovers, CSS custom properties, and native form controls, so there's less code to download and less work for the browser to do.
    </orb-card>
    <orb-card layout="horizontal" media-placement="start">
      <div slot="media" class="features-media" style="--hue: 40;">
        <iconify-icon icon="mdi:human-handsup" aria-hidden="true"></iconify-icon>
      </div>
      <h3 slot="header" style="margin: 0;">Accessible by default</h3>
      Keyboard support, focus management, and ARIA come built in, and every component page has a manual test checklist for screen readers and forced colors.
    </orb-card>
    <orb-card layout="horizontal" media-placement="start">
      <div slot="media" class="features-media" style="--hue: 280;">
        <iconify-icon icon="mdi:code-tags" aria-hidden="true"></iconify-icon>
      </div>
      <h3 slot="header" style="margin: 0;">Friendly to any framework</h3>
      Components are plain HTML elements, configured with attributes and events. They work in React, Vue, Angular, Svelte, or no framework at all.
    </orb-card>
  </orb-mesh>
</section>
