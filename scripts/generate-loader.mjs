const loaderTemplate = (componentsEntries) => `let observer;
let components = {
${componentsEntries},
};

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
    observer.disconnect();
  }
}

async function start(root = document.body) {
  observer = new MutationObserver((mutations) => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          load(node);
        }
      }
    }
  });

  load(root);
  observer.observe(root, { subtree: true, childList: true });
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
