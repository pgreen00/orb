const loaderTemplate = (componentsEntries) => `let components = {
${componentsEntries},
};

const roots = new WeakSet();
let observer;

function getObserver() {
  observer ||= new MutationObserver((mutations) => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          load(node);
        }
      }
    }
  });
  return observer;
}

async function load(root) {
  const rootTagName = root instanceof Element ? root.tagName.toLowerCase() : "";
  const tags =
    [...root.querySelectorAll(":not(:defined)")]?.map((el) =>
      el.tagName.toLowerCase(),
    ) || [];
  if (rootTagName.includes("-") && !customElements.get(rootTagName)) {
    tags.push(rootTagName);
  }
  const tagsToRegister = [...new Set(tags)];
  await Promise.allSettled(tagsToRegister?.map((tagName) => register(tagName)));
}

async function register(tagName) {
  if (customElements.get(tagName)) {
    cleanUp(tagName);
    return Promise.resolve();
  }

  const loader = components[tagName];
  if (!loader) {
    return Promise.resolve();
  }

  await loader();
  cleanUp(tagName);
}

function cleanUp(tagName) {
  delete components[tagName];
  if (!Object.keys(components).length) {
    observer?.disconnect();
  }
}

/**
 * Watch a root for undefined Orb elements and lazily register them.
 * Call with a ShadowRoot to cover components inside your own shadow DOM.
 * @param {Element | Document | DocumentFragment | ShadowRoot} [root]
 * @returns {Promise<void>}
 */
export async function start(root = document.body) {
  if (!root || roots.has(root)) {
    return;
  }
  roots.add(root);

  if (Object.keys(components).length) {
    getObserver().observe(root, { subtree: true, childList: true });
  }
  await load(root);
}

start();
`;

/**
 * Generates a bundler-friendly lazy loader with static imports
 * @param {string[]} tagNames - Array of custom element tag names
 * @param {object} options - Configuration options
 * @returns {string} - Generated loader code
 */
export function generateLoader(tagNames, options = {}) {
  const { importPrefix = "./", importSuffix = ".js" } = options;

  const componentsEntries = tagNames
    .map((tagName) => {
      const importPath = `${importPrefix}${tagName}${importSuffix}`;
      return `  "${tagName}": () => import("${importPath}")`;
    })
    .join(",\n");

  return loaderTemplate(componentsEntries);
}
