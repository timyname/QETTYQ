import fs from 'node:fs/promises';

// v6 remains byte-for-byte unchanged. This revision changes only slide 7's
// implementation boundary and slide 10's status, supplied by the orchestrator.
const sourcePath = '/Users/phonelab/Documents/QETTYQ/presentation/build-deck-v6.mjs';
let source = await fs.readFile(sourcePath, 'utf8');
function replaceExactly(oldText, newText) {
  if (!source.includes(oldText)) throw new Error('v6 source differs: expected '+oldText);
  source = source.replace(oldText, newText);
}
source = source.replaceAll('v6', 'v7');
source = source.replace("from '/Users/phonelab/.cache/", "from 'file:///Users/phonelab/.cache/");
replaceExactly("title(s,'Как устроен подбор с RAG',1100,true,50)", "title(s,'Следующий шаг: RAG',1100,true,50)");
replaceExactly("row(s,'03','Короткое объяснение','AI получает найденные записи и объясняет выбор.',542,1100,true);", "row(s,'03','Короткое объяснение','AI будет получать найденные записи и объяснять выбор.',515,1100,true);\n  label(s,'Сейчас: поиск и объяснение по правилам. Внешняя модель ещё не подключена.',64,650,1100,true);");
replaceExactly("'Интерактивные макеты\\nи программный прототип.\\nПеренос нового UI продолжается.'", "'Локальный web app: свайпы, чат,\\nOSM-карта и планы.\\nПубличное обновление ещё впереди.'");
replaceExactly('RAG здесь означает поиск по городской базе с последующим объяснением найденного.', 'На момент этой версии работает поиск и объяснение по правилам. Внешняя модель ещё не подключена. Следующий шаг RAG означает поиск по городской базе с последующим объяснением найденного моделью.');
replaceExactly('Только после этого модель получает небольшой набор разрешённых сведений и формулирует ответ.', 'После подключения модель будет получать небольшой набор разрешённых сведений и формулировать ответ.');
replaceExactly('Сейчас есть программный прототип и новый интерактивный дизайн. Команда переносит новые экраны в веб-приложение и проверяет каждую функцию отдельно.', 'Сейчас есть локальное веб-приложение со свайпами, чатом, OSM-картой и планами. Публичное обновление ещё впереди. Оркестратор подтвердил локальные проверки. Это не подтверждает внешний AI или точный маршрутизатор.');
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
