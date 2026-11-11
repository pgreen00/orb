import { normalizeMask } from "../components/mask-input/mask";
import type { Mask, MaskDefinition } from "../components/mask-input/mask";

/**
 * A lazily loaded mask. Because the `load` callback contains a static
 * `import()` call site, bundlers split it into its own chunk and only fetch it
 * the first time a field uses the mask.
 */
export interface LazyMask {
  load: () => Promise<MaskDefinition | { default: MaskDefinition }>;
}

export type MaskRegistration = MaskDefinition | LazyMask;

const registry = new Map<string, MaskRegistration>();
const resolved = new Map<string, Mask>();
const pending = new Map<string, Promise<Mask>>();
const listeners = new Set<() => void>();
let notifyScheduled = false;

function isLazy(registration: MaskRegistration): registration is LazyMask {
  return typeof (registration as LazyMask).load === "function";
}

/**
 * Registers a named mask for `<orb-mask-input mask="name">`. A registered name
 * takes precedence over a built-in mask of the same name.
 *
 * Pass a definition to bundle the mask eagerly, or `{ load: () => import(...) }`
 * to have it code-split and fetched the first time a field uses it.
 *
 * @example
 * registerMask("plate", {
 *   extract: (text) => text.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
 *   format: (raw) => raw.slice(0, 3) + (raw.length > 3 ? `-${raw.slice(3, 6)}` : ""),
 * });
 * registerMask("iban", { load: () => import("./masks/iban.js") });
 */
export function registerMask(name: string, mask: MaskRegistration): void {
  set(name, mask);
  notify();
}

/** Registers several named masks at once. See {@link registerMask}. */
export function registerMasks(masks: Record<string, MaskRegistration>): void {
  for (const [name, mask] of Object.entries(masks)) set(name, mask);
  notify();
}

function set(name: string, mask: MaskRegistration) {
  registry.set(name, mask);
  // Drop a previously loaded mask so the new registration takes effect
  resolved.delete(name);
  pending.delete(name);
}

/**
 * Lets fields that are already on the page pick up a mask registered after
 * they loaded, coalescing bursts of registrations into one pass.
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
export function onMasksChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The registered mask for `name`. A lazy mask that hasn't loaded yet comes
 * back as a promise, and concurrent lookups share one load. Undefined when
 * nothing is registered under `name`.
 * @internal
 */
export function customMask(name: string): Mask | Promise<Mask> | undefined {
  const cached = resolved.get(name);
  if (cached) return cached;
  const inFlight = pending.get(name);
  if (inFlight) return inFlight;

  const registration = registry.get(name);
  if (!registration) return undefined;
  if (!isLazy(registration)) {
    const mask = normalizeMask(registration);
    resolved.set(name, mask);
    return mask;
  }

  const promise = (async () => {
    try {
      const mod = await registration.load();
      const definition = "default" in mod ? mod.default : mod;
      if (typeof definition?.extract !== "function" || typeof definition?.format !== "function") {
        throw new Error(`Mask "${name}" did not resolve to a mask definition`);
      }
      const mask = normalizeMask(definition);
      // A registration made while this one loaded wins
      if (registry.get(name) === registration) resolved.set(name, mask);
      return mask;
    } finally {
      if (pending.get(name) === promise) pending.delete(name);
    }
  })();
  pending.set(name, promise);
  return promise;
}
