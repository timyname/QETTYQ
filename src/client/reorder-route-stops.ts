/** Stable immutable move; invalid input cannot remove or duplicate a stop. */
export function reorderRouteStops(ids: readonly string[], from: number, to: number): string[] {
  const result = [...ids];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= ids.length || to >= ids.length || from === to || new Set(ids).size !== ids.length) return result;
  const [id] = result.splice(from, 1);
  result.splice(to, 0, id);
  return result;
}
