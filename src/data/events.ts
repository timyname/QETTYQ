export type Locale = "ru" | "kk" | "en";
type Localized = Record<Locale, string>;

export type CityEvent = {
  id: string;
  title: Localized;
  venue: Localized;
  contentLanguage: Locale | "multi";
  startsAt: string | null;
  dateLabel: string;
  priceLabel: string;
  lat: number;
  lon: number;
  sourceName: string;
  sourceUrl: string;
  category: string;
};

// Curated pilot snapshot. Event facts remain linked to the publisher so the user
// can verify availability and price before leaving QETTYQ.
export const cityEvents: CityEvent[] = [
  {
    id: "visitastana-betasar-2026",
    title: { ru: "Выставка BETAŞAR", kk: "BETAŞAR көрмесі", en: "BETAŞAR exhibition" },
    venue: { ru: "Национальный музей РК", kk: "ҚР Ұлттық музейі", en: "National Museum of Kazakhstan" },
    contentLanguage: "multi",
    startsAt: null,
    dateLabel: "до 31 октября",
    priceLabel: "уточнить у организатора",
    lat: 51.1182297,
    lon: 71.4693823,
    sourceName: "Visit Astana",
    sourceUrl: "https://visitastana.kz/ru/",
    category: "Выставка",
  },
  {
    id: "visitastana-lost-world-2026",
    title: { ru: "Затерянный мир Великой степи", kk: "Ұлы даланың жоғалған әлемі", en: "Lost World of the Great Steppe" },
    venue: { ru: "Национальный музей РК", kk: "ҚР Ұлттық музейі", en: "National Museum of Kazakhstan" },
    contentLanguage: "ru",
    startsAt: null,
    dateLabel: "до 31 октября",
    priceLabel: "по ссылке организатора",
    lat: 51.1182297,
    lon: 71.4693823,
    sourceName: "Visit Astana",
    sourceUrl: "https://visitastana.kz/ru/",
    category: "Экскурсия",
  },
  {
    id: "visitastana-republic-day-2026",
    title: { ru: "Концерт ко Дню Республики", kk: "Республика күніне арналған концерт", en: "Republic Day concert" },
    venue: { ru: "Дворец Жастар", kk: "Жастар сарайы", en: "Zhastar Palace" },
    contentLanguage: "kk",
    startsAt: "2026-10-22T19:00:00+05:00",
    dateLabel: "22 октября, 19:00",
    priceLabel: "от 2 000 ₸",
    lat: 51.1715762,
    lon: 71.4281005,
    sourceName: "Visit Astana",
    sourceUrl: "https://visitastana.kz/ru/",
    category: "Концерт",
  },
  {
    id: "ticketon-fashion-week-2026",
    title: { ru: "World Designers Fashion Week Astana", kk: "World Designers Fashion Week Astana", en: "World Designers Fashion Week Astana" },
    venue: { ru: "Конгресс-центр", kk: "Конгресс-орталық", en: "Congress Centre" },
    contentLanguage: "en",
    startsAt: "2026-10-23T18:00:00+05:00",
    dateLabel: "23 октября, 18:00",
    priceLabel: "от 15 000 ₸",
    lat: 51.0924049,
    lon: 71.4113474,
    sourceName: "Freedom Ticketon",
    sourceUrl: "https://ticketon.kz/astana?lang=ru",
    category: "Событие",
  },
];
