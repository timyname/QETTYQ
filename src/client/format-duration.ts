/** Compact elapsed time, not a clock time. Unknown values remain unknown. */
export function formatDurationMinutes(minutes: number | null, language: 'ru' | 'kk' | 'en' = 'ru'): string | null {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return null;
  const rounded = Math.ceil(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  const units = { ru: ['ч', 'мин'], kk: ['сағ', 'мин'], en: ['h', 'min'] }[language];
  if (!hours) return `${rest} ${units[1]}`;
  return `${hours} ${units[0]}${rest ? ` ${rest} ${units[1]}` : ''}`;
}
