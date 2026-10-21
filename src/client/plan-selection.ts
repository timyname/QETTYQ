/** Evaluate a selected stop without silently replacing the user's ordered draft. */
export function includePlanStop(ids: readonly string[], selectedId: string, limit = 5): string[] {
  const unique = [...new Set(ids)];
  if (unique.includes(selectedId) || unique.length >= limit) return unique;
  return [...unique, selectedId];
}
