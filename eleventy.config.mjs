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
        const id = `${Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("")}`;
        const getTemplateId = ({ language }) => `template-${id}-${language}`;
        const getTemplateEl = ({ language, original }) =>
          `<template id="${getTemplateId({ language })}">${original}</template>`;
        const getPillEl = ({ language }) => {
          const normalized =
            language == "html"
              ? "HTML"
              : language == "javascript"
                ? "Javascript"
                : language == "wgsl"
                  ? "WGSL"
                  : language;
          return `<orb-pill template="${getTemplateId({ language })}">${normalized}</orb-pill>`;
        };
        if (codeBlocks.length == 1 && html) {
          return `
            <div id="${"code-demo-" + id}">
              <div>
                ${html?.content ?? ""}
              </div>
              <orb-divider spacing="none"></orb-divider>
              <div>
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
            <div>
              <orb-pill-group>
                ${codeBlocks.map(getPillEl).join("\n")}
              </orb-pill-group>
              ${codeBlocks.map(getTemplateEl).join("\n")}
            </div>
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
