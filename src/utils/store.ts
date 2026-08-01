import { useSyncExternalStore } from "react";

/**
 * A store in thirty lines.
 *
 * There is one thing worth holding globally here — the host's state and the
 * connection around it — and it arrives from outside React entirely. A state
 * library would be a dependency, a bundle, and a set of conventions in exchange
 * for a subscribe function this app already needs to write.
 *
 * `useSyncExternalStore` is the point: it is the API React added precisely for
 * external sources like a socket, and it gets tearing right during concurrent
 * rendering in a way that a `useEffect` + `setState` pair does not.
 */

export interface Store<T> {
  get(): T;
  set(next: T | ((current: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set(next) {
      const resolved = typeof next === "function" ? (next as (current: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: Store<T>): T;
export function useStore<T, S>(store: Store<T>, select: (value: T) => S): S;
export function useStore<T, S>(store: Store<T>, select?: (value: T) => S): T | S {
  return useSyncExternalStore(
    store.subscribe,
    () => (select ? select(store.get()) : store.get()),
    () => (select ? select(store.get()) : store.get()),
  );
}
