/** Small, versioned lexical rules; no inferred venue facts or model calls. */
export const LEXICAL_QUERY_VERSION = "multilingual-lexical-v3";
export const normalizeLexical = (text: string) => text.normalize("NFKC").toLocaleLowerCase("ru-RU").replace(/ё/g, "е");

/** Negation applies only immediately around a category mention, never across a clause. */
export function isNegatedMention(query: string, match: RegExpMatchArray): boolean {
  const start = match.index ?? 0;
  const leading = match[0].match(/^[^\p{L}\p{N}]*/u)?.[0].length ?? 0;
  const before = query.slice(0, start + leading);
  const after = query.slice(start + match[0].length);
  return /(?:сіз|сыз)$/u.test(match[0])
    || /(?:^|[^\p{L}])без$/u.test(before)
    || /(?:^|[^\p{L}])(?:без|вместо|не(?:\s+(?:хочу|хотим|нужен|нужны|нужно|интересует|нравится))?|(?:no|not|without)(?:\s+(?:want|like))?|except|exclude|excluding|avoid|instead\s+of|(?:don['’]?t|do\s+not)\s+(?:want|like))(?:\s+(?:in|to|at))?(?:\s+(?:a|an|any|the|в|на))?\s+$/u.test(before)
    || /^\s+(?:емес|керек\s+емес|қоспа)(?=$|[^\p{L}])/u.test(after)
    // Exact Kazakh negative predicates, attached to this mention only. Do not
    // cross a clause, or read positive "ұнайды" / "ғана емес" as rejection.
    || /^\s+(?:(?:маған|бізге)\s+)?(?:ұнамайды|ұнатпаймын|қаламаймын|қажет\s+емес|барғым\s+келмейді)(?=$|[^\p{L}])/u.test(after)
    || /^\s+(?:(?:мне|нам)\s+)?не\s+(?:хочу|хотим|нужен|нужны|нужно|интересует|интересуют|нравится|нравятся)(?=$|[^\p{L}])/u.test(after);
}

export const placeCategoryRules = [
  { query: /музе\p{L}*|museum\p{L}*|мұражай\p{L}*/gu, tags: ["museum"] },
  { query: /театр\p{L}*|theat\p{L}*|спектак\p{L}*|қойылым\p{L}*/gu, tags: ["theatre"] },
  { query: /кофе\p{L}*|coffee|кафе|cafe|café|кофехана\p{L}*/gu, tags: ["cafe"] },
  { query: /парк\p{L}*|park\p{L}*|саябақ\p{L}*|garden\p{L}*|бақша\p{L}*/gu, tags: ["park", "garden"] },
  { query: /ресторан\p{L}*|restaurant\p{L}*|мейрамхана\p{L}*/gu, tags: ["restaurant"] },
  { query: /библиотек\p{L}*|librar\p{L}*|кітапхана\p{L}*/gu, tags: ["library"] },
];

export function placeCategoryQuery(text: string) {
  const query = normalizeLexical(text);
  const wanted: string[] = [], excluded: string[] = [];
  for (const rule of placeCategoryRules) {
    const matches = [...query.matchAll(new RegExp(rule.query.source, rule.query.flags))];
    if (matches.some(match => isNegatedMention(query, match))) excluded.push(...rule.tags);
    if (matches.some(match => !isNegatedMention(query, match))) wanted.push(...rule.tags);
  }
  return { wanted: [...new Set(wanted)], excluded: [...new Set(excluded)] };
}

/** Literal whole-name match only: no translation, transliteration, or fuzzy identity. */
export function containsPlaceName(query: string, name: string): boolean {
  const value = normalizeLexical(name).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (value.length < 3 || placeCategoryRules.some(rule => value.replace(new RegExp(rule.query.source, rule.query.flags), "").trim() === "")) return false;
  const words = normalizeLexical(query).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return (` ${words} `).includes(` ${value} `);
}
