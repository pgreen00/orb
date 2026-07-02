/**
 * Vendored, verbatim ports of Stencil's internal `docs-readme` markdown
 * generators (from node_modules/@stencil/core/compiler/stencil.js). Stencil does
 * not export these, so we copy the *pure* functions here to reproduce its table
 * output byte-for-byte from the `docs-json` metadata (dist/docs.json).
 *
 * If Stencil's readme format ever changes and we want to match it, re-sync the
 * functions below with the compiled source.
 *
 * Consumes the `JsonDocsComponent` shape documented in
 * node_modules/@stencil/core/internal/stencil-public-docs.d.ts.
 */
import { relative, dirname } from "path";

const normalizePath = (p) => p.replace(/\\/g, "/");

// docs.json serializes `filePath` (…/orb-x/orb-x.tsx) but not `dirPath`, so derive
// the component directory used for relative dependency links.
const getCmpDir = (cmp) => dirname(cmp.filePath);

// --- MarkdownTable: column-alignment engine ---------------------------------
class MarkdownTable {
  rows = [];
  addHeader(data) {
    this.addRow(data, true);
  }
  addRow(data, isHeader = false) {
    const columns = data.map((text) => ({
      text: escapeMarkdownTableColumn(text),
      width: text.length,
    }));
    this.rows.push({ columns, isHeader });
  }
  toMarkdown() {
    return createTable(this.rows);
  }
}

const escapeMarkdownTableColumn = (text) => {
  text = text.replace(/\r?\n/g, " ");
  text = text.replace(/\|/g, "\\|");
  return text;
};

const createTable = (rows) => {
  const content = [];
  if (rows.length === 0) {
    return content;
  }
  normalizeColumnCount(rows);
  normalizeColumnWidth(rows);
  const th = rows.find((r) => r.isHeader);
  if (th) {
    content.push(createRow(th));
    content.push(createBorder(th));
  }
  rows.filter((r) => !r.isHeader).forEach((td) => content.push(createRow(td)));
  return content;
};

const createBorder = (th) => {
  const border = { columns: [], isHeader: false };
  th.columns.forEach((c) => {
    const borderCol = { text: "", width: c.width };
    while (borderCol.text.length < borderCol.width) {
      borderCol.text += "-";
    }
    border.columns.push(borderCol);
  });
  return createRow(border);
};

const createRow = (row) => {
  const content = ["| "];
  row.columns.forEach((c) => {
    content.push(c.text);
    content.push(" | ");
  });
  return content.join("").trim();
};

const normalizeColumnCount = (rows) => {
  let columnCount = 0;
  rows.forEach((r) => {
    if (r.columns.length > columnCount) {
      columnCount = r.columns.length;
    }
  });
  rows.forEach((r) => {
    while (r.columns.length < columnCount) {
      r.columns.push({ text: ``, width: 0 });
    }
  });
};

const normalizeColumnWidth = (rows) => {
  const columnCount = rows[0].columns.length;
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
    let longestText = 0;
    rows.forEach((r) => {
      const col = r.columns[columnIndex];
      if (col.text.length > longestText) {
        longestText = col.text.length;
      }
    });
    rows.forEach((r) => {
      const col = r.columns[columnIndex];
      col.width = longestText;
      while (col.text.length < longestText) {
        col.text += " ";
      }
    });
  }
};

// --- Shared field formatting -------------------------------------------------
const getDocsField = (prop) =>
  `${prop.deprecation !== undefined ? `<span style="color:red">**[DEPRECATED]**</span> ${prop.deprecation}<br/><br/>` : ""}${prop.docs}`;

// --- Section generators ------------------------------------------------------
const propsToMarkdown = (props) => {
  const content = [];
  if (props.length === 0) {
    return content;
  }
  content.push(`## Properties`);
  content.push(``);
  const table = new MarkdownTable();
  table.addHeader(["Property", "Attribute", "Description", "Type", "Default"]);
  props.forEach((prop) => {
    table.addRow([
      getPropertyField(prop),
      getAttributeField(prop),
      getDocsField(prop),
      getTypeField(prop),
      getDefaultValueField(prop),
    ]);
  });
  content.push(...table.toMarkdown());
  content.push(``);
  content.push(``);
  return content;
};
const getPropertyField = (prop) =>
  `\`${prop.name}\`${prop.required ? " _(required)_" : ""}`;
const getAttributeField = (prop) => (prop.attr ? `\`${prop.attr}\`` : "--");
const getTypeField = (prop) =>
  prop.type.includes("`") ? `\`\` ${prop.type} \`\`` : `\`${prop.type}\``;
const getDefaultValueField = (prop) =>
  prop.default?.includes("`")
    ? `\`\` ${prop.default} \`\``
    : `\`${prop.default}\``;

const eventsToMarkdown = (events) => {
  const content = [];
  if (events.length === 0) {
    return content;
  }
  content.push(`## Events`);
  content.push(``);
  const table = new MarkdownTable();
  table.addHeader(["Event", "Description", "Type"]);
  events.forEach((ev) => {
    table.addRow([
      `\`${ev.event}\``,
      getDocsField(ev),
      `\`CustomEvent<${ev.detail}>\``,
    ]);
  });
  content.push(...table.toMarkdown());
  content.push(``);
  content.push(``);
  return content;
};

const methodsToMarkdown = (methods) => {
  const content = [];
  if (methods.length === 0) {
    return content;
  }
  content.push(`## Methods`);
  content.push(``);
  methods.forEach((method) => {
    content.push(`### \`${method.signature}\``);
    content.push(``);
    content.push(getDocsField(method));
    content.push(``);
    if (method.parameters.length > 0) {
      const parmsTable = new MarkdownTable();
      parmsTable.addHeader(["Name", "Type", "Description"]);
      method.parameters.forEach(({ name, type, docs }) => {
        parmsTable.addRow(["`" + name + "`", "`" + type + "`", docs]);
      });
      content.push(`#### Parameters`);
      content.push(``);
      content.push(...parmsTable.toMarkdown());
      content.push(``);
    }
    if (method.returns) {
      content.push(`#### Returns`);
      content.push(``);
      content.push(`Type: \`${method.returns.type}\``);
      content.push(``);
      content.push(method.returns.docs);
      content.push(``);
    }
  });
  content.push(``);
  return content;
};

const slotsToMarkdown = (slots) => {
  const content = [];
  if (slots.length === 0) {
    return content;
  }
  content.push(`## Slots`);
  content.push(``);
  const table = new MarkdownTable();
  table.addHeader(["Slot", "Description"]);
  slots.forEach((slot) => {
    table.addRow([slot.name === "" ? "" : `\`"${slot.name}"\``, slot.docs]);
  });
  content.push(...table.toMarkdown());
  content.push(``);
  content.push(``);
  return content;
};

const partsToMarkdown = (parts) => {
  const content = [];
  if (parts.length === 0) {
    return content;
  }
  content.push(`## Shadow Parts`);
  content.push(``);
  const table = new MarkdownTable();
  table.addHeader(["Part", "Description"]);
  parts.forEach((part) => {
    table.addRow([part.name === "" ? "" : `\`"${part.name}"\``, part.docs]);
  });
  content.push(...table.toMarkdown());
  content.push(``);
  content.push(``);
  return content;
};

const customStatesToMarkdown = (customStates) => {
  const content = [];
  if (customStates.length === 0) {
    return content;
  }
  content.push(`## Custom States`);
  content.push(``);
  const table = new MarkdownTable();
  table.addHeader(["State", "Initial Value", "Description"]);
  customStates.forEach((state) => {
    table.addRow([
      `\`:state(${state.name})\``,
      state.initialValue ? "`true`" : "`false`",
      state.docs,
    ]);
  });
  content.push(...table.toMarkdown());
  content.push(``);
  content.push(``);
  return content;
};

const stylesToMarkdown = (styles) => {
  const content = [];
  if (styles.length === 0) {
    return content;
  }
  content.push(`## CSS Custom Properties`);
  content.push(``);
  const table = new MarkdownTable();
  table.addHeader(["Name", "Description"]);
  styles.forEach((style) => {
    table.addRow([`\`${style.name}\``, style.docs]);
  });
  content.push(...table.toMarkdown());
  content.push(``);
  content.push(``);
  return content;
};

const getCmpLink = (from, to, cmps) => {
  const destCmp = cmps.find((c) => c.tag === to);
  if (destCmp) {
    const cmpRelPath = normalizePath(
      relative(getCmpDir(from), getCmpDir(destCmp)),
    );
    return `[${to}](${cmpRelPath})`;
  }
  return to;
};

const depsToMarkdown = (cmp, cmps, mermaid) => {
  const content = [];
  const deps = Object.entries(cmp.dependencyGraph);
  if (deps.length === 0) {
    return content;
  }
  content.push(`## Dependencies`);
  content.push(``);
  if (cmp.dependents.length > 0) {
    const usedBy = cmp.dependents.map(
      (tag) => " - " + getCmpLink(cmp, tag, cmps),
    );
    content.push(`### Used by`);
    content.push(``);
    content.push(...usedBy);
    content.push(``);
  }
  if (cmp.dependencies.length > 0) {
    const dependsOn = cmp.dependencies.map(
      (tag) => "- " + getCmpLink(cmp, tag, cmps),
    );
    content.push(`### Depends on`);
    content.push(``);
    content.push(...dependsOn);
    content.push(``);
  }
  content.push(`### Graph`);
  content.push("```mermaid");
  content.push("graph TD;");
  deps.forEach(([key, deps2]) => {
    deps2.forEach((dep) => {
      content.push(`  ${key} --> ${dep}`);
    });
  });
  content.push(
    `  style ${cmp.tag} fill:${mermaid.background},stroke:${mermaid.textColor},stroke-width:4px`,
  );
  content.push("```");
  content.push(``);
  return content;
};

/**
 * Generate the API table sections for a component, in Stencil's exact
 * `generateMarkdown` order (excluding the user-content / overview / usage parts,
 * which are the hand-written `.md` body).
 *
 * @param {import('@stencil/core/internal').JsonDocsComponent} cmp
 * @param {import('@stencil/core/internal').JsonDocsComponent[]} cmps
 * @returns {string}
 */
export function generateApiTables(cmp, cmps) {
  // Stencil's DEFAULT_TARGET_COMPONENT_STYLES.
  const mermaid = { background: "#f9f", textColor: "#333" };
  return [
    ...propsToMarkdown(cmp.props ?? []),
    ...eventsToMarkdown(cmp.events ?? []),
    ...methodsToMarkdown(cmp.methods ?? []),
    ...slotsToMarkdown(cmp.slots ?? []),
    ...partsToMarkdown(cmp.parts ?? []),
    // docs.json serializes custom states under `states` (not `customStates`).
    ...customStatesToMarkdown(cmp.states ?? cmp.customStates ?? []),
    ...stylesToMarkdown(cmp.styles ?? []),
    ...depsToMarkdown(cmp, cmps, mermaid),
  ]
    .join("\n")
    .trimEnd();
}
