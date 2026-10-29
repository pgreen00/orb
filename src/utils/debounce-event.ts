import { EventEmitter } from "@stencil/core";

export type DebouncedEventEmitter<T = any> = EventEmitter<T> & {
  /** Drops a pending emit, such as when the component is removed */
  cancel: () => void;
};

/**
 * Wraps a Stencil event so it only emits after `wait` milliseconds without
 * another emit. With a `wait` of 0 or less, it emits right away. Wrapping an
 * already wrapped event debounces the original, not the wrapper.
 */
export const debounceEvent = <T = any>(event: EventEmitter<T>, wait: number): DebouncedEventEmitter<T> => {
  const original: EventEmitter<T> = (event as any)._original || event;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timer);
  const emit = (detail?: T) => {
    cancel();
    if (!(wait > 0)) return original.emit(detail);
    timer = setTimeout(() => original.emit(detail), wait);
    return undefined;
  };
  return { _original: original, emit, cancel } as unknown as DebouncedEventEmitter<T>;
};
