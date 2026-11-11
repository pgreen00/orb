import markdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import toc from "markdown-it-table-of-contents";
import multimdTable from "markdown-it-multimd-table";
import markdownItContainer from "markdown-it-container";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { buildSearchIndex } from "./scripts/search-index.mjs";

export default async function (eleventyConfig) {
  const md = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
  })
    .use(anchor, {
      permalink: anchor.permalink.headerLink({
        renderAttrs: () => ({ "data-toc": "" }),
      }),
      level: [2, 3, 4],
    })
    .use(toc, {
      // The levels the heading anchors cover
      includeLevel: [2, 3, 4],
      containerClass: "table-of-contents",
      listType: "ul",
    })
    .use(multimdTable, {
      multiline: true,
      rowspan: true,
      headerless: true,
      multibody: true,
    });

  // A `<!-- row-headers -->` comment marks the table that follows (see
  // scripts/stencil-markdown.mjs). Its label cells become row headers, which
  // the `row-headers` native table style tints.
  md.core.ruler.after("block", "row-headers", (state) => {
    const tokens = state.tokens;
    tokens.forEach((token, i) => {
      if (token.type !== "html_block" || !token.content.startsWith("<!-- row-headers -->")) return;
      token.content = "";
      const open = tokens.findIndex((t, j) => j > i && t.type === "table_open");
      if (open < 0) return;
      tokens[open].attrSet("data-orb", "row-headers");
      let close = open;
      while (tokens[close].type !== "table_close") close++;
      for (let row = open; row < close; row++) {
        if (tokens[row].type !== "tr_open") continue;
        let cell = row + 1;
        while (cell < close && tokens[cell].type !== "td_open" && tokens[cell].type !== "tr_close") cell++;
        if (tokens[cell].type !== "td_open") continue;
        let end = cell + 1;
        while (tokens[end].type !== "td_close") end++;
        tokens[cell].tag = "th";
        tokens[cell].attrSet("scope", "row");
        tokens[end].tag = "th";
      }
    });
  });

  // A page's table of contents, from its markdown source. The plugin only
  // builds one where its [[toc]] marker is, so the source is rendered again with
  // the marker first. The container is the first thing in the output.
  eleventyConfig.addFilter("toc", (source) => {
    const body = String(source ?? "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const html = md.render(`[[toc]]\n\n${body}`);
    const match = html.match(/<div class="table-of-contents">([\s\S]*?)<\/div>/);
    if (!match || !match[1].includes("<li>")) return "";
    return `<nav data-orb="toc" aria-label="Table of contents">${match[1]}</nav>`;
  });

  const defaultFence = md.renderer.rules.fence;

  md.use(markdownItContainer, "live-code-demo", {
    validate: function (params) {
      return params.trim() === "live-code-demo";
    },
    render: function (tokens, idx, options, env, renderer) {
      if (tokens[idx].nesting === 1) {
        const codeBlocks = [];
        for (
          let i = idx + 1;
          i < tokens.length && tokens[i].nesting !== -1;
          i++
        ) {
          if (tokens[i].type === "fence") {
            const info = tokens[i].info ? tokens[i].info.trim() : "";
            const language = info.split(/\s+/g)[0];
            codeBlocks.push({
              language: language,
              content: tokens[i].content,
              original: defaultFence(tokens, i, options, env, renderer),
            });

            tokens[i].consumed = true;
          }
        }

        const html = codeBlocks.find((t) => t.language === "html");
        let js = codeBlocks.find((t) => t.language === "javascript");
        const id = `${Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("")}`;
        const getTemplateId = ({ language }) => `template-${id}-${language}`;
        const getTemplateEl = ({ language, original }) =>
          `<orb-tab-panel name="${getTemplateId({ language })}">${original}</orb-tab-panel>`;
        const getPillEl = ({ language }) => {
          const normalized =
            language == "html"
              ? "HTML"
              : language == "javascript"
                ? "Javascript"
                : language == "wgsl"
                  ? "WGSL"
                  : language;
          return `<orb-tab-button panel="${getTemplateId({ language })}">${normalized}</orb-tab-button>`;
        };
        if (codeBlocks.length == 1 && html) {
          return `
            <div id="${"code-demo-" + id}">
              <div>
                ${html?.content ?? ""}
              </div>
              <orb-divider spacing="none"></orb-divider>
              <div class="code-container">
                ${html?.original ?? ""}
              </div>
            </div>
          `;
        }
        return `
          <div id="${"code-demo-" + id}">
            <div>
              ${html?.content ?? ""}
              ${js ? `<script type="module">${js.content}</script>` : ""}
            </div>
            <orb-divider spacing="none"></orb-divider>
            <orb-tabs class="code-container">
              ${codeBlocks.map(getPillEl).join("\n")}
              ${codeBlocks.map(getTemplateEl).join("\n")}
            </orb-tabs>
          </div>
        `;
      } else {
        return "";
      }
    },
  });

  md.renderer.rules.fence = function (tokens, idx, options, env, renderer) {
    const token = tokens[idx];
    const info = token.info ? token.info.trim() : "";
    const langName = info.split(/\s+/g)[0];
    const content = token.content;

    if (langName === "mermaid") {
      return `<div class="mermaid">${content}</div>`;
    }
    if (token["consumed"]) {
      return "";
    } else {
      return defaultFence(tokens, idx, options, env, renderer);
    }
  };

  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.setLibrary("md", md);
  eleventyConfig.addFilter("markdown", (content) => md.render(content));
  eleventyConfig.addGlobalData("layout", "default");
  eleventyConfig.addPassthroughCopy({
    "./dist": "build/",
    "./docs/public": "/",
  });

  eleventyConfig.on("eleventy.after", async ({ dir, results }) => {
    const { pages, records } = await buildSearchIndex(results, dir.output);
    console.log(`[search] Indexed ${records} sections from ${pages} pages`);
  });

  // A section's landing page is its index, at the section's own URL. It's the
  // section's entry in the top nav. The other pages with the same `section` are
  // its sidebar, in `order`, then by name. Both use the page's `order` front
  // matter, so the lists don't need to be written out in the templates.
  const isLanding = (page) => page.url === `/${page.data.section}/`;
  const bySidebarOrder = (a, b) => {
    const rank = (page) => page.data.order ?? Infinity;
    if (rank(a) !== rank(b)) return rank(a) < rank(b) ? -1 : 1;
    const name = (page) => page.data.sidebar_label || page.data.title || "";
    return name(a).localeCompare(name(b));
  };

  eleventyConfig.addCollection("sectionLandings", (collectionApi) =>
    collectionApi
      .getAll()
      .filter((page) => page.data.section && isLanding(page))
      .sort(bySidebarOrder),
  );

  eleventyConfig.addCollection("sidebarPages", (collectionApi) => {
    const pages = collectionApi
      .getAll()
      .filter((page) => page.data.section && !isLanding(page) && page.data.section !== "components");
    // Component pages are paginated from the component list, and not all of
    // them reach the collection, so the sidebar reads them from that list.
    const components = (collectionApi.getAll()[0]?.data?.components || []).map((cmp) => ({
      url: `/components/${cmp.name}/`,
      data: {
        section: "components",
        title: cmp.label || cmp.name,
        sidebar_label: cmp.data?.sidebar_label || cmp.name,
      },
    }));
    return [...pages, ...components].sort(bySidebarOrder);
  });

  eleventyConfig.addFilter("inSection", (pages, section) =>
    pages.filter((page) => page.data.section === section),
  );

  eleventyConfig.addCollection("componentsNav", function (collectionApi) {
    const components = collectionApi.getAll()[0]?.data?.components || [];
    return components.sort((a, b) =>
      (a.data.sidebar_label || a.name).localeCompare(
        b.data.sidebar_label || b.name,
      ),
    );
  });

  return {
    dir: {
      input: "docs/site",
      output: "www",
      includes: "../includes",
      data: "../data",
    },
  };
}
