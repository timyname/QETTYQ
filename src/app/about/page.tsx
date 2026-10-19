import Link from "next/link";

export default function AboutPage() {
  return <main className="info-page">
    <Link href="/" className="info-back">← Вернуться в QETTYQ</Link>
    <span className="info-kicker">О ПРОДУКТЕ</span>
    <h1>Не список мест.<br />Решение под твой день.</h1>
    <p>QETTYQ сопоставляет свободное время, бюджет, интересы и географию, а затем показывает до трёх вариантов из проверяемого набора данных.</p>
    <section><h2>Что уже работает</h2><ul><li>реальные POI Астаны с provenance;</li><li>детерминированные ограничения и ranking;</li><li>карточки интересов и честные unknown-состояния;</li><li>fallback без выдуманных событий и цен.</li></ul></section>
    <section><h2>Чего мы не обещаем</h2><p>Наличие билетов, свободных мест и точное время пути меняются. Если поле не подтверждено, интерфейс показывает это прямо.</p></section>
  </main>;
}
