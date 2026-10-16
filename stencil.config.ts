/// <reference types="node" />

import { Config } from "@stencil/core";
import { execSync } from "child_process";
import { generateLoader } from "./scripts/generate-loader.mjs";
import { generatePipeManifest } from "./scripts/generate-pipe-manifest.mjs";
import { writeFileSync, appendFileSync, mkdirSync } from "fs";

generatePipeManifest({
  pipesDir: "src/components/pipe/pipes",
  outFile: "src/components/pipe/pipes.generated.ts",
});

export const config: Config = {
  namespace: "orb-style",
  enableCache: false,
  hydratedFlag: null,
  extras: {
    experimentalSlotFixes: true,
    experimentalScopedSlotChanges: true,
  },
  outputTargets: [
    {
      type: "dist-custom-elements",
      externalRuntime: false,
      dir: "dist/components",
      customElementsExportBehavior: "auto-define-custom-elements",
    },
    {
      type: "custom",
      name: "styles",
      async generator(_config, _compilerCtx, buildCtx) {
        const files = [
          "src/styles/classes.scss:dist/styles/classes.css",
          "src/styles/variables.scss:dist/styles/variables.css",
          "src/styles/landmarks.scss:dist/styles/landmarks.css",
          "src/styles/native.scss:dist/styles/native.css",
          "src/styles/index.scss:dist/styles/index.css",
        ];
        execSync(`npx sass --no-source-map ${files.join(" ")}`);

        const tagNames = buildCtx.components.map((c) => c.tagName).sort();
        const fouc = `:is(${tagNames.join(",")}):not(:defined){visibility:hidden}\n`;
        appendFileSync("dist/styles/core.css", fouc);
      },
    },
    {
      type: "custom",
      name: "auto-loader",
      async generator(_config, _compilerCtx, buildCtx, _docs) {
        const tagNames = buildCtx.components.map((t) => t.tagName);
        const loaderCode = generateLoader(tagNames, {
          importPrefix: "./components/",
        });
        mkdirSync("./dist", { recursive: true });
        writeFileSync("./dist/loader.js", loaderCode, "utf8");
      },
    },
    {
      type: "docs-vscode",
      file: "dist/vscode-data.json",
    },
    {
      type: "docs-custom-elements-manifest",
      file: "dist/custom-elements.json",
    },
    {
      type: "docs-json",
      file: "dist/docs.json",
      typesFile: null,
    },
  ],
};
