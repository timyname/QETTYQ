/** UI copy only. Do not add event titles, addresses or user messages here. */
import { ORGANIZER_TRANSLATIONS } from './i18n-organizer';
import { POLICY_TRANSLATIONS } from './i18n-policy';
const rows = `
Загружаем карту…|Карта жүктелуде…|Loading the map…
AI снова доступен через минуту. Поиск по каталогу работает сейчас.|AI бір минуттан кейін қолжетімді. Каталогтан қазір іздеуге болады.|AI is available again in a minute. Catalogue search works now.
Дневной лимит AI исчерпан. Можно продолжить поиск по каталогу.|AI күндік лимиті аяқталды. Каталогтан іздеуді жалғастыруға болады.|The daily AI limit is reached. You can still search the catalogue.
Общий лимит пилота исчерпан. Поиск по каталогу остаётся доступен.|Пилоттың жалпы лимиті аяқталды. Каталогтан іздеу қолжетімді.|The pilot's shared limit is reached. Catalogue search remains available.
AI обрабатывает другой запрос. Попробуй немного позже.|AI басқа сұрауды өңдеп жатыр. Сәл кейінірек қайтала.|AI is handling another request. Try again shortly.
AI сейчас недоступен. Работает поиск по каталогу без внешней генерации.|AI қазір қолжетімсіз. Каталогтан сыртқы генерациясыз іздеуге болады.|AI is unavailable. Catalogue search works without external generation.
Культура и история|Мәдениет пен тарих|Culture and history
Живая музыка|Жанды музыка|Live music
Театр и балет|Театр мен балет|Theatre and ballet
Танцы и новые знакомства|Би және жаңа таныстық|Dance and meet people
Музыка своими руками|Өзің ойнайтын музыка|Make music
Спорт и характер|Спорт пен қайрат|Strength and sport
Активный отдых|Белсенді демалыс|Active leisure
Баня и загородный отдых|Монша және қала сыртындағы демалыс|Sauna and countryside
Шашлык с друзьями|Достармен кәуап|Barbecue with friends
Новый вкус|Жаңа дәм|New flavours
Кофе и тихий вечер|Кофе және тыныш кеш|Coffee and a quiet evening
Современное искусство|Заманауи өнер|Contemporary art
Кино на большом экране|Үлкен экрандағы кино|Cinema on the big screen
Сделать что-то своими руками|Өз қолыңмен жасау|Make something yourself
Прогулки и архитектура|Серуен және сәулет|Walks and architecture
Музеи, галереи и истории города.|Мұражайлар, галереялар және қала тарихы.|Museums, galleries and city stories.
Живые концерты, рок и небольшие сцены.|Жанды концерттер, рок және шағын сахналар.|Live concerts, rock and intimate venues.
Спектакли, балет и вечер в театре.|Спектакльдер, балет және театр кеші.|Plays, ballet and an evening at the theatre.
Бачата, открытые уроки и танцевальные встречи.|Бачата, ашық сабақтар және би кездесулері.|Bachata, open classes and social dance.
Барабаны, джемы и первые музыкальные опыты.|Барабан, джем және алғашқы музыкалық тәжірибе.|Drums, jam sessions and first musical experiments.
Армрестлинг, силовые тренировки и состязания.|Армрестлинг, күш жаттығулары және жарыстар.|Arm wrestling, strength training and competitions.
Скалодром, велопрогулки и движение на свежем воздухе.|Құзға өрмелеу, велосеруен және таза ауадағы қозғалыс.|Climbing, cycling and outdoor activity.
Баня, тишина и поездка за город.|Монша, тыныштық және қала сыртына сапар.|Sauna, quiet and a trip out of town.
Шашлык, открытый огонь и встречи с друзьями.|Кәуап, ашық от және достармен кездесу.|Barbecue, open fire and time with friends.
Новая кухня, небольшие рестораны и гастрономические открытия.|Жаңа тағамдар, шағын мейрамханалар және дәмді жаңалықтар.|New cuisines, small restaurants and food discoveries.
Кофейни, книга и спокойный разговор.|Кофеханалар, кітап және асықпай әңгімелесу.|Coffee shops, a book and a quiet conversation.
Выставки, арт-пространства и новые имена.|Көрмелер, өнер кеңістіктері және жаңа есімдер.|Exhibitions, art spaces and new artists.
Большой экран, премьеры и любимые жанры.|Үлкен экран, премьералар және сүйікті жанрлар.|The big screen, premieres and favourite genres.
Керамика, рисование и творческие мастерские.|Керамика, сурет және шығармашылық шеберханалар.|Ceramics, drawing and creative workshops.
Набережная, городские маршруты и архитектура.|Жағалау, қала маршруттары және сәулет.|The waterfront, city walks and architecture.
Уточните стоимость|Бағасын нақтыла|Check the price
Слишком много запросов. Попробуйте через минуту.|Сұрау тым көп. Бір минуттан кейін қайтала.|Too many requests. Try again in a minute.
Сервис не ответил. Попробуйте ещё раз.|Сервис жауап бермеді. Қайта көр.|The service did not respond. Try again.
Выбор интересов|Қызығушылықтарды таңдау|Choose interests
Интересно|Қызық|Interested
Не сейчас|Қазір емес|Not now
ВЫБЕРИ, ЧТО ТЕБЕ ПО ДУШЕ|ӨЗІҢЕ ҰНАҒАНЫН ТАҢДА|CHOOSE WHAT YOU ENJOY
Иллюстрация категории|Санаттың иллюстрациясы|Category illustration
Вернуться|Қайту|Go back
Отменить выбор|Таңдауды қайтару|Undo choice
← не сейчас · интересно →|← қазір емес · қызық →|← not now · interested →
К условиям подборки|Іріктеу шарттарына|Set your conditions
Пропустить подбор интересов|Қызығушылықтарды таңдауды өткізу|Skip interest selection
Хранилище браузера недоступно. Изменения сохранятся только до закрытия страницы.|Браузер жады қолжетімсіз. Өзгерістер бет жабылғанша сақталады.|Browser storage is unavailable. Changes last until you close this page.
Убрано из сохранённых|Сақталғандардан өшірілді|Removed from saved
Сохранено для будущих планов|Болашақ жоспарларға сақталды|Saved for later plans
Геолокация недоступна. Выберите старт на карте.|Геолокация қолжетімсіз. Бастау нүктесін картадан таңда.|Location is unavailable. Choose a start on the map.
Вы находитесь вне пилотной зоны Астаны. Выберите точку старта на карте.|Сен Астана пилотының аймағынан тыссың. Бастау нүктесін картадан таңда.|You are outside the Astana pilot area. Choose a start on the map.
Точка старта получена. Точная геопозиция не сохраняется в памяти браузера.|Бастау нүктесі алынды. Нақты геолокация браузер жадына сақталмайды.|Start received. Exact location is not saved in browser memory.
Доступ не получен. Можно выбрать старт на карте или продолжить без него.|Рұқсат берілмеді. Бастауды картадан таңдауға немесе онсыз жалғастыруға болады.|Permission was not granted. Choose a start on the map or continue without it.
Площадка выбрана. Это не подтверждает согласие организатора площадки.|Орын таңдалды. Бұл орын иесінің келісімін растамайды.|Venue selected. This does not confirm the venue owner's consent.
Выберите точку в пилотной зоне Астаны.|Астана пилотының аймағынан нүкте таңда.|Choose a point inside the Astana pilot area.
Добавьте хотя бы одно место.|Кемінде бір орын қос.|Add at least one place.
Место уже в плане.|Орын жоспарға қосылған.|This place is already in the plan.
В одном плане до 5 мест.|Бір жоспарда 5 орынға дейін.|A plan can contain up to 5 places.
Добавлено в план.|Жоспарға қосылды.|Added to the plan.
Время пути пока не рассчитано.|Жол уақыты әлі есептелмеді.|Travel time has not been calculated yet.
QETTYQ · Астана|QETTYQ · Астана|QETTYQ · Astana
План скопирован. Личная геопозиция не включена.|Жоспар көшірілді. Жеке геолокация қосылмаған.|Plan copied. Personal location is not included.
Отправка отменена или недоступна.|Жіберу тоқтатылды немесе қолжетімсіз.|Sharing was cancelled or is unavailable.
Не удалось удалить все данные. Повторите удаление.|Барлық дерек өшірілмеді. Қайта өшіріп көр.|Not all data could be deleted. Try again.
Черновик доступен только до закрытия страницы.|Нобай бет жабылғанша ғана қолжетімді.|The draft is available until this page is closed.
Иллюстрация категории, не фото места|Санат иллюстрациясы, орынның фотосы емес|Category illustration, not a photo of the place
Адрес уточните перед посещением|Бармас бұрын мекенжайды нақтыла|Check the address before visiting
Цена неизвестна|Бағасы белгісіз|Price unknown
мин на посещение|мин баруға|min visit
QETTYQ — на главную|QETTYQ — басты бетке|QETTYQ — home
Сейчас доступен пилот в Астане. Алматы — следующий город.|Қазір Астана пилоты қолжетімді. Келесі қала — Алматы.|The Astana pilot is available now. Almaty is next.
Астана|Астана|Astana
Изменить условия|Шарттарды өзгерту|Change conditions
Настройки|Баптаулар|Settings
Закрыть ошибку|Қате хабарын жабу|Dismiss error
Закрыть уведомление|Хабарламаны жабу|Dismiss notification
Иллюстрация: рука с QETTYQ на фоне Байтерека и современной Астаны|Иллюстрация: Бәйтерек пен заманауи Астана аясындағы QETTYQ ұстаған қол|Illustration: a hand holding QETTYQ against Baiterek and modern Astana
Не знаешь, как|Уақытты қалай|Not sure how to
провести время?|өткізуді білмейсің бе?|spend your time?
Расскажи нам о своих предпочтениях.|Нені ұнататыныңды айтып бер.|Tell us what you enjoy.
Выбрать свой вайб|Өз көңіл күйіңді таңда|Find your vibe
Сколько времени|Өзіңе қанша|How much time
на себя?|уақыт бар?|for yourself?
Свободное время|Бос уақыт|Free time
мин|мин|min
Откуда начнём?|Қайдан бастаймыз?|Where do we start?
Старт выбран. Точка хранится только до закрытия страницы.|Бастау таңдалды. Нүкте бет жабылғанша сақталады.|Start selected. The point is kept until this page is closed.
Выбери старт, чтобы оценить время дороги. Можно продолжить без него.|Жол уақытын бағалау үшін бастауды таңда. Онсыз да жалғастыруға болады.|Choose a start to estimate travel time. You can continue without it.
Поделиться геопозицией|Геолокацияны бөлісу|Share location
Выбрать старт на карте|Бастауды картадан таңдау|Choose a start on the map
Убрать точку старта|Бастау нүктесін алып тастау|Remove start point
Проверяем условия…|Шарттарды тексерудеміз…|Checking conditions…
Показать подборку|Іріктеуді көрсету|Show matches
Персональная лента|Жеке лента|Personal feed
Для тебя|Саған|For you
Места под твои условия|Шарттарыңа сай орындар|Places for your conditions
Загружаем каталог…|Каталог жүктелуде…|Loading the catalogue…
Места|Орындар|Places
Убрать из сохранённых|Сақталғандардан өшіру|Remove from saved
Сохранить|Сақтау|Save
Стоимость нужно уточнить|Бағасын нақтылау керек|Check the price
· посещение ≈|· баруға ≈|· visit ≈
Подробнее|Толығырақ|Details
По этим условиям вариантов не нашли|Бұл шарттарға сай нұсқа табылмады|No matches for these conditions
Попробуй изменить время, бюджет или интересы. Мы не ослабляем твои условия автоматически.|Уақытты, бюджетті не қызығушылықтарды өзгертіп көр. Шарттарыңды өзіміз өзгертпейміз.|Try changing time, budget or interests. We never relax your conditions automatically.
Подобрать вместе с помощником|Көмекшімен бірге таңдау|Choose with the assistant
Обновить афишу|Афишаны жаңарту|Refresh events
Что ищем?|Не іздейміз?|What are we looking for?
Твои интересы, время и бюджет — отправная точка.|Қызығушылығың, уақытың мен бюджетің — бастау нүктесі.|Your interests, time and budget are our starting point.
О помощнике и памяти|Көмекші және жады туралы|About the assistant and memory
Помогу найти места и события Астаны, покажу карточки и ссылки. Предпочтения и последние сообщения сохраняются в этом браузере. Память о посещениях и совместные планы пока не подключены.|Астанадағы орындар мен іс-шараларды тауып, карточкалар мен сілтемелерді көрсетемін. Талғам мен соңғы хабарламалар осы браузерде сақталады. Барған жерлер жады мен ортақ жоспарлар әлі қосылмаған.|I can find Astana places and events, with cards and links. Preferences and recent messages stay in this browser. Visit memory and shared plans are not connected yet.
При согласии запрос, интересы и последние сообщения передаются OpenAI. Точная геопозиция исключена. AI использует подключённую афишу, а не свободный поиск по всему интернету.|Келіссең, сұрауың, қызығушылықтарың мен соңғы хабарламалар OpenAI-ға жіберіледі. Нақты геолокация жіберілмейді. AI қосылған афишаны пайдаланады, бүкіл интернеттен іздемейді.|With consent, your request, interests and recent messages go to OpenAI. Exact location is excluded. AI uses the connected event feed, not unrestricted web search.
При согласии запрос, интересы и последние сообщения передаются OpenAI. Точная геопозиция исключена. Разрешена одна тестовая попытка.|Келіссең, сұрауың, қызығушылықтарың мен соңғы хабарламалар OpenAI-ға жіберіледі. Нақты геолокация жіберілмейді. Бір сынақ сұрауына рұқсат берілген.|With consent, your request, interests and recent messages go to OpenAI. Exact location is excluded. One test attempt is allowed.
Диалог с помощником|Көмекшімен диалог|Assistant conversation
Как хочется провести время? Можно написать: «тихое место на час» или «что идёт в театре». Если цена или расписание неизвестны, я так и скажу.|Уақытты қалай өткізгің келеді? «Бір сағатқа тыныш орын» немесе «театрда не бар» деп жаз. Бағасы не кестесі белгісіз болса, соны айтамын.|How would you like to spend your time? Try “a quiet place for an hour” or “what's on at the theatre”. I'll say when price or schedule is unknown.
Ты|Сен|You
QETTYQ · поиск по каталогу|QETTYQ · каталогтан іздеу|QETTYQ · catalogue search
Проверяем афишу и готовим ответ…|Афишаны тексеріп, жауап дайындаудамыз…|Checking events and preparing a reply…
Проверяем каталог и ограничения…|Каталог пен шектеулерді тексерудеміз…|Checking the catalogue and constraints…
Из запроса:|Сұраудан:|From your request:
мин ·|мин ·|min ·
. Применить эти условия?|. Осы шарттарды қолданайық па?|. Apply these conditions?
Условия обновлены.|Шарттар жаңартылды.|Conditions updated.
Применить условия|Шарттарды қолдану|Apply conditions
Например: погулять 90 минут|Мысалы: 90 минут серуендеу|For example: a 90-minute walk
Сообщение помощнику|Көмекшіге хабарлама|Message the assistant
Отправить сообщение|Хабарламаны жіберу|Send message
Выбери точку старта|Бастау нүктесін таңда|Choose a start point
Выбери площадку|Орынды таңда|Choose a venue
Город на карте|Қала картада|City on the map
Поиск места на карте|Картадан орын іздеу|Search the map
Место или адрес|Орын не мекенжай|Place or address
Все места|Барлық орындар|All places
Прогулки|Серуен|Walks
Кофе|Кофе|Coffee
Театры|Театрлар|Theatres
Расписание уточняйте|Кестені нақтыла|Check opening times
Событие|Іс-шара|Event
Моё местоположение|Менің орналасқан жерім|My location
Нажми на карту. Адрес не попадёт в постоянную память.|Картаны бас. Мекенжай тұрақты жадқа жазылмайды.|Tap the map. The address will not be saved permanently.
Продолжить без изменения|Өзгертпей жалғастыру|Continue without changes
Закрыть выбранное место|Таңдалған орынды жабу|Close selected place
Добавлено в план|Жоспарға қосылды|Added to plan
В план|Жоспарға|Add to plan
Мой план ·|Менің жоспарым ·|My plan ·
Оценить путь|Жолды бағалау|Estimate route
Нажми на маркер площадки, чтобы добавить её адрес в черновик. Или введи адрес вручную в форме.|Мекенжайды нобайға қосу үшін орын маркерін бас. Не формаға мекенжайды өзің енгіз.|Tap a venue marker to add its address to the draft, or enter an address in the form.
Перемещай карту и выбирай место. События без подтверждённых координат смотри в афише.|Картаны жылжытып, орын таңда. Координаттары расталмаған іс-шараларды афишадан қара.|Move the map and choose a place. Events without verified coordinates are in the feed.
Открыть афишу|Афишаны ашу|Open events
мест|орын|places
Назад|Артқа|Back
Когда|Қашан|When
Уточняется|Нақтылау керек|To be confirmed
Язык|Тілі|Language
Не указан|Көрсетілмеген|Not specified
Вход|Кіру|Entry
Точный адрес уточните перед посещением|Бармас бұрын нақты мекенжайды тексер|Check the exact address before visiting
Перед тем как идти|Бармас бұрын|Before you go
Расписание, язык и наличие мест не подтверждены. Контакт организатора в этом каталоге не указан.|Кесте, тіл және бос орындар расталмаған. Бұл каталогта ұйымдастырушының байланысы жоқ.|Schedule, language and availability are unconfirmed. This catalogue has no organiser contact.
Место из сохранённого каталога Астаны. Проверь, подходит ли оно твоим планам.|Астананың сақталған каталогындағы орын. Жоспарыңа сай келетінін тексер.|A place from the saved Astana catalogue. Check that it fits your plans.
Посещение ≈|Баруға ≈|Visit ≈
мин — проектная оценка.|мин — жобалық баға.|min — planning estimate.
В мой план|Менің жоспарыма|Add to my plan
Открыть план ·|Жоспарды ашу ·|Open plan ·
ЛИЧНОЕ ПРОСТРАНСТВО|ЖЕКЕ КЕҢІСТІК|YOUR SPACE
Твой QETTYQ|Сенің QETTYQ|Your QETTYQ
Без регистрации|Тіркелусіз|No registration
Предпочтения и последние сообщения хранятся в этом браузере. Геопозиция не сохраняется.|Талғам мен соңғы хабарламалар осы браузерде сақталады. Геолокация сақталмайды.|Preferences and recent messages stay in this browser. Location is not saved.
Интересы ещё не выбраны|Қызығушылықтар әлі таңдалмаған|No interests selected yet
Сохранённые места|Сақталған орындар|Saved places
Изменить интересы|Қызығушылықтарды өзгерту|Change interests
Условия подборки|Іріктеу шарттары|Match conditions
Моё событие|Менің іс-шарам|My event
Настройки и память|Баптаулар мен жады|Settings and memory
Профиль|Профиль|Profile
Сохранённое|Сақталғандар|Saved
Место для будущих планов|Болашақ жоспарларға орын|Room for future plans
Сохраняй интересные локации из ленты или с карты.|Қызықты орындарды лентадан не картадан сақта.|Save interesting places from the feed or map.
Выбрать на карте|Картадан таңдау|Choose on map
Город|Қала|City
Астана · пилот|Астана · пилот|Astana · pilot
Алматы — следующий этап. Каталог пока не подключён.|Келесі кезең — Алматы. Каталог әлі қосылмаған.|Almaty is next. Its catalogue is not connected yet.
Предпочитаемый язык событий|Іс-шаралардың қалаған тілі|Preferred event language
Язык интерфейса|Интерфейс тілі|Interface language
Язык сохранён на этом устройстве. Названия событий и адреса остаются на языке источника.|Тіл осы құрылғыда сақталды. Іс-шара атаулары мен мекенжайлар дереккөз тілінде қалады.|Language is saved on this device. Event titles and addresses stay in their source language.
Память и приватность|Жады және құпиялылық|Memory and privacy
На устройстве: интересы, до 24 сообщений, сохранённые места и локальный черновик. На сервере: временная сессия и планы до 24 часов.|Құрылғыда: қызығушылықтар, 24 хабарламаға дейін, сақталған орындар мен жергілікті нобай. Серверде: уақытша сессия мен жоспарлар 24 сағатқа дейін.|On this device: interests, up to 24 messages, saved places and a local draft. On the server: a temporary session and plans for up to 24 hours.
Это локальная память, не полноценный генеративный RAG. Совместное редактирование с друзьями пока не подключено.|Бұл — жергілікті жады, толық генеративті RAG емес. Достармен бірге өңдеу әлі қосылмаған.|This is local memory, not full generative RAG. Editing together with friends is not connected yet.
Удалить мои данные|Деректерімді өшіру|Delete my data
Снимок каталога: 19 октября 2026. Геометрия карты загружается из OpenStreetMap.|Каталог көшірмесі: 2026 жылғы 19 қазан. Карта геометриясы OpenStreetMap-тен жүктеледі.|Catalogue snapshot: 19 October 2026. Map geometry is loaded from OpenStreetMap.
Локальный черновик. Публикация и проверка организатора пока недоступны.|Жергілікті нобай. Жариялау мен ұйымдастырушыны тексеру әлі қолжетімсіз.|Local draft. Publishing and organiser verification are not available yet.
К моим черновикам|Нобайларыма|My drafts
Условия публикации|Жариялау шарттары|Publishing conditions
Это локальный черновик. Публикация и проверка организатора пока не подключены.|Бұл — жергілікті нобай. Жариялау мен ұйымдастырушыны тексеру әлі қосылмаған.|This is a local draft. Publishing and organiser verification are not connected yet.
Черновик сохранён на устройстве. Он не опубликован и не отправлен на модерацию.|Нобай құрылғыда сақталды. Ол жарияланбады және тексеруге жіберілмеді.|Draft saved on this device. It is not published or submitted for review.
Удалить память QETTYQ?|QETTYQ жадын өшіру керек пе?|Delete QETTYQ memory?
Исчезнут интересы, диалог, сохранённые места, черновик и данные текущей серверной сессии. Это нельзя отменить.|Қызығушылықтар, диалог, сақталған орындар, нобай және ағымдағы сервер сессиясының деректері өшеді. Мұны қайтару мүмкін емес.|Interests, conversation, saved places, draft and current server-session data will be deleted. This cannot be undone.
Да, удалить данные|Иә, деректерді өшіру|Yes, delete data
Оставить данные|Деректерді қалдыру|Keep data
Введите целую сумму от 0 до 1 000 000 ₸.|0-ден 1 000 000 ₸-ге дейін бүтін сома енгіз.|Enter a whole amount from 0 to 1,000,000 ₸.
Бюджет|Бюджет|Budget
Бюджет на человека|Бір адамға бюджет|Budget per person
Бюджет на человека, ₸|Бір адамға бюджет, ₸|Budget per person, ₸
Без ограничений|Шектеусіз|No limit
₸ / человек|₸ / адам|₸ / person
Быстрый выбор бюджета на человека|Бір адамға бюджетті жылдам таңдау|Quick budget per person
Только бесплатные варианты, 0 ₸|Тек тегін нұсқалар, 0 ₸|Free options only, 0 ₸
Сумму можно выбрать позже|Соманы кейін таңдауға болады|Choose an amount later
Покажем только подтверждённо бесплатные варианты.|Тегін екені расталған нұсқаларды ғана көрсетеміз.|Only confirmed free options will be shown.
Бюджет 0 ₸. Варианты с неизвестной ценой требуют уточнения.|Бюджет 0 ₸. Бағасы белгісіз нұсқаларды нақтылау керек.|Budget is 0 ₸. Options with unknown prices need checking.
Не задаём предел расходов. Неизвестная цена не означает бесплатный вход.|Шығын шегі жоқ. Белгісіз баға тегін деген сөз емес.|No spending ceiling. An unknown price does not mean free entry.
Выбери готовую сумму или введи свою. Стоимость дороги и билетов может потребовать уточнения.|Дайын соманы таңда не өзің енгіз. Жол мен билет бағасын нақтылау қажет болуы мүмкін.|Choose a preset or enter an amount. Travel and ticket costs may need checking.
Не предлагать варианты с неизвестной ценой|Бағасы белгісіз нұсқаларды ұсынбау|Exclude options with unknown prices
Слишком много запросов. Подожди немного и попробуй снова.|Сұрау тым көп. Сәл күтіп, қайта көр.|Too many requests. Wait a little and try again.
Путь по улицам сейчас недоступен. Ниже остаётся оценка по прямой и внешняя навигация.|Көше арқылы маршрут қазір қолжетімсіз. Төменде түзу сызықпен баға және сыртқы навигация бар.|Street routing is unavailable. Straight-line estimates and external navigation remain below.
Маршрут по Астане|Астана бойынша маршрут|Astana route
На карту|Картаға|Back to map
Твой маршрут|Сенің маршрутың|Your route
План маршрута|Маршрут жоспары|Route plan
Свернуть план маршрута|Маршрут жоспарын жинау|Collapse route plan
Развернуть план маршрута|Маршрут жоспарын ашу|Expand route plan
Способ передвижения|Жүру тәсілі|Travel mode
Пешком|Жаяу|Walking
Астана ·|Астана ·|Astana ·
· путь по улицам|· көше арқылы жол|· street route
Нужна точка старта|Бастау нүктесі керек|Choose a start point
Поделиться планом|Жоспарды бөлісу|Share plan
Дата и время начала|Бастау күні мен уақыты|Start date and time
Дата и время начала маршрута|Маршруттың бастау күні мен уақыты|Route start date and time
Выберите действительные дату и время.|Дұрыс күн мен уақытты таңда.|Choose a valid date and time.
Сейчас|Қазір|Now
Время Астаны. Расписание мест на выбранную дату нужно уточнить.|Астана уақыты. Таңдалған күнгі орындар кестесін нақтылау керек.|Astana time. Check venue schedules for the selected date.
Точка старта на карте|Картадағы бастау нүктесі|Start point on the map
Для оценки дороги выбери старт|Жолды бағалау үшін бастауды таңда|Choose a start to estimate travel
Изменить|Өзгерту|Change
Выбрать|Таңдау|Choose
Дорога пока не рассчитана|Жол әлі есептелмеді|Travel not calculated yet
посещение ≈|баруға ≈|visit ≈
Адрес уточняйте перед посещением|Бармас бұрын мекенжайды нақтыла|Check the address before visiting
Конечная точка на карте|Картадағы соңғы нүкте|End point on the map
После выбранных остановок|Таңдалған аялдамалардан кейін|After the selected stops
Оставшееся свободное время неизвестно.|Қалған бос уақыт белгісіз.|Remaining free time is unknown.
Расстояние пока не рассчитано.|Қашықтық әлі есептелмеді.|Distance has not been calculated yet.
Бюджет:|Бюджет:|Budget:
нужно уточнить стоимость|бағасын нақтылау керек|check the cost
Этот план превышает выбранные ограничения. Убери остановку или измени условия.|Бұл жоспар таңдалған шектеулерден асады. Бір орынды алып таста не шарттарды өзгерт.|This plan exceeds your conditions. Remove a stop or change the conditions.
На карте — точки плана, не линия дороги. Время пешком оценено по прямой; точный путь уточнит навигация. Посещения — проектная оценка, не бронь.|Картада — жоспар нүктелері, жол сызығы емес. Жаяу жүру уақыты түзу сызықпен бағаланды; нақты жолды навигация көрсетеді. Бару уақыты — жоспарлық баға, бронь емес.|The map shows plan points, not a road line. Walking time is estimated in a straight line; navigation will give the exact route. Visit times are planning estimates, not bookings.
Расчёт пути по улицам|Көше арқылы жолды есептеу|Street route calculation
Путь по улицам|Көше арқылы жол|Street route
Пеший маршрут рассчитан|Жаяу маршрутты есептеген|Walking route calculated by
. Время остаётся оценкой, проходы могут измениться. Посещения не подтверждены. Линия и координаты хранятся только на этом экране.|. Уақыт — болжам, өтетін жолдар өзгеруі мүмкін. Бару расталмаған. Сызық пен координаттар осы экранда ғана сақталады.|. Time remains an estimate and access may change. Visits are unconfirmed. The line and coordinates stay on this screen only.
Убрать дорожный расчёт|Жол есебін алып тастау|Clear street route
В этой сборке дорожный провайдер не подключён. Можно открыть внешнюю навигацию ниже.|Бұл нұсқада жол провайдері қосылмаған. Төмендегі сыртқы навигацияны ашуға болады.|No street-routing provider is connected in this build. Open external navigation below.
Разрешаю передать выбранные точки для этого расчёта|Осы есеп үшін таңдалған нүктелерді жіберуге рұқсат беремін|I allow the selected points to be sent for this calculation
Строим пеший путь…|Жаяу жол құрылуда…|Calculating walking route…
Рассчитать путь по улицам|Көше арқылы жолды есептеу|Calculate street route
Сначала выбери точку старта.|Алдымен бастау нүктесін таңда.|Choose a start point first.
2ГИС ↗|2GIS ↗|2GIS ↗
2ГИС в браузере ↗|Браузердегі 2GIS ↗|2GIS in browser ↗
Начать маршрут|Маршрутты бастау|Start route
Откроется Google Maps с остановками. Выбранная точка старта передастся сервису.|Аялдамалармен Google Maps ашылады. Таңдалған бастау нүктесі сервиске жіберіледі.|Google Maps opens with your stops. Your chosen start point will be sent to the service.
Откроется Google Maps с остановками. Точку старта выберешь там.|Аялдамалармен Google Maps ашылады. Бастауды сол жерден таңдайсың.|Google Maps opens with your stops. Choose the start point there.
Дата не подтверждена|Күні расталмаған|Date unconfirmed
Стоимость уточняйте|Бағасын нақтыла|Check the price
Бесплатно · по данным афиши|Тегін · афиша дерегі бойынша|Free · according to the event listing
от|бастап|from
Иллюстрация Астаны, не афиша события|Астана иллюстрациясы, іс-шара афишасы емес|Astana illustration, not an event poster
Иллюстрация категории, не фото события|Санат иллюстрациясы, іс-шара фотосы емес|Category illustration, not an event photo
Афиша:|Афиша:|Listing:
Афиша Астаны|Астана афишасы|What's on in Astana
Обновляем|Жаңартылуда|Updating
Актуально|Жаңартылған|Up to date
Предыдущая загрузка|Алдыңғы жүктеу|Previous update
Нет связи|Байланыс жоқ|Offline
Все подключённые события. Даты и стоимость могут не совпадать с твоими условиями.|Барлық қосылған іс-шаралар. Күндері мен бағасы шарттарыңа сай келмеуі мүмкін.|All connected events. Dates and prices may not match your conditions.
Ближайшие даты|Алдағы күндер|Upcoming
Сегодня|Бүгін|Today
Загружаем подтверждённые даты…|Расталған күндер жүктелуде…|Loading confirmed dates…
Афиша временно недоступна. Места на карте остаются доступны.|Афиша уақытша қолжетімсіз. Картадағы орындар қолжетімді.|Events are temporarily unavailable. Places on the map remain available.
На сегодня подтверждённых событий в подключённой подборке нет. Посмотри ближайшие даты.|Қосылған іріктеуде бүгінге расталған іс-шара жоқ. Алдағы күндерді қара.|No confirmed events for today in this feed. Check upcoming dates.
В этой подборке пока нет будущих событий.|Бұл іріктеуде алдағы іс-шаралар әзірге жоқ.|No upcoming events in this feed yet.
События|Іс-шаралар|Events
Убрать событие из сохранённых|Іс-шараны сақталғандардан өшіру|Remove event from saved
Сохранить событие|Іс-шараны сақтау|Save event
О событии|Іс-шара туралы|Event details
Источник сейчас недоступен: показана предыдущая загрузка. Проверь дату и условия перед посещением.|Дереккөз қазір қолжетімсіз: алдыңғы жүктеу көрсетілген. Бармас бұрын күні мен шарттарын тексер.|The source is unavailable: a previous update is shown. Check dates and conditions before visiting.
Актуальность подборки|Іріктеудің өзектілігі|Feed freshness
Проверено|Тексерілген|Checked
. Обновляется по запросу, кэш до часа. Подборка не охватывает все события города.|. Сұрау бойынша жаңартылады, кэш бір сағатқа дейін. Іріктеу қаладағы барлық іс-шараны қамтымайды.|. Refreshed on request, cached for up to an hour. This feed does not cover every city event.
Язык не указан|Тілі көрсетілмеген|Language unspecified
Бесплатно|Тегін|Free
Событие сохранено|Іс-шара сақталды|Event saved
Площадка уточняется|Орын нақтылануда|Venue to be confirmed
Наличие мест и условия записи уточняй у организатора.|Бос орындар мен жазылу шарттарын ұйымдастырушыдан нақтыла.|Check availability and registration with the organiser.
Стоимость зависит от выбранного билета.|Бағасы таңдалған билетке байланысты.|The price depends on the selected ticket.
Продолжительность и время окончания не указаны.|Ұзақтығы мен аяқталу уақыты көрсетілмеген.|Duration and end time are not specified.
Координаты не предоставлены источником. Точку на карте и время пути не подставляем наугад.|Дереккөз координаттарды бермеген. Карта нүктесі мен жол уақытын ойдан қоспаймыз.|The source provides no coordinates. We do not invent a map point or travel time.
Подробности и запись|Толығырақ және жазылу|Details and registration
Построить внешний маршрут|Сыртқы маршрут құру|Open external directions
Поиск|Іздеу|Search
Карта|Карта|Map
Основная навигация|Негізгі навигация|Main navigation
из|/|of
Точка старта маршрута|Маршруттың бастау нүктесі|Route start point
Старт|Бастау|Start
Векторная карта недоступна. Резервный режим OpenStreetMap.|Векторлық карта қолжетімсіз. OpenStreetMap резервтік режимі.|Vector map unavailable. OpenStreetMap fallback mode.
Интерактивная карта Астаны|Астананың интерактивті картасы|Interactive map of Astana
Загружаем карту Астаны…|Астана картасы жүктелуде…|Loading the Astana map…
Управление картой|Картаны басқару|Map controls
Приблизить карту|Картаны жақындату|Zoom in
Отдалить карту|Картаны алыстату|Zoom out
Ориентировать карту на север|Картаны солтүстікке бұру|Orient map north
Исправить карту|Картаны түзету|Improve the map
Линия пути недоступна в резервном режиме.|Резервтік режимде жол сызығы қолжетімсіз.|The route line is unavailable in fallback mode.
Нажмите, чтобы приблизить|Жақындату үшін бас|Tap to zoom in
Карта событий Астаны|Астана іс-шараларының картасы|Astana events map
Не удалось загрузить карту. Список мест остаётся доступным.|Карта жүктелмеді. Орындар тізімі қолжетімді.|The map could not load. The places list remains available.
Источники ответа|Жауап дереккөздері|Reply sources
AI-объяснение разрешено|AI түсіндіруіне рұқсат берілді|AI explanations allowed
Согласие сохранено · AI недоступен|Келісім сақталды · AI қолжетімсіз|Consent saved · AI unavailable
Разрешить AI-объяснение|AI түсіндіруіне рұқсат беру|Allow AI explanations
AI пока недоступен|AI әзірге қолжетімсіз|AI is currently unavailable
Запрос слишком большой. Сократи сообщение и повтори.|Сұрау тым үлкен. Хабарламаны қысқартып, қайта көр.|The request is too large. Shorten your message and try again.
Кафе|Кафе|Cafe
Кофейня|Кофехана|Coffee shop
Ресторан|Мейрамхана|Restaurant
Быстрый перекус|Жеңіл ас|Quick bite
Театр|Театр|Theatre
Искусство|Өнер|Art
Музей|Мұражай|Museum
Парк|Саябақ|Park
Сад|Бақ|Garden
Видовая точка|Көрініс алаңы|Viewpoint
Место в городе|Қаладағы орын|City place
Примерно {n} мин|Шамамен {n} мин|About {n} min
≈{n} мин · {km} км по улицам|≈{n} мин · көше арқылы {km} км|≈{n} min · {km} km by streets
≈{n} мин · {km} км по прямой|≈{n} мин · түзу сызықпен {km} км|≈{n} min · {km} km in a straight line
{km} км по улицам|Көше арқылы {km} км|{km} km by streets
≈{km} км по прямой|Түзу сызықпен ≈{km} км|≈{km} km in a straight line
Останется ≈{n} мин|≈{n} мин қалады|≈{n} min remaining
{time} · начало|{time} · бастау|{time} · start
Бюджет {amount} ₸ на человека|Бір адамға бюджет {amount} ₸|Budget {amount} ₸ per person
{name}, {n} из 15. Стрелка вправо — интересно, влево — не сейчас.|{name}, 15-тен {n}. Оңға — қызық, солға — қазір емес.|{name}, {n} of 15. Right arrow: interested; left: not now.
{label}: {n} из {count}|{label}: {count} ішінен {n}|{label}: {n} of {count}
Убрать {name} из плана|{name} жоспардан өшіру|Remove {name} from plan
Для расчёта координаты старта и всех остановок получит {provider}. Провайдер может сохранять их в технических журналах. Никакой фоновой отправки.|Есептеу үшін бастау мен барлық аялдамалардың координаттарын {provider} алады. Провайдер оларды техникалық журналдарда сақтауы мүмкін. Фондық жіберу жоқ.|{provider} receives the coordinates of the start and all stops for this calculation. The provider may keep technical logs. Nothing is sent in the background.
{amount} ₸ · условия уточняйте|{amount} ₸ · шарттарын нақтыла|{amount} ₸ · check conditions
от {amount} ₸ · условия уточняйте|{amount} ₸ бастап · шарттарын нақтыла|from {amount} ₸ · check conditions
от {amount} ₸|{amount} ₸ бастап|from {amount} ₸
Окончание: {date}.|Аяқталуы: {date}.|Ends: {date}.
Мест: {n}. Приблизить|Орындар: {n}. Жақындату|Places: {n}. Zoom in
Мест: {n}. Нажмите, чтобы приблизить|Орындар: {n}. Жақындату үшін бас|Places: {n}. Tap to zoom in
Мест: {n}|Орындар: {n}|Places: {n}
Запас времени|Қосымша уақыт|Time buffer
{label} · {n} мин — оценка посещения|{label} · баруға {n} мин — болжам|{label} · {n} min — estimated visit
Источник: {title}|Дереккөз: {title}|Source: {title}
Русский|Орысша|Russian
Қазақша|Қазақша|Kazakh
English|Ағылшынша|English
Афиша организатора|Ұйымдастырушының афишасы|Organiser poster
Афиша организатора · {credit}|Ұйымдастырушының афишасы · {credit}|Organiser poster · {credit}
Иллюстрация категории: {category}|Санат иллюстрациясы: {category}|Category illustration: {category}
Наличие мест узнавайте у организатора.|Бос орындарды ұйымдастырушыдан нақтыла.|Check availability with the organiser.
Иллюстрация категории, не афиша мероприятия|Санат иллюстрациясы, іс-шара афишасы емес|Category illustration, not an event poster
Иллюстрация|Иллюстрация|Illustration
Серверная память|Сервер жады|Server memory
Серверная память недоступна. Память на устройстве продолжает работать.|Сервер жады қолжетімсіз. Құрылғыдағы жады жұмысын жалғастырады.|Server memory is unavailable. Device memory still works.
Не удалось изменить согласие. Повтори попытку.|Келісім өзгермеді. Қайта көр.|Could not change consent. Try again.
Не удалось отозвать согласие. Повтори попытку.|Келісімді қайтару мүмкін болмады. Қайта көр.|Could not revoke consent. Try again.
Не удалось обновить серверную память. Изменения остались на устройстве.|Сервер жады жаңартылмады. Өзгерістер құрылғыда қалды.|Could not update server memory. Changes remain on this device.
Предпочтения|Талғам|Preferences
Интересы, язык, время и бюджет. Без адреса и геопозиции.|Қызығушылықтар, тіл, уақыт және бюджет. Мекенжай мен геолокациясыз.|Interests, language, time and budget. No address or location.
Диалог|Диалог|Conversation
Последние 24 сообщения. Адресные данные скрываются; история не считается фактом о событиях.|Соңғы 24 хабарлама. Мекенжай деректері жасырылады; тарих іс-шаралар туралы факт болып саналмайды.|The latest 24 messages. Address data is redacted; history is not evidence about events.
Память для AI|AI үшін жады|Memory for AI
Отдельное разрешение использовать сохранённый контекст в AI. Само по себе не включает AI.|Сақталған контексті AI-да пайдалануға бөлек рұқсат. Бұл AI-ды өздігінен қоспайды.|Separate permission to use saved context in AI. This does not enable AI itself.
Подтверждённые посещения|Расталған барулар|Confirmed visits
Только явно подтверждённые посещения. Автоматического отслеживания нет.|Тек өзің растаған барулар. Автоматты бақылау жоқ.|Only explicitly confirmed visits. No automatic tracking.
Необязательно. Привязана к защищённому cookie этого браузера, не к аккаунту. На другом устройстве история сама не появится.|Міндетті емес. Аккаунтқа емес, осы браузердің қорғалған cookie файлына байланған. Басқа құрылғыда тарих өздігінен пайда болмайды.|Optional. Linked to this browser's protected cookie, not an account. History will not appear automatically on another device.
Срок хранения|Сақтау мерзімі|Retention period
Срок хранения серверной памяти|Сервер жадын сақтау мерзімі|Server memory retention
24 часа|24 сағат|24 hours
30 дней|30 күн|30 days
До|Дейін|Up to
Действует до|Жарамдылық мерзімі|Until
На этом устройстве|Осы құрылғыда|On this device
Интересы, последние 24 сообщения, сохранённые места и нобай хранятся в браузере. Геопозиция не сохраняется.|Қызығушылықтар, соңғы 24 хабарлама, сақталған орындар мен нобай браузерде сақталады. Геолокация сақталмайды.|Interests, the latest 24 messages, saved places and your draft stay in the browser. Location is not saved.
Результаты Google Maps|Google Maps нәтижелері|Google Maps results
Заведения · Google Maps|Орындар · Google Maps|Places · Google Maps
Расписание из Google Maps|Google Maps кестесі|Hours from Google Maps
Часы работы уточняйте.|Жұмыс уақытын нақтыла.|Check opening hours.
Наличие конкретного блюда не подтверждено.|Нақты тағамның бары расталмаған.|Availability of a particular dish is unconfirmed.
Цена и время пути не проверены. Это результаты поиска, а не подтверждённый план.|Баға мен жол уақыты тексерілмеген. Бұл — іздеу нәтижелері, расталған жоспар емес.|Price and travel time are unverified. These are search results, not a confirmed plan.
Открыть в Google Maps|Google Maps-та ашу|Open in Google Maps
По этому запросу заведений не найдено.|Бұл сұрау бойынша орын табылмады.|No places found for this query.
Поиск Google требует отдельного согласия.|Google іздеуіне бөлек келісім керек.|Google search requires separate consent.
Поиск Google сейчас недоступен. Можно продолжить по каталогу QETTYQ.|Google іздеуі қазір қолжетімсіз. QETTYQ каталогын пайдалануға болады.|Google search is unavailable. You can continue with the QETTYQ catalogue.
Эти результаты открываются в Google Maps и не добавляются на нашу OSM-карту.|Бұл нәтижелер Google Maps-та ашылады және біздің OSM картасына қосылмайды.|These results open in Google Maps and are not added to our OSM map.
Разрешаю передать запрос Google для поиска заведений|Орындар іздеу үшін сұрауды Google-ға жіберуге рұқсат беремін|I allow my query to be sent to Google to find places
Только текст запроса и Астана. Точная геопозиция не передаётся. Это отдельное согласие, не включение AI.|Тек сұрау мәтіні мен Астана. Нақты геолокация жіберілмейді. Бұл бөлек келісім, AI-ды қосу емес.|Only the query text and Astana. Exact location is not sent. This is separate consent, not enabling AI.
Совпадает с выбранной категорией. Для оценки пути укажите точку старта.|Таңдалған санатқа сай. Жолды бағалау үшін бастау нүктесін таңда.|Matches your selected category. Choose a start point to estimate travel.
Совпадает с отмеченными интересами; время и условия посещения нужно уточнить.|Таңдалған қызығушылықтарға сай; бару уақыты мен шарттарын нақтылау керек.|Matches your interests; check visiting time and conditions.
Совпадает с выбранной категорией; расчёт времени приблизительный.|Таңдалған санатқа сай; уақыт есебі шамамен берілген.|Matches your selected category; time is approximate.
По расписанию открыто|Кесте бойынша ашық|Open according to schedule
По расписанию закрыто|Кесте бойынша жабық|Closed according to schedule
Расписание из каталога|Каталогтағы кесте|Catalogue opening hours
В выбранное время закрыто. Уточни расписание или измени время посещения.|Таңдалған уақытта жабық. Кестені нақтыла не бару уақытын өзгерт.|Closed at the selected time. Check the schedule or change your visit time.
Наш план в Астане:|Астанадағы жоспарымыз:|Our plan in Astana:
Начало:|Басталуы:|Starts:
Время Астаны|Астана уақыты|Astana time
Расписание и цены уточняйте перед посещением.|Бармас бұрын кесте мен бағаларды нақтыла.|Check schedules and prices before visiting.
`;

export const UI_TRANSLATIONS: Record<string, readonly [string, string]> = { ...ORGANIZER_TRANSLATIONS, ...POLICY_TRANSLATIONS, ...Object.fromEntries(rows.trim().split('\n').map(row => { const [ru, kk, en] = row.split('|'); if (!ru || !kk || !en) throw new Error(`Invalid UI dictionary row: ${ru}`); return [ru, [kk, en]]; })) };
