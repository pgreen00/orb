import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { glob } from "glob";
import { generateApiTables } from "../../scripts/stencil-markdown.mjs";

const DOCS_JSON_PATH = path.resolve("dist/docs.json");

/**
 * Load the Stencil `docs-json` metadata written by `stencil build`. Returns the
 * component array (or an empty array if the file isn't there yet, e.g. before
 * the first build) so the site still renders the hand-written content.
 */
function loadComponentDocs() {
  if (!fs.existsSync(DOCS_JSON_PATH)) {
    console.warn(
      `[components.mjs] ${DOCS_JSON_PATH} not found — run \`stencil build\` first. ` +
        `Rendering hand-written docs without generated API tables.`,
    );
    return [];
  }
  return JSON.parse(fs.readFileSync(DOCS_JSON_PATH, "utf8")).components ?? [];
}

export default function () {
  const files = glob.sync("src/components/**/*.md");
  const cmps = loadComponentDocs();
  const byDir = new Map(cmps.map((c) => [path.dirname(c.filePath), c]));

  return files.map((filePath) => {
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);

    const componentName = path.basename(filePath, ".md");
    const cmp = byDir.get(path.dirname(filePath));
    const body = cmp
      ? [cmp.docs?.trim(), content.trim(), generateApiTables(cmp, cmps)]
          .filter(Boolean)
          .join("\n\n") + "\n"
      : content;

    return {
      name: componentName,
      title: data.title || componentName,
      content: body,
      data: data,
      sourcePath: filePath,
    };
  });
}
