/** Unjudged is never silently converted into irrelevant. Empty gold has no recall denominator. */
export function retrievalMetrics(ids: string[], judgments: Record<string, number>) {
  const unique = [...new Set(ids)], unjudged = unique.filter(id => !Object.hasOwn(judgments, id));
  const relevant = Object.values(judgments).filter(grade => grade > 0).length;
  if (unjudged.length || !relevant) return { returnedRecallAt10: null, ndcgAt3: null, relevant, unjudged };
  const dcg = (grades: number[]) => grades.slice(0, 3).reduce((sum, grade, i) => sum + (2 ** grade - 1) / Math.log2(i + 2), 0);
  const ideal = dcg(Object.values(judgments).sort((a, b) => b - a));
  return { returnedRecallAt10: unique.slice(0, 10).filter(id => judgments[id] > 0).length / relevant,
    ndcgAt3: dcg(unique.map(id => judgments[id])) / ideal, relevant, unjudged };
}

export function average(values: Array<number | null>) {
  const known = values.filter((value): value is number => value !== null);
  return { value: known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : null, denominator: known.length };
}

export function percentile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)] : null;
}
