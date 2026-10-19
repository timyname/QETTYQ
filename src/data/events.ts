export type Locale = "ru" | "kk" | "en";
type Localized = Record<Locale, string>;

export type CityEvent = {
  id: string;
  title: Localized;
  venue: Localized;
  contentLanguage: Locale | "mul" | "und";
  startsAt: string | null;
  dateLabel: Localized;
  priceFrom: number | null;
  lat: number;
  lon: number;
  sourceName: string;
  sourceUrl: string;
  category: Localized;
  collections: Array<"culture" | "this_week" | "under_5000">;
  checkedAt: string;
};

// Curated pilot snapshot. Event facts remain linked to the publisher so the user
// can verify availability and price before leaving QETTYQ.
export const cityEvents: CityEvent[] = [
  {
    id: "visitastana-betasar-2026",
    title: { ru: "Выставка BETAŞAR", kk: "BETAŞAR көрмесі", en: "BETAŞAR exhibition" },
    venue: { ru: "Национальный музей РК", kk: "ҚР Ұлттық музейі", en: "National Museum of Kazakhstan" },
    contentLanguage: "und",
    startsAt: null,
    dateLabel: { ru: "до 31 октября", kk: "31 қазанға дейін", en: "until 31 October" },
    priceFrom: null,
    lat: 51.1182297,
    lon: 71.4693823,
    sourceName: "Visit Astana",
    sourceUrl: "https://visitastana.kz/ru/",
    category: { ru: "Выставка", kk: "Көрме", en: "Exhibition" },
    collections: ["culture", "this_week"],
    checkedAt: "2026-10-19T00:00:00+05:00",
  },
  {
    id: "visitastana-lost-world-2026",
    title: { ru: "Затерянный мир Великой степи", kk: "Ұлы даланың жоғалған әлемі", en: "Lost World of the Great Steppe" },
    venue: { ru: "Национальный музей РК", kk: "ҚР Ұлттық музейі", en: "National Museum of Kazakhstan" },
    contentLanguage: "und",
    startsAt: null,
    dateLabel: { ru: "до 31 октября", kk: "31 қазанға дейін", en: "until 31 October" },
    priceFrom: null,
    lat: 51.1182297,
    lon: 71.4693823,
    sourceName: "Visit Astana",
    sourceUrl: "https://visitastana.kz/ru/",
    category: { ru: "Экскурсия", kk: "Экскурсия", en: "Guided tour" },
    collections: ["culture", "this_week"],
    checkedAt: "2026-10-19T00:00:00+05:00",
  },
  {
    id: "visitastana-republic-day-2026",
    title: { ru: "Концерт ко Дню Республики", kk: "Республика күніне арналған концерт", en: "Republic Day concert" },
    venue: { ru: "Дворец Жастар", kk: "Жастар сарайы", en: "Zhastar Palace" },
    contentLanguage: "und",
    startsAt: "2026-10-22T19:00:00+05:00",
    dateLabel: { ru: "22 октября, 19:00", kk: "22 қазан, 19:00", en: "22 October, 19:00" },
    priceFrom: 2000,
    lat: 51.1715762,
    lon: 71.4281005,
    sourceName: "Visit Astana",
    sourceUrl: "https://visitastana.kz/ru/",
    category: { ru: "Концерт", kk: "Концерт", en: "Concert" },
    collections: ["culture", "this_week", "under_5000"],
    checkedAt: "2026-10-19T00:00:00+05:00",
  },
  {
    id: "ticketon-fashion-week-2026",
    title: { ru: "World Designers Fashion Week Astana", kk: "World Designers Fashion Week Astana", en: "World Designers Fashion Week Astana" },
    venue: { ru: "Конгресс-центр", kk: "Конгресс-орталық", en: "Congress Centre" },
    contentLanguage: "und",
    startsAt: "2026-10-23T18:00:00+05:00",
    dateLabel: { ru: "23 октября, 18:00", kk: "23 қазан, 18:00", en: "23 October, 18:00" },
    priceFrom: 15000,
    lat: 51.0924049,
    lon: 71.4113474,
    sourceName: "Freedom Ticketon",
    sourceUrl: "https://ticketon.kz/astana?lang=ru",
    category: { ru: "Событие", kk: "Іс-шара", en: "Event" },
    collections: ["this_week"],
    checkedAt: "2026-10-19T00:00:00+05:00",
  },
];
