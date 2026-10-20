// Initialise only; do not execute Penpot drawing from this file's top level.
// Requires chat-ui-native.js: storage.q, storage.ui and storage.screenDoc.
// Root orchestration, in small calls:
//   storage.editors.prepareGroup('08')
//   storage.editors.drawEditor('08')
//   storage.editors.drawResult('08', 0) // one call for each option
//   storage.editors.bindOwner('08')    // after every destination exists
//   storage.editors.bindCity()
// There is deliberately no arbitrary text input, runtime state, storage or API.
// Shared editors choose explicit example presets; every result corresponds to
// the clicked preset. Underlying original screens remain static, disclosed both
// visibly and in pluginData. This keeps the design review bounded (31 boards),
// rather than fabricating a working form with hundreds of cloned field states.

if (!storage.q || !storage.ui || !storage.screenDoc) {
  throw new Error('Run chat-ui-native.js and load screenDoc before control editors.');
}

storage.editors = {};
const E = storage.editors;
const Q = storage.q;
const U = storage.ui;
const norm = shape => shape.name.replaceAll(' / ', '/');
const disclosure = 'Это проверка дизайна. Пример не сохраняется; исходный экран пока статичен.';

E.groups = [
  {
    id: '08', title: 'Время и начало', fields: ['Свободное время', 'Когда начнём', 'Запас времени'],
    hint: 'Выбери готовый пример условий. Реальная дата и числовой ввод появятся при вёрстке.',
    options: [
      { key: 'short', label: '60 минут · сейчас', values: ['60 минут', 'Сейчас', '10 минут'] },
      { key: 'usual', label: '120 минут · сейчас', values: ['120 минут', 'Сейчас', '20 минут'] },
      { key: 'later', label: '180 минут · позже', values: ['180 минут', '24.10.2026 · 14:00 · пример', '30 минут'] },
    ],
  },
  {
    id: '09', title: 'Бюджет подбора', fields: ['Лимит', 'Как считать', 'Неизвестная стоимость'],
    hint: 'Это условия пользователя, не цена реального события. Неизвестный лимит отличается от нуля.',
    options: [
      { key: 'person', label: '5 000 ₸ · на человека', values: ['5 000 ₸', 'На одного человека', 'Показывать отдельно'] },
      { key: 'free', label: 'Только бесплатное', values: ['0 ₸', 'На одного человека', 'Исключить из строгой выдачи'] },
      { key: 'unknown', label: 'Пока не знаю бюджет', values: ['Лимит не задан', 'На одного человека', 'Явно отмечать в карточке'] },
    ],
  },
  {
    id: '10', title: 'Возврат и передвижение', fields: ['Передвижение', 'Вернуться в точку A', 'Дополнительный путь'],
    hint: 'Начальную и конечную точки выбираем отдельно на карте. В примере доступен пеший режим.',
    options: [
      { key: 'oneway', label: 'Пешком · без возврата', values: ['Пешком', 'Нет', 'Не добавляем обратную дорогу'] },
      { key: 'return', label: 'Пешком · вернуться к A', values: ['Пешком', 'Да', 'Возврат нужно включить в расчёт'] },
    ],
  },
  {
    id: '19', title: 'Фильтры карты', fields: ['Когда', 'Категория', 'Цена', 'Язык события', 'Достопримечательности', 'Доступность'],
    hint: 'Готовые наборы показывают состояния фильтров. Они не доказывают наличие подходящих событий.',
    options: [
      { key: 'all', label: 'Сегодня · все категории', values: ['Сегодня', 'Все', 'Неизвестные цены отдельно', 'Любой · неизвестный отдельно', 'Показывать', 'Без обязательного требования'] },
      { key: 'culture', label: 'Культура · қазақша', values: ['Сегодня', 'Театр и культура', 'До 5 000 ₸ / человек', 'Қазақша · подтверждённый', 'Скрыть', 'Не заявлять без источника'] },
      { key: 'free', label: 'Бесплатная прогулка', values: ['Сегодня', 'Прогулки', 'Только подтверждённо бесплатно', 'Любой', 'Показывать', 'Не заявлять без источника'] },
    ],
  },
  {
    id: '36', title: 'Основное о встрече', fields: ['Название', 'Категория', 'Организатор', 'Описание'],
    hint: 'Учебные черновики для проверки формы. Это не действующие мероприятия и не реальные организаторы.',
    options: [
      { key: 'walk', label: 'Пример: прогулка', values: ['Совместная прогулка · пример', 'Прогулки', 'Не указан', 'Спокойная прогулка по городу · пример'] },
      { key: 'run', label: 'Пример: пробежка', values: ['Вечерняя пробежка · пример', 'Спорт', 'Не указан', 'Маршрут и темп уточнит организатор'] },
    ],
  },
  {
    id: '37', title: 'Дата и место встречи', fields: ['Дата', 'Начало', 'Длительность', 'Место', 'Как найти вход'],
    hint: 'Пример полей черновика, не афиша. Координаты и право проводить встречу здесь не подтверждены.',
    options: [
      { key: 'hour', label: 'Пример: 24 октября · 60 мин', values: ['24.10.2026 · пример', '14:00 · Asia/Almaty', '60 минут · пример', 'Ещё не выбрано', 'Не указано'] },
      { key: 'evening', label: 'Пример: 24 октября · 90 мин', values: ['24.10.2026 · пример', '18:00 · Asia/Almaty', '90 минут · пример', 'Ещё не выбрано', 'Уточняется отдельно'] },
    ],
  },
  {
    id: '38', title: 'Условия участия', fields: ['Тип цены', 'Цена относится к', 'Язык', 'Контакт организатора', 'Количество мест'],
    hint: 'Не подставляем случайный номер, цену или наличие мест. Контакт должен принадлежать организатору.',
    options: [
      { key: 'unknown', label: 'Неизвестные условия', values: ['Стоимость неизвестна', 'Не указано', 'Не указан', 'Не добавлен', 'Неизвестно · уточнить у организатора'] },
      { key: 'free', label: 'Пример: бесплатно · RU', values: ['Бесплатно · ввод автора примера', 'На человека', 'Русский · выбор автора примера', 'Не добавлен', 'Неизвестно · уточнить у организатора'] },
    ],
  },
  {
    id: '39', title: 'Изображение и права', fields: ['Обложка', 'Право использования', 'Публикация'],
    hint: 'Проверяем выбор обложки и подтверждение прав. Загрузки и публичной публикации в Penpot нет.',
    options: [
      { key: 'illustration', label: 'Иллюстрация категории', values: ['Иллюстрация идеи · не фото события', 'Проверяется перед использованием', 'Только локальный черновик'], picture: true },
      { key: 'own', label: 'Своя обложка · пример', values: ['Файл ещё не загружен', 'Автор должен подтвердить права', 'Публикация не выполняется'] },
    ],
  },
  {
    id: '45', title: 'Язык интерфейса', fields: ['Выбранный язык', 'Язык мероприятия', 'Готовность'],
    hint: 'Это выбранное состояние настройки. Полный перевод всех экранов и данные о языке события проверяются отдельно.',
    options: [
      { key: 'ru', label: 'Русский', values: ['Русский', 'Настраивается отдельно', 'Демонстрация выбора · не live locale'] },
      { key: 'kk', label: 'Қазақша', values: ['Қазақша', 'Бөлек көрсетіледі', 'Демонстрация выбора · не полный перевод'] },
      { key: 'en', label: 'English', values: ['English', 'Shown separately', 'Selection preview · not a full translation'] },
    ],
  },
];

E.groupIds = E.groups.map(group => group.id);
E.config = id => {
  const group = E.groups.find(group => group.id === String(id));
  if (!group) throw new Error('Unknown editor group: ' + id);
  return group;
};
E.editorId = id => id + '.editor';
E.resultId = (id, key) => id + '.selected.' + key;
E.expectedBoards = E.groups.reduce((total, group) => total + 1 + group.options.length, 0);

// Prepare destinations before drawing or binding any enabled control.
E.prepareGroup = id => {
  const group = E.config(id);
  const index = E.groupIds.indexOf(group.id);
  const items = [[E.editorId(id), group.title], ...group.options.map(option => [E.resultId(id, option.key), group.title + ' · ' + option.label])];
  items.forEach(([boardId, title], variantIndex) => {
    const board = U.board(boardId, title, 5200 + variantIndex * 510, 19000 + index * 1040, 430, 932);
    board.setPluginData('status', 'native-design-editor');
    board.setPluginData('ownerScreenId', group.id);
    board.setPluginData('dataMode', ['36', '37', '38', '39'].includes(group.id) ? 'synthetic_test' : 'user_context_example');
    board.setPluginData('runtime-persistence', 'not-implemented');
    board.setPluginData('underlying-static', 'true');
  });
  return { prepared: id, boards: items.length };
};
E.requirePrepared = id => {
  const group = E.config(id);
  const ids = [group.id, E.editorId(id), ...group.options.map(option => E.resultId(id, option.key))];
  for (const boardId of ids) if (!Q.boards[boardId]) throw new Error('Prepare destination first: ' + boardId);
  return group;
};
E.clearDrawing = board => {
  for (const child of [...board.children]) child.remove();
  for (const interaction of [...board.interactions]) board.removeInteraction(interaction);
};

E.header = (board, group, selected = false) => {
  Q.text(board, 22, 38, 330, selected ? 'ВЫБРАННЫЙ ПРИМЕР' : 'НАСТРОЙКА · ПРЕВЬЮ', 11, 600, Q.c.jade, 'editor/eyebrow');
  Q.text(board, 22, 78, 386, group.title, 28, 700, Q.c.ink, 'editor/title');
  Q.text(board, 22, 126, 386, selected ? 'Проверь значения перед подтверждением.' : group.hint, 13, 400, Q.c.muted, 'editor/description');
  U.button(board, 364, 26, 44, 44, '', group.id, 'secondary', 'x', false, 'editor/close');
  Q.text(board, 22, 846, 386, disclosure, 12, 400, Q.c.muted, 'editor/limitation');
};

// One editor per owner: presets rather than false editable text fields.
// Every original field opens the same concise group editor intentionally.
E.drawEditor = id => {
  const group = E.requirePrepared(id);
  const board = Q.boards[E.editorId(id)];
  E.clearDrawing(board);
  E.header(board, group);
  Q.text(board, 22, 218, 386, 'В этой настройке', 16, 700, Q.c.deep, 'editor/fields-title');
  // Plain text inventory is deliberately not drawn as an unresponsive form.
  group.fields.forEach((label, index) => {
    Q.text(board, 26, 260 + index * 34, 376, String(index + 1).padStart(2, '0') + '  ' + label, 14, 400, Q.c.ink, 'editor/field-description-' + index);
  });
  const y = Math.max(438, 266 + group.fields.length * 34);
  Q.text(board, 22, y, 386, 'Выбери пример для проверки', 13, 600, Q.c.jade, 'editor/options-title');
  group.options.forEach((option, index) => {
    const button = U.button(board, 22, y + 36 + index * 66, 386, 54, option.label, E.resultId(id, option.key), index === 0 ? 'primary' : 'secondary', 'chevron-right', false, 'editor/preset-' + option.key);
    button.setPluginData('preset-key', option.key);
    button.setPluginData('action-kind', 'show-selected-design-state');
  });
  U.button(board, 22, 774, 386, 52, 'Назад без изменений', group.id, 'secondary', 'chevron-left', false, 'editor/cancel');
  return { editor: E.editorId(id), presets: group.options.length, dynamicForm: false };
};

E.drawResult = (id, optionIndex = 0) => {
  const group = E.requirePrepared(id);
  const option = group.options[optionIndex];
  if (!option) throw new Error('Unknown preset index for ' + id);
  const board = Q.boards[E.resultId(id, option.key)];
  E.clearDrawing(board);
  E.header(board, group, true);
  Q.panel(board, 22, 204, 386, 62, 'editor/selection-surface', Q.c.soft, 18);
  Q.icon(board, 'check', 38, 225, 20, Q.c.jade);
  Q.text(board, 72, 224, 320, option.label, 15, 600, Q.c.deep, 'editor/selected-label');
  group.fields.forEach((label, index) => {
    const y = 290 + index * 64;
    Q.panel(board, 22, y, 386, 60, 'editor/value-surface-' + index, '#FFFFFF', 16);
    Q.text(board, 38, y + 8, 354, label, 11, 600, Q.c.muted, 'editor/value-label-' + index);
    Q.text(board, 38, y + 28, 354, option.values[index] || 'Не указано', 12, 600, Q.c.ink, 'editor/value-' + index);
  });
  board.setPluginData('selected-preset', option.key);
  board.setPluginData('selected-values', JSON.stringify(option.values));
  const confirm = U.button(board, 22, 712, 386, 52, 'Подтвердить пример', group.id, 'primary', 'check', false, 'editor/confirm');
  confirm.setPluginData('action-kind', 'design-confirmation-only');
  confirm.setPluginData('runtime-commit', 'not-implemented');
  U.button(board, 22, 774, 386, 52, 'Изменить выбор', E.editorId(id), 'secondary', 'chevron-left', false, 'editor/change');
  return { selected: E.resultId(id, option.key), values: option.values, saved: false };
};

E.bindOwner = id => {
  const group = E.requirePrepared(id);
  const owner = Q.boards[group.id];
  const source = storage.screenDoc.screens.find(screen => screen.id === group.id);
  const bindings = [];
  if (group.id === '45') {
    [['Русский', 'ru'], ['Қазақша', 'kk'], ['English', 'en']].forEach(([label, key]) => {
      const target = E.resultId(id, key);
      for (const name of ['chip/' + label, 'chip-label/' + label]) {
        const layer = U.find(owner, name);
        if (layer) U.link(layer, target);
      }
      const chip = U.find(owner, 'chip/' + label);
      if (chip) {
        U.hot(owner, chip.x - owner.x, chip.y - owner.y, chip.width, Math.max(44, chip.height), target, false, 'editor/language-hit-' + key);
        bindings.push(label);
      }
    });
  } else if (source) {
    const sourceRows = source.rows.slice();
    // final-details.js added accessibility after the original JSON was read.
    if (group.id === '19' && U.find(owner, 'row/Доступность') && !sourceRows.some(row => row.label === 'Доступность')) {
      sourceRows.push({ label: 'Доступность', value: 'Только подтверждённые свойства' });
    }
    sourceRows.forEach((row, index) => {
      const background = U.find(owner, 'content/row-' + index);
      if (!background) return;
      const y = 316 + index * 64;
      background.y = owner.y + y;
      background.resize(386, 62);
      const label = U.find(owner, 'row/' + row.label);
      const value = U.find(owner, 'value/' + row.label);
      let target = E.editorId(id);
      if (group.id === '10' && index < 2) target = '12';
      // Organizer venue reuses the map design with explicit mode metadata.
      // Map return routing must be implemented by the root integration.
      if (group.id === '37' && row.label === 'Место проведения') target = '12';
      for (const layer of [background, label, value].filter(Boolean)) {
        U.link(layer, target);
        layer.setPluginData('field-label', row.label);
        layer.setPluginData('design-editor-scope', group.id);
        if (target === '12') {
          layer.setPluginData('map-pick-role', group.id === '37' ? 'organizer-venue' : index === 0 ? 'origin' : 'destination');
          layer.setPluginData('returnTo', group.id);
        }
      }
      if (label) { label.y = owner.y + y + 9; label.fontSize = '13'; label.lineHeight = '1.25'; }
      if (value) { value.y = owner.y + y + 31; value.fontSize = '12'; value.lineHeight = '1.25'; }
      // Last-added common hit rectangle covers sibling labels and background.
      const hitName = 'editor/field-hit-' + index;
      const oldHit = U.find(owner, hitName);
      if (oldHit) oldHit.remove();
      const hit = U.hot(owner, 22, y, 386, 62, target, false, hitName);
      hit.setPluginData('field-label', row.label);
      if (target === '12') {
        hit.setPluginData('map-pick-role', group.id === '37' ? 'organizer-venue' : index === 0 ? 'origin' : 'destination');
        hit.setPluginData('returnTo', group.id);
      }
      bindings.push(row.label);
    });
    for (const slider of penpotUtils.findShapes(shape => norm(shape).startsWith('slider/'), owner)) slider.hidden = true;
  }
  if (group.id === '19') {
    const reset = U.find(owner, 'action/Сбросить');
    if (reset) {
      // Navigate to the prepared default state: no open-overlay onto itself.
      for (const layer of [reset, ...reset.children]) U.link(layer, E.resultId('19', 'all'));
      reset.setPluginData('action-kind', 'review-default-filter-state');
    }
  }
  owner.setPluginData('native-editors-status', 'preset-design-states-only');
  return { bound: group.id, fields: bindings, underlyingDynamic: false };
};

E.bindCity = () => {
  const board = Q.boards['03'];
  if (!board || !Q.boards['44']) throw new Error('City destinations are missing.');
  const source = storage.screenDoc.screens.find(screen => screen.id === '03');
  source.rows.forEach((row, index) => {
    const target = index === 0 ? 'close' : '44';
    const y = 316 + index * 64;
    const background = U.find(board, 'content/row-' + index);
    const label = U.find(board, 'row/' + row.label);
    const value = U.find(board, 'value/' + row.label);
    if (background) {
      background.y = board.y + y;
      background.resize(386, 62);
      if (index === 0) background.fills = [{ fillColor: Q.c.soft, fillOpacity: 1 }];
    }
    if (label) label.y = board.y + y + 9;
    if (value) value.y = board.y + y + 31;
    for (const layer of [background, label, value].filter(Boolean)) U.link(layer, target);
    const oldHit = U.find(board, 'editor/city-hit-' + index);
    if (oldHit) oldHit.remove();
    const hit = U.hot(board, 22, y, 386, 62, target, false, 'editor/city-hit-' + index);
    hit.setPluginData('selected', index === 0 ? 'true' : 'false');
  });
  return { cityRows: 2, selected: 'Астана', almatyTarget: '44' };
};

E.runOne = (id, part = 'editor', optionIndex = 0) => {
  if (part === 'prepare') return E.prepareGroup(id);
  if (part === 'editor') return E.drawEditor(id);
  if (part === 'result') return E.drawResult(id, optionIndex);
  if (part === 'bind') return E.bindOwner(id);
  throw new Error('Unknown editor build part: ' + part);
};

// Limited QA contract for root after execution:
// 1. Group destinations exist before binding; every enabled U.button has target.
// 2. Check selected labels against the exact clicked preset (never one false
//    shared success screen for mutually different values).
// 3. Export 08.editor, 19.selected.culture, 38.selected.unknown, 45.selected.kk;
//    inspect bounds, long RU/KZ text, footer and all click surfaces.
// 4. Follow 10 A/B -> 12 ->10 and organizer venue ->12 ->37; returnTo metadata
//    alone does not implement runtime routing, root must wire native states.
// 5. Confirm no self-nested reset overlay and no claim of live text entry,
//    localStorage commit, actual event publication or translated whole app.
return { initialised: true, groups: E.groupIds, newBoards: E.expectedBoards, drawsExecuted: false };
