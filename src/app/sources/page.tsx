import Link from "next/link";

export default function SourcesPage() {
  return <main className="info-page">
    <Link href="/" className="info-back">← Вернуться в QETTYQ</Link>
    <span className="info-kicker">ПРОИСХОЖДЕНИЕ ДАННЫХ</span>
    <h1>Каждый факт<br />ведёт к источнику.</h1>
    <section><h2>OpenStreetMap</h2><p>Первый snapshot содержит 80 именованных POI Астаны. Для каждой записи сохранены OSM ID, URL и время получения.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL 1.0 ↗</a></section>
    <section><h2>Ограничения</h2><p>OSM не подтверждает цену, доступность билета или свободное место. Такие поля остаются неизвестными. Публичный Overpass не используется на каждый пользовательский запрос.</p></section>
  </main>;
}
