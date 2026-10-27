/**
 * Rebuilds `items` in the order given by `keys`. Items whose key is missing from
 * `keys` keep their relative order at the end, and unknown keys are ignored, so a
 * stale or partial ordering can never drop or duplicate an item.
 */
export function orderByKeys<T>(items: T[], keys: string[], keyOf: (item: T) => string): T[] {
  const byKey = new Map(items.map((item) => [keyOf(item), item]));
  const seen = new Set<string>();
  const ordered: T[] = [];
  for (const key of keys) {
    const item = byKey.get(key);
    if (item && !seen.has(key)) {
      ordered.push(item);
      seen.add(key);
    }
  }
  for (const item of items) if (!seen.has(keyOf(item))) ordered.push(item);
  return ordered;
}

/**
 * Moves `key` by `delta` places (negative = up), clamped to the list's ends —
 * the keyboard counterpart of dragging a row. Returns the list unchanged when the
 * key is absent or the move would go past an end.
 */
export function moveKey(keys: string[], key: string, delta: number): string[] {
  const from = keys.indexOf(key);
  if (from === -1) return keys;
  const to = Math.min(keys.length - 1, Math.max(0, from + delta));
  if (to === from) return keys;
  const next = keys.slice();
  next.splice(from, 1);
  next.splice(to, 0, key);
  return next;
}
