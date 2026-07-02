import markdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import toc from "markdown-it-table-of-contents";
import multimdTable from "markdown-it-multimd-table";
import markdownItContainer from "markdown-it-container";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

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
      level: [2],
    })
    .use(toc, {
      includeLevel: [1, 2],
    })
    .use(multimdTable, {
      multiline: true,
      rowspan: true,
      headerless: true,
      multibody: true,
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

        const id = `code-demo-${Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("")}`;
        return `
          <div id="${id}" class="orb-radius-lg" style="box-sizing:border-box;border:solid 1px light-dark(var(--orb-neutral-500), var(--orb-neutral-800));">
            <div class="demo-result orb-padding">
              ${html?.content ?? ""}
              ${js ? `<script type="module">${js.content}</script>` : ""}
            </div>
            <orb-divider spacing="none"></orb-divider>
            <div class="orb-padding">
            <orb-tabs id="${id}-tabs" value="HTML">
              ${html ? "<orb-tab>HTML</orb-tab>" : ""}
              ${js ? "<orb-tab>Javascript</orb-tab>" : ""}
            </orb-tabs>
            <div id="${id}-tab-content"></div>
            </div>
          </div>
          <script type="module">
          await customElements.whenDefined('orb-tabs')
          const tabs = document.querySelector('orb-tabs#${id}-tabs')
          const root = document.querySelector('div#${id}-tab-content')
          const htmlTemplate = \`${html.original}\`
          const jsTemplate = \`${js?.original || ""}\`
          root.innerHTML = htmlTemplate
          tabs.addEventListener('valueChange', ({detail}) => {
            if (detail === 'HTML') root.innerHTML = htmlTemplate
            if (detail === 'Javascript') root.innerHTML = jsTemplate
          })
          </script>
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
    "./dist": "build/orb/dist/",
    "./styles": "build/orb/styles/",
    "./docs/public": "/",
  });

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
      input: "docs",
      output: "www",
      includes: "includes",
      data: "data",
    },
  };
}
