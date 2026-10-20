import type { Place } from "../../domain/types";
/** Observed cuisine tags/name matches, NOT a claim that a dish is on the menu. */
const cuisineGroups: [RegExp, RegExp][] = [
  [/япон|жапон|japan|суши|sushi|рамен|рамэн|ramen/iu, /japan|sushi|ramen|япон|суши|рамен|рамэн/iu],
  [/донер|д[её]нер|шаурм|doner|döner|shawarma/iu, /doner|döner|kebab|shawarma|донер|д[её]нер|шаурм/iu],
  [/пицц|pizza|итал|italian/iu, /pizza|italian|пицц|итал/iu],
  [/корей|кор[её]й|korean|кәріс/iu, /korean|корей|кәріс/iu],
  [/қытай|китай|chinese/iu, /chinese|китай|қытай/iu],
  [/казах|қазақ|бешбармак|бесбармақ|kazakh/iu, /kazakh|regional|казах|қазақ|бешбармак|бесбармақ/iu],
  [/индий|үнді|indian|карри|curry/iu, /indian|curry|индий|үнді/iu],
  [/веган|vegan|вегетариан|vegetarian/iu, /vegan|vegetarian|веган|вегетариан/iu],
  [/бургер|burger/iu, /burger|бургер/iu],
  [/кофе|coffee|кофей|кафе|café/iu, /coffee|cafe|кофе|кафе/iu],
];
export function requestedFoodMatch(place: Pick<Place, "name" | "tags" | "cuisines">, text: string, extractedTerm?: string | null) {
  const observed = `${place.name} ${place.tags.join(" ")} ${(place.cuisines ?? []).join(" ")}`;
  const groups = cuisineGroups.flatMap(([query, content]) => {
    const matches = [...text.matchAll(new RegExp(query.source, "giu"))];
    return matches.map(match => ({ content, negative: /(?:^|[^\p{L}])(?:без|не|no|not|without)\s+(?:(?:хочу|нужн\p{L}*|want)\s+)?$/iu.test(text.slice(0, match.index)) }));
  });
  if (groups.length) return groups.every(({ content, negative }) => negative ? !content.test(observed) : content.test(observed));
  if (extractedTerm) {
    const known = cuisineGroups.filter(([query]) => query.test(extractedTerm));
    return known.length ? known.every(([, content]) => content.test(observed)) : observed.toLocaleLowerCase().includes(extractedTerm.toLocaleLowerCase());
  }
  return true;
}
