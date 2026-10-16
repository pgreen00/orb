/**
 * A `DocumentFragment` renders as markup rather than text, which is how a pipe
 * emits elements (a markdown renderer, an icon, a link) instead of characters.
 * Building the nodes is the pipe's job, so it also owns escaping whatever it
 * interpolated — returning a string keeps the safe text-only behaviour.
 */
export type PipeValue = string | number | DocumentFragment | null | undefined;

export type Pipe = (
  input: PipeValue,
  ...args: string[]
) => PipeValue | Promise<PipeValue>;

/**
 * A lazily loaded pipe. Because the `load` callback contains a static
 * `import()` call site, bundlers split it into its own chunk and only fetch it
 * the first time the pipe is actually used.
 */
export interface LazyPipe {
  load: () => Promise<Pipe | { default: Pipe }>;
}

export type PipeDefinition = Pipe | LazyPipe;

/**
 * Detects a fragment without an `instanceof` check, so a fragment created in
 * another document or realm (a `<template>` from an iframe, say) still counts.
 * @internal
 */
export function isFragment(value: PipeValue): value is DocumentFragment {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Node).nodeType === 11
  );
}

const registry = new Map<string, PipeDefinition>();
const resolved = new Map<string, Pipe>();
const pending = new Map<string, Promise<Pipe | undefined>>();

function isLazy(definition: PipeDefinition): definition is LazyPipe {
  return typeof definition === "object" && typeof definition.load === "function";
}

/**
 * Registers a pipe for use in `<orb-pipe input="...">` expressions.
 *
 * Pass a function to bundle the pipe eagerly, or `{ load: () => import(...) }`
 * to have it code-split and fetched on first use.
 *
 * Custom pipes take precedence over built-ins of the same name.
 *
 * @example
 * registerPipe("shout", (input) => `${input ?? ""}!`);
 * registerPipe("heavy", { load: () => import("./heavy.js") });
 */
export function registerPipe(name: string, pipe: PipeDefinition): void {
  registry.set(name, pipe);
  // Drop any previously resolved implementation so overrides take effect.
  resolved.delete(name);
  pending.delete(name);
  notify();
}

/** Registers several pipes at once. See {@link registerPipe}. */
export function registerPipes(pipes: Record<string, PipeDefinition>): void {
  for (const [name, pipe] of Object.entries(pipes)) {
    registry.set(name, pipe);
    resolved.delete(name);
    pending.delete(name);
  }
  notify();
}

const listeners = new Set<() => void>();
let notifyScheduled = false;

/**
 * Notifies mounted elements that the registry changed, coalescing bursts of
 * registrations into a single pass. Elements are commonly upgraded before a
 * deferred module gets a chance to register its pipes, so those already on the
 * page need to re-evaluate once the pipes they reference become available.
 */
function notify(): void {
  if (notifyScheduled || !listeners.size) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    for (const listener of [...listeners]) listener();
  });
}

/**
 * Subscribes to registry changes. Returns an unsubscribe function.
 * @internal
 */
export function onPipesChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Resolves a pipe by name, loading it if necessary. Custom registrations win
 * over built-ins. Results are memoized and concurrent lookups of the same name
 * share a single load.
 */
export async function resolvePipe(
  name: string,
  builtins: Record<string, LazyPipe["load"]> = {},
): Promise<Pipe | undefined> {
  const cached = resolved.get(name);
  if (cached) return cached;

  const inFlight = pending.get(name);
  if (inFlight) return inFlight;

  const custom = registry.get(name);
  let load: LazyPipe["load"] | undefined;

  if (custom) {
    if (!isLazy(custom)) {
      resolved.set(name, custom);
      return custom;
    }
    load = custom.load;
  } else {
    load = builtins[name];
  }

  if (!load) return undefined;

  const promise = (async () => {
    try {
      const mod = await load();
      const pipe = typeof mod === "function" ? mod : mod?.default;
      if (typeof pipe !== "function") {
        throw new Error(`Pipe "${name}" did not resolve to a function`);
      }
      resolved.set(name, pipe);
      return pipe;
    } finally {
      pending.delete(name);
    }
  })();

  pending.set(name, promise);
  return promise;
}
