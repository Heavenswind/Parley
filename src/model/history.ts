// Undo/redo as plain data: earlier versions, the current one, and undone versions that can be redone.

export interface Timeline<T> {
  past: T[];
  present: T;
  future: T[];
}

/** Oldest steps are dropped beyond this. */
export const UNDO_LIMIT = 200;

/**
 * Makes `next` the present. With `merge`, it replaces the present instead of adding an undo step,
 * so a burst of typing or one drag undoes in a single step. A new edit always clears the redo list.
 */
export function record<T>(t: Timeline<T>, next: T, merge = false): Timeline<T> {
  if (next === t.present) return t;
  if (merge) return { past: t.past, present: next, future: [] };
  return { past: [...t.past, t.present].slice(-UNDO_LIMIT), present: next, future: [] };
}

export function undo<T>(t: Timeline<T>): Timeline<T> {
  if (t.past.length === 0) return t;
  return { past: t.past.slice(0, -1), present: t.past[t.past.length - 1], future: [t.present, ...t.future] };
}

export function redo<T>(t: Timeline<T>): Timeline<T> {
  if (t.future.length === 0) return t;
  return { past: [...t.past, t.present], present: t.future[0], future: t.future.slice(1) };
}
