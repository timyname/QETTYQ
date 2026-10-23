/** The profile stores distinct taxonomy tags, not the number of liked cards. */
export function preferenceCategorySummary(count: number, language: 'ru' | 'kk' | 'en'): string {
  return {
    ru: `Категорий в предпочтениях: ${count}`,
    kk: `Таңдаулы санаттар саны: ${count}`,
    en: `Preference categories: ${count}`,
  }[language];
}
