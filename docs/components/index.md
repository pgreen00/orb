---
title: Components
section: components
templateEngineOverride: njk
---

<section class="component-search">
  <style>
    .component-search {
      display: flex;
      flex-direction: column;
      gap: var(--orb-spacing-md);
      max-width: 75rem;
      padding: 2rem;
    }
    @media (max-width: 767px) {
      .component-search {
        padding: 1rem;
      }
    }
    /* Long descriptions are cut to three lines; the full text is still searchable */
    .component-search orb-mesh [id$="-description"] {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      overflow: hidden;
    }
  </style>

  <h1>Components</h1>

  <orb-textbox id="component-search" label="Search components">
    <iconify-icon slot="start" icon="mdi:magnify" aria-hidden="true"></iconify-icon>
    <input type="search" autocomplete="off" enterkeyhint="search" placeholder="Search by name or description">
  </orb-textbox>

  <p id="component-count" role="status"></p>

  <orb-mesh space="md" style="--min-column-size: 16rem">
    {%- for component in collections.componentsNav %}
    {%- set name = component.label or component.name %}
    <a data-orb="tile quiet" href="/components/{{ component.name }}/" data-search="{{ (name + ' ' + (component.tag or '') + ' ' + (component.description or '')) | lower }}" aria-labelledby="tile-{{ component.name }}-name"{% if component.description %} aria-describedby="tile-{{ component.name }}-description"{% endif %}>
      <orb-card>
        <span slot="header" id="tile-{{ component.name }}-name">{{ name }}</span>
        {%- if component.description %}
        <span id="tile-{{ component.name }}-description">{{ component.description }}</span>
        {%- endif %}
        {%- if component.tag %}
        <code slot="footer">&lt;{{ component.tag }}&gt;</code>
        {%- endif %}
      </orb-card>
    </a>
    {%- endfor %}
  </orb-mesh>

  <p id="component-empty" hidden>No components match your search.</p>

  <script type="module">
    const input = document.querySelector('#component-search input')
    const tiles = [...document.querySelectorAll('.component-search orb-mesh > a')]
    const count = document.querySelector('#component-count')
    const empty = document.querySelector('#component-empty')

    function filter() {
      const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean)
      let shown = 0
      for (const tile of tiles) {
        const matches = terms.every(term => tile.dataset.search.includes(term))
        tile.hidden = !matches
        if (matches) shown++
      }
      empty.hidden = shown > 0
      count.textContent = terms.length
        ? `${shown} of ${tiles.length} components`
        : `${tiles.length} components`
    }

    input.addEventListener('input', filter)
    filter()
  </script>
</section>
