# Home's Journey — CCG · Developer Guide

Two-player hotseat collectible card game. Tea (Tavern) vs Jeet, each defending a 30 HP base.
Built with vanilla HTML/CSS/JS. Hosted on GitHub Pages. No build step required.

Текущее состояние по факту чтения кода: `GAME_VERSION` = `"1.08"` (`js/data.js`), `AI_VERSION`
= `"1.08"` (`js/ai.js`) — синхронны.

-----

## Session Workflow — как мы работаем

*Прочитать в начале КАЖДОЙ новой сессии, прежде чем предлагать шаги.*

- **Старт сессии**: автору достаточно написать "Привет" и приложить архив проекта (zip) —
  этот файл (`CLAUDE.md`) поддерживается в актуальном состоянии специально для этого и должен
  давать полную картину: архитектуру, что уже сделано, и приоритизированный backlog того,
  что нет.
- **Как присылать ПРАВКИ автору**: НЕ архивом. Изменённые/исправленные файлы присылать прямо
  в чат как `.txt` (даже если исходный файл `.js`/`.css`/`.html`) — автор сам импортирует их
  под нужным расширением на своей стороне. Исключение — **новые** файлы, которых раньше не
  было в проекте: их можно присылать сразу с их настоящим расширением, автор загрузит их как
  есть. **Присылать НУЖНО ТОЛЬКО те файлы, которые реально поменялись в этом заходе** — не весь
  комплект каждый раз, автор сам держит актуальные версии остальных у себя.
- **Проверка headless-браузером (Playwright) ОТМЕНЕНА (по прямому запросу автора — съедала
  слишком много usage).** Не открывать страницу через `python3 -m http.server` +
  `playwright.sync_api`, не кликать кнопки/не проверять `getComputedStyle` перед отправкой
  файла. Вместо этого — внимательное чтение диффа глазами (в т.ч. парных синтаксических
  конструкций типа HTML-комментариев `<!-- -->`, которые не ловятся `node --check`) и здравый
  смысл. Автор сам тестирует вживую на своей стороне. Симулятор (`sim/headless.js`) —
  ОТДЕЛЬНЫЙ инструмент, разрешён и активно используется для баланс-прогонов (не подпадает под
  этот запрет — он не открывает браузер, гоняет движок в чистом Node-контексте).
- **Плейсхолдеры под будущий арт кнопок** (уточнено автором): для кнопки без готовой картинки —
  В HTML класс `placeholder` (даёт рамку/фон/эмодзи-фолбэк, см. `.modal-icon-btn.placeholder`
  в styles.css), а `background-image:url(...)` под три состояния (idle/hover/active —
  конвеншн автора: `btn_XXX1.png`/`btn_XXXH.png`/`btn_XXX2.png`) прописывается СРАЗУ,
  некомментированным — несуществующий файл просто не подгружается (фон остаётся прозрачным),
  плейсхолдер-стили поверх всё равно видны. Когда автор кладёт реальные файлы — достаточно
  убрать класс `placeholder` из HTML, в CSS ничего дораскомментировать не нужно. Для
  НЕ-`.modal-icon-btn` элементов (как `.fab-btn.heal`) тот же принцип, но фолбэк пишется
  вручную (цвет фона + `::after` с эмодзи/символом), раз общего `.placeholder`-класса там нет.
  Тот же принцип применяется к **звукам** (`SFX_FILES` в `js/ui.js`) — можно добавить имя
  файла в список ДО того, как автор реально положит `.wav` в `audio/`: `_loadSfxBuffer()`
  тихо пропускает файл, которого ещё нет (`try/catch`, см. Sound System ниже), никакой ошибки
  не будет, звук просто не сыграет, пока файл не появится.
- **Конец сессии**: перед тем как автор уходит спать, он попросит "сверить итог" — в этот
  момент нужно: (1) свериться с реальными изменениями, сделанными за сессию, (2) обновить
  чеклисты/Done-список/Backlog в этом файле, (3) прислать обновлённый `CLAUDE.md` тем же
  способом (`.txt` в чат). В течение самой сессии обновлять `CLAUDE.md` НЕ нужно — только по
  явному запросу в конце.
- **`GAME_VERSION` (`js/data.js`) НЕ поднимать без явного разрешения автора** — даже если
  правка формально попадает под критерии "версия должна вырасти" (rebalance/rename/новый тег
  и т.п.), это необходимое, но НЕ достаточное условие: ждать, пока автор сам попросит поднять
  версию.
- **Структура файла (актуализировано этой ревизией)**: документ идёт в порядке —
  (1) архитектура/механики движка (то, что нужно знать, чтобы читать/писать код), (2) единый
  актуальный срез архетипов/тегов/весов ИИ БЕЗ исторических наслоений (то, что есть в игре
  ПРЯМО СЕЙЧАС), (3) сжатый список решённых развилок (что решили и почему, без пошаговых
  цифр), (4) список художника (арт-долг), (5) backlog/незакрытые задачи, (6) план на
  маркетплейс/Version 2.0 — в самом конце, как самый дальний по времени раздел. Секция (2) —
  источник правды по текущему состоянию игры; секция (3) объясняет, ПОЧЕМУ всё стало так, как
  есть, но при противоречии верить секции (2) и живому коду. **Полный посессионный журнал
  (все даты/промежуточные цифры/пошаговые находки) вынесен в отдельный `HISTORY.md`** — читать
  его только когда реально нужен контекст конкретного давнего решения; для обычной работы
  над кодом этот файл (CLAUDE.md) самодостаточен и не требует HISTORY.md вообще.

-----
## Project Structure

```
index.html          # Markup: landing, game field, rules/lore/catalog screens
HISTORY.md          # Полный посессионный журнал правок — архив, не для рабочего
                     # чтения. CLAUDE.md ссылается сюда при необходимости контекста.
css/
  styles.css        # All styles, organized top-to-bottom into sections:
                     #   BASE → LANDING → SCREEN TRANSITIONS → HEADER →
                     #   FIELD & CARDS → HUD → LOG → MODALS → GRAVEYARD MODAL →
                     #   RULES & LORE → CATALOG → ANIMATIONS & MISC
                     # See the table of contents at the top of the file.
                     # Repeated colors (tea/jeet/hp/atk/gold/cream/backgrounds)
                     # live in :root as --color-* variables — reuse them for
                     # any new UI instead of hardcoding hex values.
audio/               # Music + SFX. Only a subset is wired up — see Sound
                     # System below before adding new sound-related code.
js/
  data.js           # Card definitions — DEFS object, GAME_VERSION constant
  abilities.js      # getTagVal(), hasTag(), getAbilities(), triggerAbilities()
  deck.js           # buildDeck(), getRushPool(), buildAiRushDeck(), mkCard(),
                    # CLASSIC_TEA_DECK/CLASSIC_JEET_DECK, SAGA_TEA_DECK/
                    # FOXY_JEET_DECK, DECK_CONFIGS, RUSH_MIN/RUSH_MAX
  state.js          # Game state G, initState(), newPlayer(), findC(), resetC(), lg()
  render.js         # render(), mkEl(), mkSmallEl(), reorderZones(), showFloat(),
                    # card-fly-clone animations (_playFieldFlyIfPending() etc.)
  game.js           # onClick(), doPlay(), doAttack(), endTurn(), killCard(),
                    # applyAuras(), checkSquadBonuses(), recalcArmor(),
                    # resolveMarketEvent(), resolveNanaEvent(), doShardTarget()...
  ai.js             # VS AI opponent — see "AI Module" section below.
                    # AI_VERSION constant, AI_WEIGHTS object
  catalog.js        # renderCatalog(), filters, openCardDetail()
  deckbuilder.js    # startRushBuild(), deckBuilderConfirm() — Rush mode deckbuilder
  ui.js             # startGame(), showScreen()/hideScreen(), preloadAssets(),
                    # playSfx(), SFX_FILES, boot
  rules-book.js     # Правила-книга (обложка+постраничный разворот) —
                    # rulesPaginate() режет .rules-source (текст правил, 4
                    # языка) на физические страницы по высоте контейнера,
                    # rulesRender() рисует текущий разворот. См. "Rules Book"
                    # секцию ниже за детали архитектуры/договорённости.
  carousel.js       # CardCarousel — мобильная карусель для руки активного игрока
sim/                 # Node-скрипты для симуляции/тюнинга баланса — см. "AI
                     # Module" секцию ниже, "Конвейер шлифовки ИИ"
  headless.js       # Основной AI-vs-AI симулятор (Classic-колоды по умолчанию)
  tune.js           # A/B-тюнинг весов AI_WEIGHTS
  saga_foxy_run.js  # Обёртка headless.js для прогона на SAGA_TEA_DECK/
                     # FOXY_JEET_DECK вместо Classic (deckConfig не пробрасывается
                     # через штатный CLI headless.js)
  *-audit.js        # Разовые кастомные аудиты конкретных архетипов/карт
                     # (историчны — каждый файл решал конкретный вопрос сессии,
                     # не переиспользуемый общий инструмент)
```

Scripts load in this exact order in `index.html`:
`data → abilities → deck → state → render → game → ai → catalog → deckbuilder → ui → rules-book → carousel`

-----

## Rules Book (`js/rules-book.js` + `.rules-*` в styles.css)

Экран правил (`showScreen('rules')`) — не скролл, а книга: обложка → постраничный
разворот. Реальный текст правил (4 языка, ENG/RUS/POR/VN) лежит в `index.html` внутри
скрытых `<div class="rules-source" id="rules{LANG}">` — они НИКОГДА не рендерятся
напрямую, это только источник данных. Каждый `<h2>` внутри = отдельная глава.

**Геометрия.** Один "лист" (что на обложке, что каждая страница разворота) —
ratio 3:4 (высота:ширина), задаётся CSS-переменными на `#rulesScreen`:
`--rpage-h`/`--rpage-w` (80vh на десктопе ≥601px, 80vw на телефоне), `--rborder`
(ширина 9-slice бордера — 84px десктоп / 42px телефон). На десктопе разворот = ДВА
таких листа рядом (лист остаётся 3:4, разворот в целом шире, не наоборот). На
телефоне видна только правая страница (`.rules-page-left` скрыта media-запросом).
Левая страница на десктопе зеркалит СВОЙ ФОН через двойной `scaleX(-1)` (на родителе
и второй раз на `.rules-page-inner`, чтобы контент не зеркалился, только рамка/фон).

**Пагинация (`rulesPaginate()`).** Меряет реальную высоту через скрытый клон
`#rulesMeasure` (та же разметка/шрифты, что у настоящей страницы, `position:fixed`
за пределами экрана). Параграфы (`<p>`) режутся **по словам** (бинарный поиск
максимального префикса, который влезает) — на след. страницу уходит только
непоместившийся остаток, а не весь параграф целиком. `<h2>`/`<h3>` — атомарные,
целиком переезжают на новую страницу при переполнении. Глава всегда начинается с
новой страницы. Стр.0 — плейсхолдер под цитату, стр.1 — оглавление (кликабельные
`.rules-toc-entry`, `onclick` через **атрибут**, не `addEventListener` — страницы
клонируются при рендере, `cloneNode` не копирует JS-обработчики, только атрибуты),
стр.2+ — главы.

**Навигация.** `RB` — глобальный стейт (`lang`, `open`, `index`, `pages`).
`rulesStep()` = 2 на десктопе (пара страниц) / 1 на телефоне. Кнопка "домой"
(`rulesGoHome()`) — двойное поведение: на обложке/цитате/оглавлении (`index<2`)
закрывает экран целиком, начиная с контента глав (`index>=2`) — прыгает обратно в
оглавление (`rulesGoto(1)`), с заменой арта на `rules_btn_oglav*.png` через класс
`.rules-navbtn-home-toc`.

**Кнопки навбокса** — конвенция автора для ЛЮБых кастомных кнопок в проекте:
`{name}1.png` idle / `{name}H.png` hover / `{name}2.png` active. Для навбокса:
`rules_btn_left*`/`rules_btn_right*` (назад/вперёд), `rules_btn_home*`/
`rules_btn_oglav*` (домой / к оглавлению). Сам бокс — 9-slice `rules_navigation_box.png`
(cut 8), без внутренних отступов по краям, только `gap` МЕЖДУ кнопками (1/4 высоты
кнопки), размер бокса — чистое произведение размера кнопок + gap. Border-width бокса
= `--rnavbtn / 3` (привязан к размеру кнопки, не к фиксированным px).

**Цвета/шрифты по языкам.** RUS и VN — не пиксельный `MEK`: RUS → `Press Start 2P`
(кириллица), VN → `Be Vietnam Pro` (обычный sans, т.к. пиксельных шрифтов с полной
поддержкой вьетнамской диакритики по сути нет). Оба грузятся через один `@import` в
начале styles.css. Классы `rus-lang`/`vn-lang` (тело+заголовки страниц) и
`rus-title`/`vn-title` (заголовок обложки) навешиваются в JS через
`RULES_LANG_CLASS`/`RULES_LANG_TITLE_CLASS` — при добавлении нового языка с
нестандартным шрифтом достаточно дополнить эти 2 объекта + CSS-класс, паджинация и
рендер сами подхватят.
Цвета текста внутри книги (только там, не влияет на остальной UI): тело `#5d2f35`,
`<h2>` (глава) `#322030`, `<h3>` (подглава) `#492833`, заголовок обложки `#0c1013`.
Оглавление — точки/номера страниц берут цвет тела, при наведении на строку —
кремовый `#E8E0C8` (тот же, что и везде в игре), плюс звук `card_navigation_cursor`
(общий делегированный hover-обработчик в `ui.js`, а не отдельным слушателем — см.
причину про `cloneNode` выше).
Заголовок обложки — свой 9-slice бокс `rules_title_bg.png` (cut 10), без внутренних
отступов, border-width = `1em/3` (авто-подстраивается под шрифт конкретного языка,
т.к. `em` = font-size самого элемента).

**Внутритекстовые ссылки на термины (`data-gl`).** Помимо оглавления (переход на
уровень ГЛАВЫ), можно ссылаться из середины текста на конкретный `h2`/`h3` в ЛЮБОМ
месте документа — например слово «Эссенции» в разделе «Карта» кликабельно и ведёт
прямо на подраздел «Эссенция» в «Ход игры». Механизм: целевой `h2`/`h3` получает
атрибут `data-gl="ключ"` (ключ — латиницей, произвольный, главное чтобы совпадал с
источником), ссылка в тексте — `<a class="rules-gloss-link" onclick="playSfx(...);rulesGotoTerm('ключ')">`.
`rulesPaginate()` при раскладке по страницам сканирует КАЖДЫЙ `h2`/`h3` на `data-gl` и
складывает `ключ → номер_страницы` в `termPageMap` (отдельно от `chapterStartIdx`,
который знает только про главы) — `rulesGotoTerm(key)` в `RB.termPageMap` ищет и прыгает
через уже существующий `rulesGoto()`. **Важный нюанс:** параграфы с инлайн-контентом
(`<img>`-иконки или `<a data-gl>`-ссылки внутри `<p>`) НЕ проходят через обычную
пословную нарезку (`rulesPaginate()` детектит `<p>` с `querySelector('img, a')` и
пускает его по «атомарной» ветке, как h2/h3, целиком) — пословная нарезка пересобирает
параграф из `node.textContent`, что уничтожило бы любую вложенную разметку. Значит
абзац со ссылкой/иконкой либо весь помещается на страницу, либо весь переезжает на
следующую — не может разорваться посередине.

**Известный незакрытый разрыв документации** — правила (все 4 языка) до сих пор не
описывают механики Frost/Foxy/Shot (введённые ПОСЛЕ последнего известного
редактирования текста правил), см. Backlog в конце файла.

-----

## Landing Page (`.landing-*` в styles.css, разметка в index.html)

### `--lw` / `--lw-bottom` — как считаются

```
--lw:        min(100vw, 600px)                                    /* мобила (<600px) — база */
--lw-bottom: var(--lw)                                             /* мобила — БЕЗ увеличения */

/* Десктоп, @media(min-width:600px): */
--tail-h:    6vh
--top-vh:    (100vh - --tail-h) * 0.5
--bottom-vh: (100vh - --tail-h) * 0.5
--lw:        min(--bottom-vh*256/240, --top-vh*256/288, 100vw)     /* см. пояснение ниже */
--lw-bottom: --lw * 1.2                                            /* нижняя группа на 20% крупнее — только десктоп */
```

`--lw`-формула на десктопе — это `min()` от двух "бюджетов": сколько `--lw` может себе
позволить ВЕРХНЯЯ группа, чтобы её 288 юнитов (потолок 32 + стена 256) влезли в `--top-vh`,
и сколько может себе позволить НИЖНЯЯ, чтобы её 240 юнитов влезли в `--bottom-vh` (оба
бюджета сейчас равны — 50/50 от высоты экрана за вычетом хвоста). Какой из двух меньше —
тот и побеждает и становится общим `--lw` для ВСЕЙ верхней группы (потолок/стена/буфер).
Нижняя группа в этой гонке не участвует — она получает своё, отдельное, `--lw-bottom`, и
на неё эта формула не давит.

### Слои и масштаб (важно, легко сломать)

- **Верхняя группа** (`.landing-top`: потолок → стена/иллюминатор → буфер) — обычный
  flow-элемент. Единственное "резиновое" — `.landing-buffer` (`flex:1 1 ...`, ужимается
  вплоть до 0) — механизм автоматического зазора: сколько бюджета `--top-vh` осталось
  после фикс. потолка+стены, столько и получает буфер, вплоть до нуля.
- **Нижняя группа** (`.landing-bottom`) физически **на 20% крупнее** на десктопе
  (`--lw-bottom = --lw * 1.2`), но при этом **не отъедает бюджет у верхней группы** —
  трюк: `.landing-bottom` остаётся обычным flow-элементом (не `position:absolute`), но
  получает `margin-top: calc(var(--lw) * -48 / 256)` (ровно те самые +20% высоты,
  посчитанные от ИСХОДНОГО `--lw`, не от `--lw-bottom`) — из-за отрицательного margin
  реально резервируемое им место в потоке остаётся прежним (нижний край стыкуется с
  `.landing-tail` там же, где и раньше), а "лишние" 20% высоты визуально вылезают ВВЕРХ,
  поверх буфера. `z-index:2` на `.landing-bottom` гарантирует, что этот прирост рисуется
  НАД буфером. **На мобиле margin-top:0 — увеличение только для десктопа.** Если менять
  множитель 1.2 — искать `--lw-bottom` в `.landing` (2 места: база и десктоп-медиа) +
  `margin-top` у `.landing-bottom` (менять оба синхронно, `48/256` = `0.2 * 240/256`).
- **Мобильный фикс**: `.landing-ceiling` (фонарь) — `display:none` по умолчанию,
  `display:block` только на десктопе. `.landing-top` держит `min-height:var(--lw)`
  (= высота одной стены-квадрата) — без этого `.landing-top` мог схлопнуться МЕНЬШЕ
  суммы своих же несжимаемых детей и стена переполняла бы свой бокс.

### Верхняя группа — состав и точные размеры

| # | Элемент | Класс | Ассет | Размер (юниты/256) |
|---|---|---|---|---|
| 1 | Фонарь | `.landing-ceiling` | `land_fonar.gif` | высота `32/256 · --lw`, **скрыт на мобиле** |
| 2 | Стена+иллюминатор | `.landing-wall` | — (только контейнер) | высота `256/256 · --lw` (квадрат `--lw × --lw`) |
| 2a | └ иллюминатор | `.landing-porthole` | 4 слоя (см. ниже) | `100% × 100%` от `.landing-wall`, `aspect-ratio:1/1` |
| 2a-1 | · фон космоса | `.porthole-space` | `logo_space.png` | `100% auto`, по центру |
| 2a-2 | · блик/стекло | `.porthole-glass` | CSS-градиент + анимация, без ассета | — |
| 2a-3 | · заголовок/подзаголовок | `.porthole-logo` | текст (`HOME'S JOURNEY` / `CCG`) | font-size `calc(var(--lw)*0.0972)` / `*0.054` |
| 2a-4 | · рама иллюминатора | `.porthole-frame` | `logo_window.png` | `100% × 100%` |
| 2b | └ боковые выносы окна (десктоп ≥600px) | `.landing-wall-ext-*` | `land_left_wall.gif` / `land_right_wall.gif` | `288/256 · --lw` квадрат, на `--lw` (НЕ `--lw-bottom`!) |
| 3 | Буфер (резиновый 3-й слой) | `.landing-buffer` | нет (прозрачный плейсхолдер) | `flex:1 1 36/256`, реально = остаток `--top-vh` |

### Нижняя группа — состав и точные размеры (все — на `--lw-bottom`)

| # | Полоса | Класс | Ассет(ы) | Высота (юниты/256) |
|---|---|---|---|---|
| 1 | Перспектива над столом | `.landing-strip-perspective` | `top_table.png` | `8/256` |
| 2 | Play-ворота | `.landing-strip-play` | `btn_playgame_gates_sheet.png` (спрайт-лист, 7 кадров, `700% 100%`), hover → `btn_playgame_hover.png`, статичная рама поверх → `btn_playgame_frame.png`; 3 кнопки режима под воротами: `btn_hotseat1/H/2.png`, `btn_vsai1/H/2.png`, `btn_online1.gif` (Online — задизейблена) | `64/256` |
| 3 | Music / Rules / SFX | `.landing-row-audio` | `btn_music_on1/2.png` (вкл) или `btn_music_off1/2.png` (выкл) — 64/256 ширины; `btn_rules1/H/2.png` — 128/256 ширины (открывает книгу правил); `btn_sfx_on1/2.png` / `btn_sfx_off1/2.png` — 64/256 | `64/256` |
| 4 | Кромка стола | `.landing-strip-edge` | `front_table.png` | `8/256` |
| 5 | Lore / декор / Catalog | `.landing-row-nav` | `btn_lore1/H/2.png` (64/256 шир.), `bot_table.png` — чистый декор без клика (128/256 шир.), `btn_catalog1/H/2.png` (64/256 шир.) | `96/256` |

Итого `8+64+64+8+96 = 240/256` — отсюда и константа `240` во всех формулах бюджета/выносов.

### Десктоп-выносы (≥600px, за пределами центральных 600px)

Все `display:none` по умолчанию, `display:block` только в `@media(min-width:600px)`.
Появляются, когда экран шире, чем центр может занять (`--lw`/`--lw-bottom` уже уперлись
в свой vh-потолок и дальше не растут) — тогда по бокам добавляется декор, а не пустота.

| Класс | Ассет (left/right) | Привязан к | Позиция/размер |
|---|---|---|---|
| `.landing-wall-ext-*` | `land_left_wall.gif` / `land_right_wall.gif` | верхней группе, на `--lw` | квадрат `288/256·--lw`, встык слева/справа от `.landing-wall`, сдвинут вверх на высоту потолка |
| `.landing-bottom-ext-*` | `left_table.gif` / `right_table.png` | нижней, на `--lw-bottom` | `64/256 · --lw-bottom` шириной, `240/256` высотой, встык со столом |
| `.landing-bottom-ext2-*` | `land_left_left_table.gif` / `land_right_right_table.gif` | нижней, на `--lw-bottom` | `240/256` квадрат, встык СНАРУЖИ от `-ext` (смещение `-304/256` = `64+240`) |
| `.landing-tail-ext-*` | `land_left_dno.gif` / `land_right_dno.gif` | нижней (продолжает стол вниз), на `--lw-bottom` | ширина `304/256·--lw-bottom` (та же, что у пары `-ext`+`-ext2`), высота `100%` от `.landing-tail` |

### Хвост (`.landing-tail`) — вне сетки

НЕ часть 256-юнитной системы, ширина `var(--lw)` (не `--lw-bottom`!), высота — чистый
`6vh` на десктопе / auto-padding на мобиле. Фон `land_dno.gif`. Держит copyright-текст
и версию игры (`GAME_VERSION` из `data.js`, подставляется в `boot()`, `ui.js`).

### Известные ограничения

- На очень узких, но высоких десктоп-окнах (условно `650×1400`, портретный монитор) —
  `--lw` может упереться в потолок `100vw`, и `--lw-bottom` (=`×1.2`) в этом случае
  вылезает за края вьюпорта на ~26px с каждой стороны. `.landing{overflow-x:hidden}`
  уже стоит, так что это тихо обрезается (без горизонтального скролла), но визуально
  стол чуть обрежется по бокам. Не пофикшено намеренно — редкий form-factor, автор
  подтвердит, если понадобится `min()`-клэмп.

-----
## Ability System

### getAbilities(card) → [{timing, effect, val, …}]

Parses `card.tags` and returns ability objects. Each has `timing`, `effect`, `val`.

### Timings

|Timing            |When it fires                                               |
|------------------|------------------------------------------------------------|
|`passive`         |Constant (provoke, pierce, invisible, vanguard, aura, gtype)|
|`_manual`         |Handled directly in game.js, not via triggerAbilities       |
|`instant`         |On play (spells)                                            |
|`on_enter`        |When played to field                                        |
|`on_turn`         |Start of owner's turn                                       |
|`on_attack`       |On each attack                                              |
|`on_kill`         |When this card kills an enemy                               |
|`on_any_death`    |When any creature dies                                      |
|`on_play_creature`|When you play any creature                                  |
|`active`          |Manual player activation                                    |

### triggerAbilities(card, timing, ctx)

Called from game.js. Filters `getAbilities(card)` by timing and executes effects.
`ctx` = `{target}` for attacks/heals.

Key call sites:

- `triggerAbilities(card, 'instant')` — spell played
- `triggerAbilities(card, 'on_turn')` — in `_runTurnStartEffects()` for worlds/artifacts/field cards
- `triggerAbilities(card, 'on_enter')` — creature enters (on-play AOE etc.)
- `triggerAbilities(card, 'on_attack', {target})` — after attack
- `triggerAbilities(card, 'on_play_creature')` — after any creature played

-----

## Aura System

### applyAuras(faction)

Called after any field change. Handles `aura:atk`, `aura:maxhp`, and `alone_samurai`.
Sources include field creatures AND world (if world has aura tag).

- `aura:atk` — resets all `atkBonus` to 0, then each source adds its val to all others
- `aura:maxhp` — resets to `baseMaxHp + squadMaxHpBonus`, then each source adds val to all others
- `world_maxhp` — applied separately, buffs ALL including aura sources themselves
- `alone_samurai` — +2 ATK while no other allied creature is on the field (dynamic, recomputed every pass)

### baseMaxHp

Stored on card to track original maxHP before any aura bonuses. Used by `applyAuras()`
to recalculate correctly each turn.

-----

## Squad System

### SQUAD_DEFS (in game.js) — ACTUAL current values

```js
const SQUAD_DEFS = [
  {gtype:'szg', count:3, effect:'maxhp', val:1},
  {gtype:'mch', count:3, effect:'param', param:'shot',  val:2},
  {gtype:'orb', count:3, effect:'armor', val:2},
  {gtype:'umb', count:3, effect:'param', param:'bolt',  val:2},
  {gtype:'drg', count:3, effect:'armor', val:1},
  {gtype:'xui', count:3, effect:'atk',   val:1},
];
```

Каждый Gate имеет ровно 3-of-a-kind squad-бонус. `count:3` для всех шести. Это
финальное состояние после серии переносов эффектов между архетипами (Szarg↔Mechird
swap 2026-08-04, Orbiton heal→armor swap раньше) — см. историю правок за хронологию,
как дошли до этого состояния.

### checkSquadBonuses(faction)

Called after every field change (doCreature, killCard, reviveCard, endTurn).
Must be called AFTER `applyAuras()` to avoid maxHp conflicts. **Must ALSO be immediately
followed by `recalcArmor(faction)`** at every one of its own call sites — squad-armor
(`squadArmorBonus`) is only a flag here, same as `squadAtkBonus`; the actual armor math
lives entirely in `recalcArmor()`.

Effects:

- `maxhp` — adds `squadMaxHpBonus` to card, mutates `maxHp`/`hp` directly (same
  "was-at-cap → grows with it" headroom rule as `aura:maxhp`)
- `atk` — adds `squadAtkBonus` to card (flag only — actual ATK total is computed on
  the fly wherever it's displayed/used: `atk+atkBonus+rageAtkBonus+squadAtkBonus+
  tempAtkBonus+sagaAtkBonus`)
- `armor` — adds `squadArmorBonus` to card (flag only — actual math in `recalcArmor()`)
- `param` — sets `card.squadParam = {param: val}` (read by heal/bolt/shot/regen logic —
  `bolt`/`shot` Active abilities check this to decide "1 vs 2 damage")

### recalcArmor(faction) — Armor stacking (own tag + squad + world + aura-from-ally)

Recomputes each card's full `armorMax` fresh on every pass:

```
newMax = ownArmorTag + squadArmorBonus + worldArmorVal + auraFromAllies
```

...and diffs against the card's stored `armorMax` from last pass to decide what happens
to current `armor`:

- **First time ever seen** (`armorMax===undefined` — just entered/revived/raised): starts
  at full, `armor=armorMax=newMax`.
- **Max grew** (aura entered, squad completed, spell buff, world changed): current
  `armor` grows by the SAME DELTA as the max did, regardless of whether the card was
  currently at full or already below cap — e.g. a creature sitting at `0/1` (already
  spent its armor this combat) that gets `+1 Armor` becomes `1/2`, not `0/2`. **Changed
  2026-08-08** (по прямому запросу автора, geymdesign-решение — "разве не честнее, если
  броня после бафа реально восстанавливается?") — previously only cards AT full cap grew
  their current value with the max; cards below cap kept the same absolute number and
  only got usable headroom after the next owner-turn refill. The new rule applies
  uniformly to ANY armorMax growth source (aura/squad/world/spell) — no special-casing
  by source type.
- **Max shrank** (aura source died, squad broke, world changed): current is clamped down
  to fit (`Math.min`) — unchanged behavior, nothing is restored or over-subtracted beyond
  the cap's own drop.

Three sources, all stacking automatically through the same formula:
- **Own tag** — `armor:N` directly on a creature.
- **Aura from an ally on the field** — `aura:armor:N` tag on a creature. Same
  self-exclusion rule as `aura:atk`/`aura:maxhp`: a source never buffs itself.
- **World** — `world_armor:N` tag on a World card (separate tag name from `aura:armor`,
  mirroring `world_maxhp` vs `aura:maxhp`).

Refill (`_runTurnStartEffects()`, start of the OWNER's own turn) checks
`card.armorMax>0` — a creature can have armor from squad/aura/world alone, with no
`armor:N` tag of its own, and still refills to its (externally-granted) cap.

Render (`.card-armor-box`/`.card-small-armor-box`) shows/hides based on the same
`card.armorMax>0` check, not `hasTag(card,'armor')`.

-----

## Targeted Spell System

Spells tagged `spell_dmg_target`/`spell_buff_temp`/`spell_untap`/`spell_dispel`/
`spell_bounce_target`/`spell_bounce_ally_target`/`spell_provoke_break_target`/
`spell_dmg_trample_target`/`spell_armor_temp`/`spell_burn_target`/`spell_fear_target`/
`spell_destroy_target` don't resolve instantly like other spells — `doPlay()` (game.js)
intercepts them BEFORE calling `doSpell()`, deducts cost, removes the card from hand,
stores it in `G.pendingSpell`, and sets `G.phase` to the matching target-selection phase.
The next click is routed by `onClick()` to the matching resolver (all in game.js, same
pattern as `doShardTarget()`). Clicking anything invalid calls `cancelPendingSpell()`,
which **refunds** the cost and returns the card to hand — **except** phases with no sane
"any other target" fallback (e.g. `spellUntapTarget`, `spellProvokeBreakTarget`), where a
click that fails the phase's precondition is silently ignored instead of cancelling.

Visual targeting highlight lives in `mkSmallEl()` (render.js) — enemy-targeting phases
get the red `.targetable`/`.aim-target` classes (same as Shard), ally-targeting phases
get the green `.healable`/`.aim-heal` classes. `#targetPromptOverlay` ("CHOOSE TARGET"
banner) show-condition in `render.js` lists every phase by name — a new targeted-spell
phase that forgets to add itself there gets no banner (silent UX gap, not a crash).

`aiResolvePendingSpellTarget()` (ai.js) auto-resolves these for the AI right after it
plays one. `aiSpellHasValidTarget()` keeps the AI from picking a targeted spell with
literally nothing to target in the first place.

**tempAtkBonus**: the ARCHIVE-family combat-trick buff lives in its own field, separate
from `atkBonus` (which is aura-driven and gets unconditionally reset to 0 every time
`applyAuras()` runs). `tempAtkBonus` is cleared explicitly in `endTurn()`'s per-turn
cleanup instead — it persists until the buffed creature dies, not just until end of turn
(this is a deliberate rework, not the literal meaning of "temp" — see history for why).

-----

## AI Module (`js/ai.js`) — VS AI opponent

A simple rule-based bot that only reads `G` and calls the SAME functions a human
click would (`doPlay`/`doAttack`/`tryAttackBase`/etc.) — it can't break any rule a
hotseat human couldn't also break. Runs only when `G.mode==='vsai' && G.turn===
G.aiFaction` (`runAiTurn()`), or for BOTH sides in AI-vs-AI spectator mode
(`G.spectatorMode`).

This is **NOT machine learning** — no training data, no self-play, no gradient descent.
It's a hand-written scoring formula; "improving the AI" means editing numbers/conditions
in `AI_WEIGHTS` and checking the result via the simulator (`sim/headless.js`).

### `AI_VERSION` vs `GAME_VERSION` — keeping the AI's card knowledge in sync

`AI_VERSION` (top of ai.js) is a separate constant from `GAME_VERSION` (js/data.js),
pinned to whichever game version ai.js was last audited against. **Bump `AI_VERSION` to
match `GAME_VERSION` only after actually re-checking ai.js against whatever changed** —
new cards, new tags/mechanics, a new type of Active ability, a rebalance that changes
what a "good" play looks like. A stale AI_VERSION relative to GAME_VERSION logs a
`console.warn` on the first AI turn and prints a line in the in-game log
(`_warnIfAiVersionStale()`, called from `aiAutoMulligan()`) — non-blocking, purely a
visibility signal.

### Active abilities the AI knows how to trigger

|Active ability        |Cards                      |AI function                                                                       |
|----------------------|---------------------------|----------------------------------------------------------------------------------|
|AOE damage             |Umbasir archetype creatures|`aiTryUseAoe()`                                                                   |
|Heal                   |Orb archetype creatures    |`aiActWithCreature()` (heals a wounded ally instead of attacking, when one exists)|
|Bolt (magic point dmg) |Umbasir `bolt:N`           |`aiTryUseBolt()`-equivalent handling inside creature-action step                 |
|Shot (physical point dmg)|Mechird `shot:N`          |`aiTryUseShot()`                                                                  |
|Shard (direct dmg)     |SHARD-family artifacts     |`aiTryUseShard()`                                                                 |

Targeted spells (see "Targeted Spell System" above) are auto-resolved by
`aiResolvePendingSpellTarget()`. Non-targeted instant spells that need more than the flat
generic score — discard, board-count-scaling AOE, mass-fear/burn, destroy-all, etc — get
their own `aiScoreCard()` branches; see "Card evaluation" below.

Everything else that reads like a "mechanic" (provoke/bushido/pierce/fear/invisible/
rage/regen/burn/squad bonuses/auras/on-play/on-death/on-attack triggers) is enforced by
the core game functions themselves regardless of whether AI or a human triggered them —
there's nothing extra for the AI to "know" there, only for genuinely player-facing
CHOICES (which of several legal targets/actions to take).

**If a new card introduces a genuinely new Active ability or targeted-choice mechanic**,
it needs its own `aiTry...()` wired into the AI's play step, or its own case in
`aiResolvePendingSpellTarget()`/`aiSpellHasValidTarget()` if it's a targeted spell — then
bump `AI_VERSION`. A new PASSIVE mechanic (no choice involved) generally needs only a
`tagBonus` entry (see below), not a new function.

### Card evaluation (`aiScoreCard()`) and `AI_WEIGHTS`

Every tunable number the formula uses lives in one place, `AI_WEIGHTS` (top of ai.js) —
tag bonuses, squad bonuses, race thresholds, spell-value multipliers.

`aiScoreCard(card, me)` scores a hand card using, beyond its raw stats:

- **Squad synergy** (`aiGtypeCount()`) — a creature that would complete an archetype's
  3-of-a-kind Squad threshold scores a large bonus (`squadCompleteBonus`); the
  1st/2nd copy toward that threshold gets a smaller one (`squadBuildBonus`).
- **Race state** (`aiRaceState()`) — `'ahead'`/`'even'`/`'behind'`, from HP difference
  AND board-power difference (`effAtk` sum) together. When `'behind'`, stabilizing tags
  (provoke/heal/regen) get extra weight (`stabilizeTagBonus`); when `'ahead'`,
  closing-out tags (fear/pierce/burn/rage) do (`aggroTagBonus`).
- **Removal spells** (`spell_dmg_target`) score based on the actual best target they can
  kill (`removalKillBonus` + a cut of the killed creature's own `effAtk`), not a flat
  score. If nothing dies, it's scored as chip damage only.
- **Buff spells** (`spell_buff_temp`) get a rough lethal check: if the buffed creature's
  `effAtk` would meet-or-beat the opponent's current HP, that's a large bonus
  (`buffLethalBonus`).
- **Revive spells** check the actual graveyard instead of assuming "a spell is always
  fine to play" — an empty graveyard scores negative.
- Discard/board-count-AOE/mass-fear/provoke-break/trample-damage spells each have their
  own dedicated scoring branch that checks "what makes it a whiff" and scales by the
  relevant board/hand number, rather than falling back to a flat generic score.

**Known boundary, by design**: this is still a single-turn greedy evaluator — no
lookahead, no resource-holding across turns, no full minimax on combat math. See
"Конвейер шлифовки ИИ" in the Backlog section for a prioritized queue of AI improvements
that would address this.

### Tag → weight coverage in `AI_WEIGHTS.tagBonus`

The general rule: **passive, unconditional card-quality tags** live in `tagBonus` (added
to a card's base score regardless of board state); **spell effects and situational
"what does this actually do right now" mechanics** get their own dedicated scoring branch
in `aiScoreCard()`/`effAtkVsTarget()` instead (see table below for which tags fall in
which bucket).

See the "AI weights" table in the unified reference block below for current values —
kept there alongside the tag/archetype reference so both stay in sync in one place
rather than duplicated across two sections.

-----

## Game State (G) — ACTUAL current shape

```js
G = {
  turn: 'tea' | 'jeet',
  turnNum: Number,
  phase: 'mulligan' | 'action' | 'selectTarget' | 'healTarget' | 'burn' |
          'sacrificeTarget' | 'shardTarget' | 'boltTarget' | 'shotTarget' |
          'spellDmgTarget' | 'spellBuffTarget' | 'spellUntapTarget' | 'spellDispelTarget' |
          'spellBounceTarget' | 'spellProvokeBreakTarget' | 'spellDmgTrampleTarget' |
          'spellArmorTarget' | 'spellBounceAllyTarget' | 'spellBurnTarget' |
          'spellFearTarget' | 'spellDestroyTarget',
  mulliganTurn: 'tea' | 'jeet',
  sel: cardId | null,
  pendingSpell: Card | null,   // held between doPlay() pausing and the target click resolving it
  previewCard: cardId | null,
  logs: [{msg, cls} | {msg:'', cls:'snapshot', hidden:true, snapshot:{...}}],
  mode: 'hotseat' | 'vsai',
  humanFaction: 'tea' | 'jeet' | null,   // vsai only
  aiFaction: 'tea' | 'jeet' | null,      // vsai only
  spectatorMode: Boolean,   // both sides AI, see AI Module section
  firstFaction: 'tea' | 'jeet',
  secondFaction: 'tea' | 'jeet',
  secondFirstTurn: Boolean, // true until secondFaction's very first turn happens
  deckConfig: 'classic' | 'rush' | 'saga_foxy',
  rushDecks: {tea:[keys], jeet:[keys]} | null,
  mulligan: {tea:{used:Number}, jeet:{used:Number}},
  gameOver: Boolean,   // set once by checkWin(); guards against the win modal / further attacks re-firing
  tea: PlayerState,
  jeet: PlayerState,
}

PlayerState = {
  hp, maxHp,     // base HP — 30/30 by default (see newPlayer(), state.js)
  ess, essMax,
  hand: [Card],
  field: [Card],
  deck: [Card],
  grave: [Card],     // creatures only — can be revived
  void: [Card],      // spells, replaced worlds, burned — gone forever
  world: Card | null,
  artifacts: [Card],
  extraDraw: Number,
  burned: Boolean,
  emptyDrawCount: Number,  // fatigue counter — 3 failed draws in a row = loss
}
```

### Card Instance Fields

Beyond DEFS values, each card instance (`mkCard()`, deck.js) starts with:

```js
{
  id, key, name, cost, hp, maxHp, atk, art, img, f, tags, ab,
  spell, world, artifact, unique, fullArt, neutral, golden,
  sleeping, exhausted, feared, burning, provokeBroken,
  atkBonus, tempAtkBonus,
  armor, shieldConsumed,
}
```

...and accumulates additional runtime-only fields as it interacts with game systems
(not present at creation, added by the relevant subsystem the first time it applies):

```js
{
  baseMaxHp,          // original maxHp before aura buffs — set by applyAuras()
  worldMaxHpBonus, worldMaxHpSet,
  squadAtkBonus, squadMaxHpBonus, squadArmorBonus, squadParam,
  armorMax, auraArmorBonus, worldArmorBonus, spellArmorBonus,
  sagaArmorBonus, sagaAtkBonus, sagaStage,     // Saga tag progression
  frozen, frozenTurnsLeft,                     // Frost Attack
  mekMarked, mekMarkTurns,                     // MonoMEK
  incarnTimer, incarnUsed,                     // Incarnation
  stealthBroken,                               // Stealth (one-time)
  interceptUsed,                               // Intercept (per-turn)
  _foxyDodgedThisHit, _shieldBlockedThisHit, _frostBlockedThisHit,  // same-tick transient flags
}
```

-----

## Graveyard Rules

- Creatures → `grave` (revivable)
- Spells → `void` after cast
- Replaced worlds → `void`
- Burned cards → `void`
- Cards in `void` have `voided: true` and are excluded from raise/revive

-----

## Sound System (`js/ui.js`)

Web Audio API, not `<audio>` per-play — `new Audio()` decodes the file fresh on every
play and creates a DOM element (audible lag on first use); a `BufferSource` created from
an already-decoded `AudioBuffer` fires at ~0ms latency instead. `preloadAssets()` calls
`_initSfxBuffers()` early in page load, which kicks off `_loadSfxBuffer(name)` for every
entry in `SFX_FILES` — each does `fetch()` + `decodeAudioData()`, stashing the result in
`_sfxBuffers[name]`. A file that doesn't exist yet on disk fails silently (`try/catch`,
no console error) — same "add the reference before the asset exists" placeholder pattern
the project already uses for button art (see Session Workflow above).

`playSfx(name, volume?)` — looks up `_sfxBuffers[name]`; if the buffer isn't loaded yet
(fetch still in flight, or file genuinely missing), it silently no-ops rather than
throwing. Respects a global on/off flag (`sfxEnabled`, `localStorage`) and an optional
per-sound throttle (`SFX_THROTTLE`, e.g. `card_navigation_cursor` at 90ms — prevents a
sound storm while dragging across many cards).

Default file extension is `.wav`; per-file overrides live in `SFX_EXT` (currently
`iceattack`/`icebreake` → `.ogg`, `miss` → `.mp3`).

**Adding a new sound**: add the bare name (no extension) to `SFX_FILES`, then call
`playSfx('name')` at the exact game-logic point the sound should fire — see the code
comments next to each entry in `SFX_FILES` for the current full list and where each one
is wired up (as of this writing: card/base combat sounds, UI clicks, Market Up/Down,
per-faction base-hit sound, card-enters-field sound, battle-start sound, and several
mechanic-specific one-offs like Frost/Foxy/Shot).

-----

## Deck Modes & Rush Deckbuilder

### Deck modes (`DECK_CONFIGS` in deck.js)

Three modes, picked via mode-select UI before Hot Seat/VS AI:

|Mode        |What happens                                                                                                       |
|------------|--------------------------------------------------------------------------------------------------------------------|
|`classic`   |Fixed preset — `buildDeck(f,'classic')` reads `CLASSIC_TEA_DECK`/`CLASSIC_JEET_DECK` (deck.js), 40 cards/faction.  |
|`saga_foxy` |Second fixed preset built around the Saga (Tea)/Foxy Trick (Jeet) synergy tags — `SAGA_TEA_DECK`/`FOXY_JEET_DECK` (deck.js), also 40 cards/faction. |
|`rush`      |No fixed list. The human player(s) build their own (`RUSH_MIN`=`RUSH_MAX`=40 cards) via the deckbuilder screen (`js/deckbuilder.js`). The AI's Rush deck (VS AI only) is `buildAiRushDeck()` — a random 40-card sample of the same pool a human would pick from. |

`_composeDeckList(f, cfg)` is the single dispatch point both `buildDeck()` (fixed
presets) and the Rush pool logic key off — `cfg==='saga_foxy'` routes to
`SAGA_TEA_DECK`/`FOXY_JEET_DECK`, anything else routes to `CLASSIC_TEA_DECK`/
`CLASSIC_JEET_DECK`.

**`getRushPool(f)` reads the ENTIRE `DEFS` for that faction** (`Object.entries(DEFS)
.filter(d.f===f && !d.neutral)`), not just whatever's in the Classic preset — every
card ever added to `data.js` for that faction is pickable in Rush, regardless of
whether it's also in `CLASSIC_*_DECK`/`SAGA_*_DECK`/`FOXY_*_DECK`. `max` is 1 for
everything except spells (max 3). This is a change from an earlier design where the
Rush pool mirrored Classic exactly — worth knowing if debugging "why does this card
show up in Rush deckbuilder but not in either preset".

The Unseen bonus card (2nd-player-only, neutral) is NOT part of the pickable pool in
Rush (`!d.neutral` filter) — granted automatically after the player finishes picking,
same as the fixed presets' `buildDeck()` does.

The choice is stored on `G.deckConfig`; for Rush, the finalized deck lists are also
stashed on `G.rushDecks` so "Restart (same setup)" can reshuffle the exact same picks.

### Rush deckbuilder flow (`js/deckbuilder.js`)

Entry point `startRushBuild(flow, opts)`, called from `ui.js` once Rush is picked (and,
for VS AI, the human's faction is chosen):

- **Hot Seat**: runs twice — Tea, then Jeet — with a "pass the device" screen between them.
- **VS AI**: runs once, for the human's faction only. The AI's deck is `buildAiRushDeck()`.

Each step shows `#deckBuilderModal` with two panes: the pool (`getRushPool()`, filtered
by the active sort button — see `DB_FILTERS`) on one side, and the currently-picked
cards on the other, rendered via `_dbStackEl()`. Single-copy cards toggle on/off by
clicking the whole card; multi-copy cards (spells) get a −/+ stepper (`dbSetQty()`).
The pool pane stays sorted by cost; the CHOSEN pane renders in the order cards were
first added (`Object.keys(_db.picks[faction])` — plain JS objects preserve string-key
insertion order, and re-picking additional copies of an already-chosen card doesn't
move its position). The "Start Game"/"Next" button is disabled until the running total
(`_dbTotal()`) reaches `RUSH_MIN`. `_finishRushBuild()` assembles `rushDecks` and calls
`initState()` exactly like the fixed-preset entry points do.

#### Deck JSON export / import (`dbExportDeck()`/`dbImportDeck()`/`_applyImportedDeck()`)

Testers can save the deck they're assembling to a `.json` file and load one back in
later. Import only replaces the CURRENT step's picks (this faction, this step).

File shape:

```json
{
  "game": "homes-journey-ccg", "kind": "rush-deck", "version": "1.0",
  "faction": "jeet", "total": 40,
  "cards": [ { "key": "j_trvl12_w", "name": "TRAVELER #12", "qty": 1 }, ... ]
}
```

`key` is the source of truth on import; `name` is purely for human readability (ignored
on import). `version` is `GAME_VERSION` at export time — `_applyImportedDeck()` compares
it against the current `GAME_VERSION` and shows a non-blocking notice if they differ,
rather than silently trusting a stale file. It also always: rejects files for the wrong
faction outright, and skips+reports (rather than silently dropping) any card `key` no
longer in the current pool, or any `qty` above what's currently available.

**`GAME_VERSION`** (`js/data.js`) — bump it whenever `DEFS` or game mechanics change in
a way that could make an older saved deck file (or battle log — also stamped into
`downloadBattleLog()`'s JSON) no longer match reality.

-----
## Unified Reference — Archetypes, Tags, NFT Traits, AI Weights (текущее состояние)

**Этот раздел — единственный источник правды по текущим формулам/тегам/весам, без
исторических наслоений.** Все числа ниже сверены напрямую с живым `data.js`/`ai.js`
на момент этой ревизии (строгая построчная агрегация hp/atk по каждому cost для
каждого gtype — без единого исключения на всём пуле карт). История ПОЧЕМУ всё стало
так, как есть — в разделе "История правок" ниже; при расхождении между историей и этим
блоком верить этому блоку и коду.

### Gates (архетипы) — сигнатурные теги, формулы, Squad-бонусы

| Gate | `gtype:` | Сигнатурный тег | Формула HP | Формула ATK | Squad-бонус (3-of-a-kind) |
|---|---|---|---|---|---|
| **Szarg** | `szg` | `pierce` (trample overflow в базу) | `cost` | `max(1, cost−1)` | +1 maxHP |
| **Orbiton** | `orb` | `heal:N` (Active) | `cost` | `1`, `cost≥4→2` | +2 Armor |
| **Dreegan** | `drg` | `provoke` (таунт) | `cost×2` | `1`, `cost≥4→2` | +1 Armor |
| **Umbasir** | `umb` | `bolt:1` (Active, магический точечный урон) | `cost` | `1`, `cost≥4→2` | Squad Bolt 2 (было 1) |
| **Mechird** | `mch` | `shot:1` (Active, физический точечный урон) | `cost` | `1`, `cost≥4→2` | Squad Shot 2 (было 1) |
| **Xuiqtr** | `xui` | `intercept` (перехват 1 удара/ход) | `cost+1` | `min(cost−1, 3)` | +1 ATK |

Живые числа по cost (проверено агрегацией по ВСЕМ картам каждой ячейки — 0 исключений):

| Gate | cost1 | cost2 | cost3 | cost4 | cost5 |
|---|---|---|---|---|---|
| Szarg | — (нет карт) | 2/1 | 3/2 | 4/3 | 5/4 |
| Orbiton | 1/1 (heal2) | 2/1 (heal2) | 3/1 (heal3) | 4/2 (heal3) | 5/2 (heal4) |
| Dreegan | 2/1 | 4/1 | 6/1 | 8/2 | 10/2 |
| Umbasir | 1/1 | 2/1 | 3/1 | 4/2 | 5/2 |
| Mechird | 1/1 | 2/1 | 3/1 | 4/2 | 5/2 |
| Xuiqtr | — (нет карт) | 3/1 | 4/2 | 5/3 | 6/3 |

Ни у одного Gate сейчас нет ни одной cost6-карты. Szarg/Xuiqtr не имеют cost1-карт.
Никакого бонуса статов за доп.теги сверх сигнатурного (Mood/World-трейты) — карта с 0,
1 или 2 доп.тегами на одном и том же cost имеет ОДИНАКОВЫЕ hp/atk; доп.теги меняют
только механику, не статы.

Umbasir/Mechird/Orbiton формула тела — буквально одна и та же (HP=cost, та же
ATK-ступенька); их ценность целиком в способности (Bolt/Shot/Heal), не в теле. Dreegan
— та же ATK-ступенька, но HP вдвое щедрее (чистая стена, без Active-способности).
Szarg/Xuiqtr — единственные два Gate с непрерывным ростом ATK от cost (не ступенькой),
"агрессивные"/"боец-танк" архетипы без Active-способности.

### Как добавить нового рядового Путешественника

1. Определить `gtype` → взять hp/atk по таблице выше для нужного cost.
2. Добавить сигнатурный тег архетипа + `gtype:xxx`, плюс опционально 1-2 доп.тега
   (Mood/World-трейт — см. таблицу ниже) — доп.теги НЕ меняют статы.
3. Вписать в `DEFS` (`js/data.js`), ключ по конвенции `{f}_trvl{N}_w` (или `_g` для
   золотых вариантов).
4. Добавить ключ в соответствующий список в `deck.js` — либо в конкретный
   `CLASSIC_TEA_DECK`/`CLASSIC_JEET_DECK`/`SAGA_TEA_DECK`/`FOXY_JEET_DECK` (если карта
   должна попасть в этот конкретный стартер), либо оставить только в `DEFS`
   (автоматически доступна в Rush-деккбилдере через `getRushPool()`, который читает
   ВЕСЬ `DEFS`, не только карты в стартерах).
5. Прогнать симулятор (`node sim/headless.js 3000`, или `sim/saga_foxy_run.js` для
   Saga/Foxy) перед тем как считать правку окончательной — три проверки: винрейт
   фракций в коридоре 45-55%, медиана партии в разумном диапазоне (~12-15 ходов),
   новая карта не выше ~63% и не ниже ~40% winrate-when-played.

Уники — тот же процесс, но статы НЕ от кривой рядовых архетипов: HP примерно
`cost+4..5`, ATK 2-4, ценность уникальности — в тегах/способности, не в голых цифрах.
Миры/Артефакты — тело 0/0 статов, вся ценность в тексте способности.

-----

### NFT Traits → Game Tags (полное сопоставление, "ритуал 10 врат")

Игра механически привязана к коллекции Home Travelers (Solana NFT) — трейты на NFT
напрямую определяют игровые теги. Гейт (Gate) NFT = архетип (`gtype`, таблица выше).
Mood (глаза/лицо) и World (фон) — обосновывают дополнительные теги сверх сигнатурного.

**MOOD → тег:**

| Mood | Тег в игре |
|---|---|
| Anime (любой цвет: Blue/Green/Mono/Pink) | `untamed` |
| Flame | `burn` |
| Love | `regen` |
| Skull | `fear` |
| Solana | `ward` |
| Candle | `draw_attack:N` |

Без назначения (базовые муды без спецэффекта): Circle, Cross, Dot, Dots, Snakes,
Square, Triangle, числовые «2»/«4»/«6»/«10».

**Ультраредкие Mood-трейты** (по 5 шт. в коллекции каждый — все пять полностью введены
в игру, кроме двух отложенных):

| Trait | Тег | Эффект |
|---|---|---|
| Orange from FFF | `foxy` ("Foxy Trick") | 50% шанс полностью проигнорировать ЛЮБОЙ входящий урон или дебафф (Fear/Burn/Frost/Provoke-break) — единый бросок в `dmgCard()`, честно работает с любым источником урона в игре |
| To the Moon with DHD | `market` ("Game of Market") | При каждой атаке/Bolt/Shot 50/50: +2 бонус-урона по цели/базе, либо −2 HP себе |
| Winter from RGB | `frost` ("Frost Attack") | На атаке замораживает цель на 2 её собственных хода (снимает и даёт иммунитет к Fear/Burn на это время); замороженная карта поглощает следующий удар любого типа целиком |
| Nanas from SMB | `nana` ("Nana") | При атаке/Bolt/Shot 50/50: банан по случайному врагу (2 физ. урона, игнорирует Ward) либо по раненому союзнику/своей базе (2 хила), с фолбэком на дамаг-ветку если лечить некого |
| DD's Signature | `dd` ("DD Cleave") | При обычной атаке (не Bolt/Shot) 1 физ. урон ВСЕМ остальным вражеским существам на поле, синхронно |
| Saga from Krtv | `saga` ("Saga") | Tea-эксклюзив: постоянный прирост статов за каждый прожитый свой ход (+1 maxHP → +1 Armor → +1 ATK, потолок 3-я стадия) |
| MonoMEK | `mek` ("MonoMEK") | На атаке вешает Метку на 2 хода — пока висит, цель получает +1 к ЛЮБОМУ входящему урону из любого источника (проверяется до брони); без Ward-иммунитета |

**WORLD → тег:**

| World | Тег в игре |
|---|---|
| Bamboo (Бамбук) | `death_heal:N` — при смерти носителя, N хила случайному РАНЕНОМУ союзнику |
| Solana Home | `shield` — Solana Shield, поглощает первый удар любого типа целиком (одноразово за стинт на поле) |
| Valley Of Tea Dragons (Долина) | `enter_draw:N` — добор при входе на поле. Сигнатурный World Чая |
| Net | `enter_lose:N` — соперник теряет карту при входе носителя на поле. Сигнатурный World Джита |
| Ancient (Эншент) | `incarnation:N` — самовоскрешение через N ходов после смерти, одноразово |
| Remember Everything | `remember` — первая смерть полностью восстанавливает HP и оставляет карту на поле (все баффы/дебаффы сбрасываются) |
| Unforgotten (Незабываемый) | `rage` — +2 ATK, пока существо ранено на ≥половину maxHP |
| Blood | `vampiric` — на атаке лечится на фактически снятый урон |
| Sands Of Time | `vanguard` — входит на поле не спящим (отображается как «Swiftness»/«Стремительность») |
| Pink Clouds ("Thunder Storm") | `death_bolt:N` — магический урон случайному врагу при смерти носителя |
| Scheme | `death_armor:N` — N брони случайному союзнику при смерти носителя |
| Optical Dope ("Optic Dope") | `death_atk:N` — N ATK случайному союзнику при смерти носителя (постоянно, `tempAtkBonus`) |

Без назначения: (никаких открытых Trait-слотов на текущий момент, все известные
трейты либо задействованы, либо намеренно отложены — Розовые облака сама механика уже
переехала на Pink Clouds выше).
Базовые фоны без эффекта: Blue, Red, Green, Pink, Mono, Galaxy Blue/Green/Mono/Pink/Red.

### Именные путешественники ("ритуал 10 врат") — паттерны генерации имени по архетипу

Коллекционер сжигает 10 генеративных NFT и получает взамен 1 кастомного 1/1-персонажа
(отдельная история легендарок, НЕ рядовых карт). Один из сожжённых номеров ("доноров")
получает СГЕНЕРИРОВАННОЕ ИМЯ вместо "TRAVELER #N" в игре — та же карта, тот же
gtype/cost/статы/теги, только `name` в DEFS меняется, ключ остаётся числовым.

| Архетип | Паттерн имени |
|---|---|
| Xuiqtr | Два коротких слова, 1 слог каждое (мягкий+жёсткий банк слогов) — напр. MAI VRAI |
| Orbiton | Одно текучее слово, 2-3 слога, мягкие сонорные согласные — напр. SELORA, MILUNA, NAMIRA, ORYTH |
| Szarg | Одно слово, тройная протяжная гласная в корне (рёв/рычание) — напр. ROOOGHA |
| Mechird | Глитч-серийник (не фонетическое слово): `M-` + цифра + символ + 2 цифры + символ + цифра — напр. M-2%42^5 |
| Dreegan / Umbasir | Паттерн ещё не определён (ждёт, пока автор дойдёт до сожжённых карт этих архетипов) |

-----

### Tag Reference — эффект + AI вес (единая таблица)

`getTagVal(card, tagName)` возвращает значение после имени тега (`heal:2`→`2`,
`vanguard`→`true`). Составные теги (`aura:maxhp:1`) парсятся корректно.

**Passive (постоянно, пока карта на поле):**

| Тег | Эффект | AI вес |
|---|---|---|
| `vanguard` | Входит на поле не спящей, может атаковать в тот же ход | 0.3 |
| `provoke` | Все вражеские атаки должны идти по этой карте (пока не exhausted) | 0.4 |
| `intercept` | Один вражеский удар за ход автоматически перенаправляется сюда (если нет Bushido/Provoke), одноразово за ход | 0.35 |
| `pierce` | После убийства цели избыточный урон переливается в базу (trample) | 0.3 |
| `bushido` | Все атаки ДОЛЖНЫ идти по этой карте (сильнее Provoke) | 0.5 |
| `invisible` | Недостижима пока есть другие союзники; без контрудара | 0.6 |
| `stealth` | Недостижима до собственной первой атаки; та атака без контрудара | 0.3 |
| `thorns:N` | Атакующий получает N урона в ответ (магический, игнорирует броню) | 0.3 |
| `shadow_shield:N` | То же, что thorns, другая тема/иконка | 0.3 |
| `alone_samurai` | +2 ATK, пока на поле нет других союзных существ | 0.3 |
| `aura:atk:N` | Союзники (кроме себя) получают +N ATK | не тегируется отдельно — `atkBonus` виден AI напрямую |
| `aura:maxhp:N` | Союзники (кроме себя) получают +N maxHP | не тегируется отдельно |
| `aura:armor:N` | Союзники (кроме себя) получают +N Armor | не тегируется отдельно |
| `armor:N` | Собственный вклад в `armorMax` (защита от физического урона) | 0.4 |
| `untamed` | Снимает exhausted уже в конце СВОЕГО хода (не ждёт хода соперника) | 0.3 |
| `ward` | Полный иммунитет к магическому урону/AOE/Fear/Burn | 0.5 |
| `shield` | Solana Shield — поглощает первый удар любого типа целиком, одноразово | 0.6 |
| `frost` | Frost Attack — заморозка цели на атаке | 0.55 |
| `foxy` | Foxy Trick — 50% полный уворот от урона/дебаффа | 0.45 |
| `market` | Game of Market — 50/50 бонус-урон/самоурон на каждом ударе | 0.15 |
| `nana` | Nana — 50/50 доп.урон врагу/хил союзнику на каждом ударе | 0.45 |
| `dd` | DD Cleave — 1 урон всем вражеским существам при обычной атаке | 0.5 |
| `mek` | MonoMEK — Метка +1 к входящему урону цели на 2 хода | 0.4 |
| `saga` | Постоянный прирост статов по ходам (см. таблицу Mood выше) | 0.5 |
| `founder_of_saga` | Аура: все Saga-карты на поле мгновенно доводятся до максимума | 0.6 |
| `synergy_saga_count` | +1 maxHP/+1 ATK за каждую Saga-карту на поле (потолок 3) | 0.5 |
| `avenge_foxy_miss` | Реактивный punish за промах по своим Foxy-картам | 0.35 |
| `synergy_foxy_count` | Зеркало synergy_saga_count для Foxy | 0.5 |
| `atk_vs_burning:N` | Условный доп.урон по горящей цели | 0.3 |
| `atk_vs_feared:N` | Условный доп.урон по испуганной цели | 0.3 |
| `gtype:xxx` | Архетипная принадлежность для squad-бонусов | н/п (структурный тег) |

**On Enter (при входе на поле):**

| Тег | Эффект | AI вес |
|---|---|---|
| `enter_aoe:N` | N урона всем врагам при розыгрыше | 0.4 |
| `enter_heal:N` | Хил N всем РАНЕНЫМ союзникам при розыгрыше | 0.3 |
| `enter_draw:N` | Добор N карт при розыгрыше | 0.5 |
| `enter_lose:N` | Соперник теряет N случайных карт при розыгрыше | 0.5 |
| `enter_fear_all` | Fear всем вражеским существам при розыгрыше | 0.6 |
| `enter_burn_all` | Burn всем вражеским существам при розыгрыше | 0.55 |

**On Turn Start:**

| Тег | Кто | Эффект | AI вес |
|---|---|---|---|
| `draw:N` | world/artifact/unique | Добор N карт | 0.6 |
| `heal:N` | artifact | Хил N всем союзникам | 0.4 |
| `regen:N` | creature | Самолечение N HP | 0.3 |
| `raise:N` | creature | Воскрешает верхнюю карту кладбища с N HP | не тегируется отдельно — оценивается через graveyard-check |
| `ess_add:N` | world/artifact | +N эссенции | не в общем tagBonus, спелл-версия — своя ветка |
| `ess_max:N` | world/artifact | +N к максимуму эссенции навсегда | не в общем tagBonus |
| `world_maxhp:N` | world | Обрабатывается в applyAuras, не triggerAbilities | н/п |
| `on_own_death:N` | world | Добор N при смерти СВОЕГО существа | через `wouldWinOnOwnDeath()`-подобные проверки, не общий tagBonus |

**On Attack:**

| Тег | Эффект | AI вес |
|---|---|---|
| `fear` | Цель пропускает следующий ход, без контрудара | 0.5 |
| `burn` | Цель теряет 1 HP в начале каждого своего хода, N ходов | 0.45 |
| `draw_attack:N` | Добор N карт при успешной атаке | 0.6 |
| `taunt_break` | Снимает Provoke с цели на время | 0.3 |
| `vampiric` | Лечится на фактически снятый урон при СВОЕЙ атаке | 0.4 |
| `necrophage` ("Erase") | При летальном ударе: стирает труп цели из графьярда навсегда + полностью лечится + снимает своё горение | 0.6 |

**On Kill / Death:**

| Тег | Эффект | AI вес |
|---|---|---|
| `on_kill_base:N` | +N HP своей базе при убийстве | через killCard()-специфичную оценку, не tagBonus |
| `on_enemy_death_base:N` | +N HP своей базе при смерти ЛЮБОГО вражеского существа | оценивается через wouldWinOnOwnDeath()-семейство проверок |
| `on_own_death_base:N` | +N HP своей базе при смерти СВОЕГО существа | то же |
| `on_play_creature:N` | +N HP своей базе при розыгрыше любого своего существа | не в общем tagBonus |
| `incarnation:N` | Самовоскрешение через N ходов, одноразово | 0.5 |
| `death_heal:N` | Хил N случайному РАНЕНОМУ союзнику при своей смерти | **0.35 (предложено этой ревизией, не проверено симулятором — по аналогии с enter_heal 0.3 + небольшая надбавка за смерть-триггер vs on-enter, тот же порядок что incarnation-семейство)** |
| `death_armor:N` | N брони случайному союзнику при своей смерти | **0.35 (предложено, не проверено — тот же принцип, что death_heal выше)** |
| `death_atk:N` | N ATK случайному союзнику при своей смерти (постоянно) | **0.4 (предложено, не проверено — чуть выше death_heal/death_armor, т.к. ATK обычно ценнее прямого HP-эффекта той же цифры в существующей шкале весов)** |
| `death_bolt:N` | Магический урон случайному врагу при своей смерти | **0.4 (предложено, не проверено — прямой урон по врагу весит на уровне bolt(0.4), тот же порядок величины эффекта)** |

**Instant (spells) — не входят в общий `tagBonus`, каждый имеет свою явную ветку
оценки в `aiScoreCard()` (см. "AI Module" выше за принцип разделения):** `draw:N`,
`revive:full`, `bounce`, `bounce_ally`, `ess_add:N`, `ess_max:N`, `lose:N`,
`spell_aoe_count`, `spell_fear_all`, `spell_burn_all`, `spell_destroy_all_enemies`,
`spell_dmg_target:N`, `spell_buff_temp:N`, `spell_armor_temp:N`, `spell_untap`,
`spell_dispel`, `spell_bounce_target`, `spell_bounce_ally_target`,
`spell_provoke_break_target`, `spell_dmg_trample_target:N`, `spell_execute_half`,
`spell_destroy_target`, `spell_fear_target`, `spell_burn_target`, `spell_draw_scale`,
`spell_loot`, `spell_random_spread`, `spell_refresh_hand`,
`spell_dmg_bonus_world_artifact`.

**Active (button/click):**

| Тег | Эффект | AI функция |
|---|---|---|
| `aoe:N` | N урона всем врагам (кнопка на карте) | `aiTryUseAoe()` |
| `heal:N` | Хил союзнику N + снятие дебаффов (creature) | `aiActWithCreature()` |
| `sacrifice` | Убить своё существо, +1 эссенция +1 карта | `aiTryUseSacrifice()` |
| `shard:N` | N урона любому вражескому существу, игнорирует Provoke/Bushido | `aiTryUseShard()` |
| `bolt:N` | N магического урона любому вражескому существу/базе (+1 если Feared) | часть общего creature-action шага |
| `shot:N` | N физического урона любому вражескому существу/базе (бьёт Ward, застревает в Броне) | `aiTryUseShot()` |

-----

### Essence pricing — спеллы (текущая эталонная сетка)

| Эффект | Cost | Эталон |
|---|---|---|
| N урона по цели (bolt-style spell) | ~урон/эссенция ≈ 1.0 | база |
| +2 ATK до конца боя (постоянно, до смерти существа) | 3 | 1.5/очко |
| +1 Armor до конца боя | 2 | округление того же эталона |
| Untap (разбудить существо) | 2 | эталон |
| Добор 2 карт | 2 | 1.0/карта |
| Discard 2 карт у врага | 4 | 2× ставка добора — discard дороже draw |
| Воскресить на полном HP | 3 | эталон |
| Получить 1 эссенцию | 0 | (снижено с 2 по решению автора — держит темп плавным) |
| Вернуть 1 существо (любую сторону) в руку | 2 | двойное применение ценнее одностороннего |
| Снять Provoke с цели | 1 | узкоспециализированный — мёртв без вражеского Provoke на поле |
| AOE = кол-во существ врага | 4 | самобаланс по борду |
| Fear/Burn всем врагам | 5 | mass-дебафф |

**Как оценивать новый спелл:** разложить на уже прайсованные компоненты выше →
добавить надбавку за реальный доп.бонус (trample-overflow, "любая сторона" вместо
"только враг") → скидка, если эффект узко ограничен условием применения → округлить
цену вверх до целого.

-----
## История — решённые развилки (сжато; полный журнал → `HISTORY.md`)

Короткий список ключевых решений в хронологическом порядке — что обсуждали, что
выбрали, почему. Конкретные числа/промежуточные состояния — только в `HISTORY.md`,
почти всегда устарели относительно кода. Формат: **тема** — решение.

- **Спящие/уставшие карты** — визуально через brightness-затемнение + анимированный
  "zZZ", не прозрачность.
- **Броня (`armor:N`)** — своя механика с 3 источниками (own tag/squad/aura/world),
  единая точка пересчёта `recalcArmor()`, работает только против физического урона
  (магия/Bolt/Shard/AOE её игнорируют).
- **Неукротимость (`untamed`)** — снимает exhausted в конце СВОЕГО хода, а не хода
  соперника — единственный такой override в игре.
- **Order-roll (кто ходит первым)** — дайс-модалка перед муллиганом вместо хардкода
  "Tea всегда первый"; второй игрок получает Unseen 6-й картой сразу после муллигана.
- **Rules Book** — книга-разворот вместо скролла, 4 языка, пословная пагинация с
  измерением реальной высоты через скрытый клон.
- **Squad-система** — порог закреплён на 3-of-a-kind для всех 6 архетипов; конкретные
  эффекты по архетипам менялись несколько раз (см. Unified Reference за текущее
  состояние — Orbiton давал heal, стал давать Armor; Szarg/Mechird менялись местами
  эффектами и формулами целиком, 2026-08-04).
- **Pierce переработан в MTG-style trample** — больше не обходит Provoke, вместо этого
  избыточный урон после убийства цели переливается в базу.
- **Contратака на смертельных ударах** — возвращена (была временно убрана, автор
  попросил вернуть).
- **Лимит поля** — максимум 6 существ с одной стороны.
- **ARCHIVE-семейство баффов (`tempAtkBonus`)** — переделаны в постоянные "до смерти
  существа", а не "до конца хода/боя" — отдельное поле от `atkBonus`, который
  сбрасывается каждый `applyAuras()`.
- **Xuiqtr: `provoke` → `intercept`** — третий, более слабый защитный слой (перехват
  1 удара за ход), архетипная замена таунта.
- **Классик-колода: тематический рефакторинг под "Врата"** — от "одна копия всего в
  игре" к тематическим 40-карточным колодам с асимметричными квотами архетипов между
  фракциями (см. Unified Reference за текущий состав).
- **Szarg ↔ Mechird архетипный своп (2026-08-04)** — Szarg забрал `pierce` и его
  формулу, Mechird получил новый `shot:1` (физический аналог Bolt). Причина: Szarg
  ощущался избыточно зубастым, у Mechird не было чёткой идентичности.
- **Frost / Foxy / Nana / DD Cleave / Market / Saga / MonoMEK** — семь ультраредких
  Mood/World-трейтов введены по одному, каждый со своей уникальной механикой (см.
  Unified Reference, таблица NFT Traits). Единая физика "Miss (Foxy) vs Absorb
  (Shield/Frost)" — на промахе атаки не было вообще, на поглощении атака состоялась,
  но урон не прошёл.
- **Именные путешественники ("ритуал 10 врат")** — сожжённые NFT-доноры получают
  сгенерированное имя вместо номера, статы/теги не меняются — чисто лорная деталь.
  Паттерн генерации имени свой для каждого архетипа (см. Unified Reference).
- **Golden Travelers (эпопея, не начата)** — по одному золотому существу на архетип,
  усиление = удвоенное значение сигнатурного тега, НЕ рост статов сверх потолка.
  Основная неначатая работа — уникальный арт (см. Список художника).
- **Animation-баги (Vanguard-вылет / смещение при смерти / карты не летят после
  рестарта)** — все три оказались ОДНОЙ причиной: idle-анимация покачивания поля по
  `nth-child` иногда матчила летящий клон карты и стирала его `translate(-50%,-50%)`.
  Один CSS-фикс (`:not(.card-fly-clone):not(.card-death-fly)`) закрыл все три.
- **Deckbuilding Version 2.0 (маркетплейс)** — спроектировано, не реализовано. Полный
  план вынесен в свой раздел в самом конце файла.

-----
## Список художника — недостающие ассеты (сверено с живым кодом на момент этой ревизии)

Собрано по всем комментариям в коде, где явно отмечено "файла ещё нет"/"404 на
деплое, закомментировано" — не история, а то, чего РЕАЛЬНО не хватает прямо сейчас.
Когда файл появится — в большинстве случаев достаточно раскомментировать
соответствующую строку в `preloadAssets()` (`js/ui.js`) и/или убрать класс
`.placeholder`, ничего в CSS дораскомментировать не нужно (см. конвенцию в Session
Workflow выше).

### Кнопки / UI

| Ассет | Где используется | Статус |
|---|---|---|
| `btn_lore_archiveH.png`, `btn_lore_archive2.png` | Ящик Lore/Catalog, hover/active состояния кнопки архива | Закомментировано в preload (404 на деплое) — только `btn_lore_archive1.png` (idle) реально есть |
| `btn_heal.png` | `.fab-btn.heal` — кнопка активного хила на карте существа | Нет файла; есть ручной CSS-фолбэк (зелёная заливка + рамка + `::after` сердечко) — как только появится реальный файл, ляжет НАД фолбэком автоматически (два `background-image` через запятую) |
| `pcard_bg.png` | Фон карточки Мира/Артефакта в статус-баре (`.pcard`) | Закомментировано в preload (404 на деплое) |

### Декоративные плейсхолдеры статус-бара/боттом-бара (Jeet-версии)

Tea-версии этих ассетов реально есть и используются; Jeet-зеркала пока отсутствуют
на диске — визуально прозрачные заглушки, ждут парного арта:

- `statbar_edge_right2_jeet.png`, `statbar_edge_left_jeet.png`
- `boltik_jeet.png`
- `statbar_extra_tea.png`, `statbar_extra_jeet.png` (ОБЕ версии, не только jeet)
- `dat4ik_jeet.gif`
- `zabor1_jeet.png`, `zabor2_jeet.png`
- `bottom_extra2_jeet.png`, `bottom_extra3_jeet.png`, `bottom_extra4_jeet.png`

### Карточный арт (травелеры без картинки)

| Карта | Файл | Статус |
|---|---|---|
| TRAVELER #687 (`j_trvl687_w`, cost2 Umbasir) | `687.png` | Новая карта этой сессии (2026-08-08) — фон останется прозрачным, пока автор не пришлёт файл |

### Звуки (SFX)

Все звуки ниже добавлены в `SFX_FILES` (`js/ui.js`) этой сессией (2026-08-08) — код
готов вызывать их, но нужно подтвердить, что сами `.wav`-файлы реально лежат в
`audio/` под ТОЧНЫМ именем (без расширения в списке, `.wav` берётся по умолчанию):

- `marketUp.wav`, `marketDown.wav` — Game of Market, звучат синхронно с плашкой MARKET UP/DOWN
- `jeetbase.wav` — отдельный звук удара по базе Jeet (вместо общего `base_atack`)
- `enter_card.wav` — существо выходит на поле (звучит на клик Play/ИИ-доигрыш)
- `startbattle.wav` — синхронно с надписью "Battle begins!" в начале боя (подтверждено
  автором как уже подключённый и рабочий на его стороне)

### Золотые путешественники — арт-задача (отдельный масштабный блок, см. Backlog)

Каждый из 6 золотых Travelers (по одному на архетип) должен получить СВОЙ уникальный
рендер/фон карты — не просто перекрашенная обычная рамка. Требует отдельного
CSS-класса/спрайта под "золотую" рамку + интеграции в render.js/catalog.js/
deckbuilder.js. Сознательно отложено автором как большой отдельный заход — см. полное
описание задачи в Backlog в конце файла.
## Backlog / незакрытые задачи

### Документация отстаёт от кода

- **Правила (`index.html`/`rules-book.js`) не описывают Frost, Foxy и Shot** — три
  механики, введённые ПОСЛЕ последнего известного редактирования текста правил, ни на
  одном из 4 языков. Armor и Untamed в правилах ЕСТЬ и актуальны — не путать.

### Найденные, но НЕ исправленные несостыковки (эта ревизия)

- **`death_armor`/`death_atk`/`death_bolt`/`death_heal` не имеют веса в `AI_WEIGHTS.tagBonus`**
  (`js/ai.js`) — ИИ оценивает карты с этими тегами как "голые статы", полностью не
  зная об их death-триггере при выборе карты для розыгрыша. В новой "Unified Reference"
  секции выше проставлены ПРЕДЛОЖЕННЫЕ значения (0.35/0.35/0.4/0.4) по аналогии с уже
  откалиброванными весами того же класса эффекта — явно помечены как "предложено этой
  ревизией, не проверено симулятором". Стоит прогнать `sim/tune.js` A/B на реальных
  картах с этими тегами, прежде чем считать значения окончательными.
- **`?v=1.07-2` query-параметр у всех `<script src>` в `index.html` отстал от
  `GAME_VERSION="1.08"`** (`js/data.js`) — используется как cache-buster; не критично
  для работы игры (браузер всё равно скачивает актуальный файл при обычной навигации),
  но при агрессивном кэшировании на некоторых хостингах/CDN может отдавать старую
  версию файла. Стоит синхронизировать при следующем деплое.

### Геймдизайн / баланс — открытые темы

- **Тренд баланса Saga vs Foxy**: за несколько последовательных заходов правок общий
  винрейт TEA устойчиво рос (51.1% → 52.3% → 52.5% → 54.1% на последнем замере) — всё
  ещё формально в коридоре 45-55%, но у самого края. Стоит либо откатить/пересмотреть
  одну из недавних замен по отдельности (чтобы понять, какая конкретно внесла основной
  вклад), либо просто держать в уме на следующих правках этой пары колод.
- **Mechird/regen** (золотые путешественники backlog) — конкретное значение `regen:N`
  для золотого Mechird ещё не решено окончательно (2 или 3), решить перед кодом.
- **Saga (Krtv trait)** — синергия с парой конкретных 1/1 из коллекции, часть нужных
  1/1 ещё не встречается в текущей метадате — ждёт уточнений автора.
- **Дыры по редким тегам, оставленные на паузе автором** (Classic-колода, состав
  travelers): `vampiric` перекошен по фракциям, `enter_draw`/`enter_lose` не идеально
  1:1 между Tea/Jeet — исторически решено не трогать до отдельного явного запроса.
- **cost5 Szarg на "двух дорогих тегах"** — введён в игру (2026-08-04, архетипный своп),
  но исходный вопрос "не переоценивает ли себя" из более раннего аудита (`sim/szg-cost5-audit.js`)
  не был переисследован ПОСЛЕ смены формулы архетипа целиком — стоит перепрогнать при
  случае, если появятся сомнения по конкретным cost5-картам в текущих sim-прогонах.

### Конвейер шлифовки ИИ — очередь улучшений бота (по убыванию отдачи)

Не сама балансировка карт, а улучшение алгоритма принятия решений бота:

1. **Жёсткий lethal-чек в начале хода** — перебор всех комбинаций атак+болтов+спеллов
   урона на летал по базе (поле ≤6 существ — перебор копеечный). Сейчас ИИ может не
   увидеть выигрыш здесь-и-сейчас; самый частый класс "глупых" ходов у rule-based ботов.
2. **Оценка разменов на 1 ход вперёд** — перед атакой считать "что снесёт соперник в
   ответ" и штрафовать атаки, отдающие размен.
3. **Сэмплинг порядков действий** — вместо жадного поочерёдного выбора генерировать
   несколько случайных перестановок хода целиком, прогонять на копии `G`, брать
   лучший итог. Снимает ловушки жадности ("сначала сыграл существо — эссенции на
   спелл не хватило").
4. **Уровни сложности бесплатно** — шум ±30% на веса (лёгкий) / текущие веса +
   lethal-чек (обычный) / + lookahead и сэмплинг (сложный).
5. **Hill-climbing весов** — цикл поверх `sim/tune.js`: мутируем 1-2 веса → прогон →
   победитель становится базой.

Дисциплина: правки логики бота НЕ смешивать в одном замере с правками карт — иначе
непонятно, что именно сдвинуло винрейт.

### Отложенные механики / идеи (не начинать без явного сигнала автора)

- **"Хеллоу Рут против Лайв Вайр"** — альтернативная пара стартеров под будущий
  режим "рандом" (детали режима не обсуждались автором) — полностью задокументирована,
  НЕ подключена к `DECK_CONFIGS`/деккбилдеру. Требует переаудита перед реальным вводом —
  часть перечисленных карт с тех пор сменила теги/costы (см. примечание в момент записи
  идеи, если решите доставать эту тему из архива).
- **Золотые путешественники** — 6 карт (по одной на архетип), удвоенное/усиленное
  значение того же сигнатурного тега вместо роста статов сверх архетипного потолка
  (правило закреплено, см. Unified Reference выше за формулы). Основная неначатая
  работа — уникальные арт-ассеты (см. Список художника выше), это осознанно отдельный
  большой заход, не делать попутно с обычным вводом рядовых карт.
- **Полный death-пакет на рядовой карте** (карта + урон базе врага + эссенция + хил) —
  рассмотрено и сознательно ОТЛОЖЕНО: слишком легко комбинируется с уже существующими
  Hunger/Reaper-подобными эффектами + Алтарём в одно самоусиливающееся действие. Если
  делать — резервировать под ОДНОГО конкретного 1/1 с урезанными статами-компенсацией,
  не под общий трейт.
## Deckbuilding Rules — Marketplace Era (Version 2.0, спроектировано 2026-07-13, НЕ реализовано)

Зафиксировано на будущее — когда появится реальное владение картами (кошелёк/маркетплейс),
constructed-режим (не Classic, не текущий безусловный Rush) должен работать по следующей
модели. Ничего из этого раздела ещё не в коде — это архитектурный план, чтобы не потерять
нюансы к моменту реализации.

**Откуда деккбилдер узнает о наличии карт (цепочка источников):**
1. **Индексер** — отдельный сервис, кэширующий "какой кошелёк чем владеет" (напр. через
   Helius/Metaplex DAS API для Solana) — прямые запросы в цепочку на каждое открытие
   деккбилдера не вариант, слишком медленно/дорого.
2. **Маппинг NFT → ключ DEFS** — у каждого заминченного NFT в attributes должен храниться
   САМ ключ карты (`"card_key": "t_trvl775_w"`), не выводиться постфактум по имени/трейтам.
3. Клиент дёргает индексер → получает `{key, qty}[]` — **тот же формат, что уже отдаёт
   `getRushPool()` сегодня**, просто `qty` теперь реальное число владеемых копий, а не
   хардкод из курируемого списка.
4. **Владение ≠ доступность.** Нужен отдельный флаг "разрешена в online/ranked" на уровне
   DEFS или отдельного списка на сервере (что-то вроде `def.enabled`) — WIP/небалансная карта
   не должна становиться играбельной только потому что кто-то её заминтил. Итоговый пул
   игрока = (что владеет) ∩ (что разрешено прямо сейчас) — тот же принцип, что уже разделяет
   "всё в DEFS" от "курируемый Classic-список" сегодня, просто третий слой той же цепочки.

**Модель данных — `{key: qty}` подтверждена, БЕЗ per-instance вариативности.** Обсуждали и
отклонили идею "у двух копий одной карты разные теги" — автор подтвердил: каждая карта в
DEFS уже устоявшийся, зафиксированный шаблон (арт рисуется под финальный набор тегов,
трейты не рандомятся при минте). Значит одна NFT-копия ключа СТРОГО идентична другой такой
же — модель "ключ → количество" (как уже `_db.picks` сегодня) остаётся верной и для
рядовых, и для уников, никакого `{key: [instanceId, ...]}` не требуется. Единственное, что
меняется под маркетплейс — откуда берётся число `max` на ключ (сегодня хардкод из
`getRushPool()`, тогда — реальное владение).

**Финальный свод лимитов для constructed-режима:**

| Тип карты | Лимит | Обоснование |
|---|---|---|
| Спелл | ≤3 копии одного ключа | как уже в Classic сегодня (per-card `SPELL_COPIES` в deck.js) |
| Рядовой путешественник | ≤3 копии одного ключа | НЕ 1 — иначе нет смысла покупать вторую/третью копию с маркета |
| Уникальный 1/1, Мир, Артефакт | ≤1 копия | по определению "уникальный" |
| Любой gtype (Врата) суммарно | ≤5 карт (независимо от того, сколько разных ключей внутри) | **ТРЕБУЕТ РЕАЛИЗАЦИИ** — этот лимит на момент данной ревизии НЕ найден в живом `deckbuilder.js` (более ранняя версия плана утверждала "уже реализовано", это устарело/было неточным — перепроверить перед стартом Version 2.0, скорее всего нужно писать с нуля) |
| Колода | одна фракция, минимум `RUSH_MIN` (40 на сегодня, было 28 на момент первой записи этого плана) | уже так работает |

Потолок в 3 копии рядового — намеренно НЕ 1: без него один сильный рядовой при достатке
копий сам по себе упирался бы в лимит gtype (5) практически в одиночку, колода превращалась
бы не в "деку", а в "5 одинаковых карт". При потолке в 3 гарантированно нужно НЕ МЕНЕЕ 2 разных
карт одного архетипа, чтобы дойти до 5 — правило создаёт разнообразие ВНУТРИ архетипа, а не
только ограничивает копирование, и стимул купить конкретную сильную карту с маркета остаётся
(можно взять 3, а не 1).

**Технически всё ложится в ОДНУ и ту же точку, что уже есть сегодня** — `getRushPool()`
отдаёт `max` на ключ, `dbSetQty()` (деккбилдер) клэмпит по нему. Разница только в том,
ОТКУДА берётся число `max`:
- Сегодня: хардкод (`1` для существ/уников/миров/артефактов, per-card копии для спеллов,
  из курируемого Classic-списка).
- Тогда: `Math.min(владеемых_копий, потолок_по_типу)`, где потолок = 3 для спелла/рядового,
  1 для уника/мира/артефакта. Отдельно нужно ДОБАВИТЬ gtype-потолок (см. таблицу выше —
  не найден в живом коде, писать заново).

**Rush-пул — развилка на будущее.** Сегодня `getRushPool()` = ровно тот же курируемый список,
что и Classic (`_composeDeckList(f, DECK_CONFIGS.classic)`), просто с раскрытыми копиями.
Когда придёт владение — естественнее, чтобы constructed-пул стал "всё, чем игрок реально
владеет" (независимо от курируемого Classic-списка), а Classic остался фиксированным
пресетом "сыграть прямо сейчас". Решить явно при реализации, не откладывать молча.

**UI-нюансы:**
- **Обратная связь при упоре в лимит.** Сегодня — silent clamp (число просто не растёт дальше
  потолка, без тоста) — для одного правила это ОК, но при НЕСКОЛЬКИХ одновременных лимитах
  (свой max копий + gtype-потолок + бюджет колоды) игроку может быть неочевидно, ПОЧЕМУ клик
  не сработал. Стоит добавить лёгкий негативный отклик (короткая тряска карточки + звук
  отказа) — тот же паттерн, что уже у "не хватает эссенции" в игре.
- **Стопка vs бейдж с числом.** До 3 копий — веер со сдвигом (как сегодня у спеллов,
  `.db-stack`), 4+ — одна карта с числовым бейджем ("×7") вместо владения. Порог совпадает с
  лимитом копий спелла/рядового (3) не случайно — веер показывает "сколько МОЖНО реально
  положить", бейдж — "сколько есть про запас сверху", один взгляд отвечает на оба вопроса.

**Не решено, отложено явно (не забыть при реализации):**
- Нейтральные карты (`neutral:true` в `mkCard()` уже существует, но нигде не используется) —
  если категория появится, решить, идут ли нейтралки ВНЕ лимита gtype/фракции или в общий пул.
- Должен ли AI-Rush (`buildAiRushDeck()`, deck.js) тоже соблюдать лимиты копий/gtype — сегодня
  этот вопрос неприменим (копии рядовых карт вообще невозможны при текущих данных); как
  только копии рядовых станут возможны — нужно будет решить и доделать.
- **Server-authoritative архитектура** — отдельная большая тема, всплывшая в обсуждении:
  если появится соревновательный PvP между разными людьми (не просто hotseat через интернет),
  весь игровой движок (`game.js`/`abilities.js`/state) должен переехать на сервер как
  источник истины, а клиент — присылать только НАМЕРЕНИЯ ходов, не готовые результаты.
  Сейчас движок client-authoritative (вся логика в браузере, `G` доступен и модифицируем
  через консоль DevTools) — это некритично для офлайн-режимов (hotseat/vs AI, где нет
  второй стороны, которую нужно защищать от читерства), но станет реальной уязвимостью в
  честном PvP. `sim/headless.js` уже доказывает, что движок технически исполняется в чистом
  Node-окружении без браузера — это первый практический шаг к серверной версии, когда до неё
  дойдёт очередь.
