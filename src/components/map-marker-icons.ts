/** Only verified category strings select icons; no guessed cuisine or price. */
export function categoryDisplayName(category: string): string {
  const labels: Record<string, string> = { cafe: 'Кафе', coffee: 'Кофейня', restaurant: 'Ресторан', fast_food: 'Быстрый перекус', theatre: 'Театр', arts_centre: 'Искусство', museum: 'Музей', park: 'Парк', garden: 'Сад', viewpoint: 'Видовая точка' };
  return labels[category] ?? (/^[а-яёқғңәөүһіА-ЯЁҚҒҢӘӨҮҺІ\s-]+$/u.test(category) ? category : 'Место в городе');
}
export function markerIconPaths(category: string): string[] {
  const key = category.toLowerCase();
  if (/fast_food|snack|фастфуд|закусоч/.test(key)) return ['M4 10h16M3 14h18M5 18h14', 'M5 9a7 6 0 0 1 14 0', 'M5 18v2h14v-2', 'M9 5h.01M14 4h.01'];
  if (/coffee|кофе/.test(key)) return ['M4 7h12v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Z', 'M16 9h2a3 3 0 0 1 0 6h-2', 'M7 2v2M12 2v2'];
  if (/restaurant|ресторан/.test(key)) return ['M3 17h18M5 15a7 7 0 0 1 14 0', 'M12 6V4M10 4h4M4 21h16'];
  if (/cafe|кафе|food/.test(key)) return ['M4 3v5a3 3 0 0 0 6 0V3M7 3v18', 'M18 3v18M18 3c-4 4-4 9 0 9'];
  if (/theatre|театр|балет|спектак/.test(key)) return ['M3 5c3 2 6 2 9 0v7c0 4-4 6-4 6s-5-2-5-6V5Z', 'M5 9h1M9 9h1M6 13c1 1 2 1 3 0', 'M15 4c2 0 4-1 6-2v9c0 4-4 6-4 6', 'M16 7h1M18 11h1'];
  if (/music|концерт|музык|rock/.test(key)) return ['M9 18V5l12-2v13', 'M9 15c-5-2-8 5-3 6 2 0 3-1 3-3', 'M21 13c-5-2-8 5-3 6 2 0 3-1 3-3'];
  if (/park|garden|парк|walk|прогул/.test(key)) return ['M12 2 4 12h4l-4 6h16l-4-6h4L12 2Z', 'M12 18v4'];
  if (/museum|culture|музей|arts/.test(key)) return ['M3 9h18L12 3 3 9Z', 'M5 10v8M10 10v8M14 10v8M19 10v8', 'M3 21h18'];
  return ['M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z', 'M10 10h4M12 8v4'];
}
