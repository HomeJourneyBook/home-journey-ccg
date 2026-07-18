# Home’s Journey — CCG · Developer Guide

Two-player hotseat collectible card game. Tea (Tavern) vs Jeet, each defending a 20 HP base.
Built with vanilla HTML/CSS/JS. Hosted on GitHub Pages. No build step required.

-----

## Session Workflow — как мы работаем

*Прочитать в начале КАЖДОЙ новой сессии, прежде чем предлагать шаги.*

- **Старт сессии**: автору достаточно написать “Привет” и приложить архив проекта (zip) —
  этот файл (`CLAUDE.md`) поддерживается в актуальном состоянии специально для этого и должен
  давать полную картину: архитектуру, что уже сделано, и приоритизированный backlog того,
  что нет.
- **Как присылать ПРАВКИ автору**: НЕ архивом. Изменённые/исправленные файлы присылать прямо
  в чат как `.txt` (даже если исходный файл `.js`/`.css`/`.html`) — автор сам импортирует их
  под нужным расширением на своей стороне. Исключение — **новые** файлы, которых раньше не
  было в проекте: их можно присылать сразу с их настоящим расширением, автор загрузит их как
  есть. **Присылать НУЖНО ТОЛЬКО те файлы, которые реально поменялись в этом заходе** — не весь
  комплект каждый раз, автор сам держит актуальные версии остальных у себя.
- **Перед тем как прислать правку — проверить её живьём, не полагаться на чтение кода
  глазами** (жёсткий урок 2026-07-15: кнопка открытия правил не работала два захода подряд
  из-за опечатки — HTML-комментарий закрыт CSS-синтаксисом `*/` вместо `-->`, из-за чего браузер
  молча "съедал" весь блок разметки; синтаксис-чекеры (`node --check`) такое не ловят, т.к. это
  HTML, не JS). В окружении есть headless Chromium через Playwright
  (`python3 -m http.server` + `playwright.sync_api`) — им реально открывать страницу, кликать
  кнопки, проверять `getComputedStyle`/геометрию/`pageerror`-события и цвета ДО того, как
  отправлять файл автору. Для новых ассетов, которых ещё нет в моей копии проекта (автор
  добавил их только в свой GitHub) — создавать временные PNG-заглушки прямо в `img/` только
  для проверки верстки/geometry, и **обязательно удалять их** после теста, чтобы не попасть в
  следующую выдачу файлов.
- **Плейсхолдеры под будущий арт кнопок** (уточнено автором 2026-07-08): для кнопки без
  готовой картинки — В HTML класс `placeholder` (даёт рамку/фон/эмодзи-фолбэк, см.
  `.modal-icon-btn.placeholder` в styles.css), а `background-image:url(...)` под три
  состояния (idle/hover/active — конвеншн автора: `btn_XXX1.png`/`btn_XXXH.png`/
  `btn_XXX2.png`) прописывается СРАЗУ, некомментированным — несуществующий файл просто не
  подгружается (фон остаётся прозрачным), плейсхолдер-стили поверх всё равно видны. Когда
  автор кладёт реальные файлы — достаточно убрать класс `placeholder` из HTML, в CSS
  ничего дораскомментировать не нужно (см. пример: Classic/Rush/Import/Export/OK/Back
  кнопки). Для НЕ-`.modal-icon-btn` элементов (как `.fab-btn.heal`) тот
  же принцип, но фолбэк пишется вручную (цвет фона + `::after` с эмодзи/символом), раз
  общего `.placeholder`-класса там нет.
- **Конец сессии**: перед тем как автор уходит спать, он попросит “сверить итог” — в этот
  момент нужно: (1) свериться с реальными изменениями, сделанными за сессию, (2) обновить
  чеклисты/Done-список/Backlog в этом файле, (3) прислать обновлённый `CLAUDE.md` тем же
  способом (`.txt` в чат). В течение самой сессии обновлять `CLAUDE.md` НЕ нужно — только по
  явному запросу в конце.
- **`GAME_VERSION` (`js/data.js`) НЕ поднимать без явного разрешения автора** (уточнено
  2026-07-13, после случая, когда версию подняли самостоятельно на правках баланса/тегов —
  автор попросил откатить). Даже если правка формально попадает под критерии из описания
  `GAME_VERSION` ниже (rebalance/rename/новый тег и т.п.) — это необходимое, но НЕ достаточное
  условие: ждать, пока автор сам попросит поднять версию. **Обновление того же дня:** автор
  сам явно попросил поднять версию до `"1.01"` (не `"1.1"`) — сделано, `GAME_VERSION` теперь
  `"1.01"`, синхронно с тем, как этот же релиз называется в Roadmap ниже (“Version 1.01”) —
  то есть на этот раз номер релиза и строка `GAME_VERSION` СОВПАЛИ по факту явного запроса,
  но это разовое совпадение по факту просьбы, а не новое общее правило синхронизировать их
  автоматически — см. следующий раз снова ждать явного запроса.

-----

## Project Structure

```
index.html          # Markup: landing, game field, rules/lore/catalog screens
css/
  styles.css        # All styles, organized top-to-bottom into sections:
                     #   BASE → LANDING → SCREEN TRANSITIONS → HEADER →
                     #   FIELD & CARDS → HUD → LOG → MODALS → GRAVEYARD MODAL →
                     #   RULES & LORE → CATALOG → ANIMATIONS & MISC
                     # See the table of contents at the top of the file.
                     # Repeated colors (tea/jeet/hp/atk/gold/cream/backgrounds)
                     # live in :root as --color-* variables — reuse them for
                     # any new UI instead of hardcoding hex values.
audio/               # Music + SFX. Only a subset is wired up — see README.md
                     # "Audio" table before adding new sound-related code.
js/
  data.js           # Card definitions — DEFS object
  abilities.js      # getTagVal(), hasTag(), getAbilities(), triggerAbilities()
  deck.js           # buildDeck(), getRushPool(), buildAiRushDeck(), mkCard()
  state.js          # Game state G, initState(), findC(), resetC(), lg(), hint()
  render.js         # render(), mkEl(), mkSmallEl(), reorderZones()
  game.js           # onClick(), doAttack(), endTurn(), killCard(), applyAuras(),
                    # checkSquadBonuses(), doSacrifice_target(), doShardTarget()...
  ai.js             # VS AI opponent — see "AI Module" section below
  catalog.js        # renderCatalog(), filters, openCardDetail()
  deckbuilder.js    # startRushBuild(), deckBuilderConfirm() — Rush mode deckbuilder
  ui.js             # startGame(), showScreen()/hideScreen(), preloadAssets(), boot
  rules-book.js     # Правила-книга (обложка+постраничный разворот, добавлено
                    # 2026-07-15) — rulesPaginate() режет .rules-source (текст
                    # правил, 4 языка) на физические страницы по высоте
                    # контейнера, rulesRender() рисует текущий разворот. См.
                    # "RULES BOOK" секцию ниже за детали архитектуры/договорённости.
  carousel.js       # CardCarousel — мобильная карусель для руки активного игрока
```

Scripts load in this exact order in `index.html`:
`data → abilities → deck → state → render → game → ai → catalog → deckbuilder → ui → rules-book → carousel`

-----

## Rules Book (`js/rules-book.js` + `.rules-*` в styles.css) — построено 2026-07-15

Экран правил (`showScreen('rules')`) — не скролл, а книга: обложка → постраничный
разворот. Реальный текст правил (4 языка, ENG/RUS/POR/VN) лежит в `index.html` внутри
скрытых `<div class="rules-source" id="rules{LANG}">` — они НИКОГДА не рендерятся
напрямую, это только источник данных. Каждый `<h2>` внутри = отдельная глава.

**Геометрия.** Один "лист" (что на обложке, что каждая страница разворота) —
ratio 3:4 (высота:ширина), задаётся CSS-переменными на `#rulesScreen`:
`--rpage-h`/`--rpage-w` (80vh на десктопе ≥601px, 80vw на телефоне), `--rborder`
(ширина 9-slice бордера — 84px десктоп / 42px телефон). На десктопе разворот = ДВА
таких листа рядом (лист остаётся 3:4, разворот в целом шире, не наоборот — уточнено
автором). На телефоне видна только правая страница (`.rules-page-left` скрыта
media-запросом). Левая страница на десктопе зеркалит СВОЙ ФОН через двойной
`scaleX(-1)` (на родителе и второй раз на `.rules-page-inner`, чтобы контент не
зеркалился, только рамка/фон).

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
(cut 8), без внутренних отступов по краям, только `gap` МЕЖДУ кнопками (сейчас 1/4
высоты кнопки — было 1/2, автор попросил уменьшить 2026-07-15), размер бокса —
чистое произведение размера кнопок + gap. Border-width бокса = `--rnavbtn / 3`
(привязан к размеру кнопки, не к фиксированным px).

**Цвета/шрифты по языкам.** RUS и VN — не пиксельный `MEK`: RUS → `Press Start 2P`
(кириллица), VN → `Be Vietnam Pro` (обычный sans, т.к. пиксельных шрифтов с полной
поддержкой вьетнамской диакритики по сути нет — иначе буквы наполовину рисуются
пиксельным, наполовину системным фоллбек-шрифтом). Оба грузятся через один
`@import` в начале styles.css. Классы `rus-lang`/`vn-lang` (тело+заголовки страниц)
и `rus-title`/`vn-title` (заголовок обложки) навешиваются в JS через
`RULES_LANG_CLASS`/`RULES_LANG_TITLE_CLASS` — при добавлении нового языка с
нестандартным шрифтом достаточно дополнить эти 2 объекта + CSS-класс, паджинация и
рендер сами подхватят.
Цвета текста внутри книги (только там, не влияет на остальной UI): тело `#5d2f35`,
`<h2>` (глава) `#322030`, `<h3>` (подглава) `#492833`, заголовок обложки `#0c1013`.
Оглавление — точки/номера страниц берут цвет тела, при наведении на строку —
кремовый `#E8E0C8` (тот же, что и везде в игре), плюс звук `card_navigation_cursor`
(добавлено в общий делегированный hover-обработчик в `ui.js`, а не отдельным
слушателем — см. причину про `cloneNode` выше).
Заголовок обложки — свой 9-slice бокс `rules_title_bg.png` (cut 10), без внутренних
отступов, border-width = `1em/3` (авто-подстраивается под шрифт конкретного языка,
т.к. `em` = font-size самого элемента).

**Внутритекстовые ссылки на термины (`data-gl`, добавлено 2026-07-15).** Помимо оглавления
(переход на уровень ГЛАВЫ), теперь можно ссылаться из середины текста на конкретный
`h2`/`h3` в ЛЮБОМ месте документа — например слово «Эссенции» в разделе «Карта» кликабельно
и ведёт прямо на подраздел «Эссенция» в «Ход игры». Механизм: целевой `h2`/`h3` получает
атрибут `data-gl="ключ"` (ключ — латиницей, произвольный, главное чтобы совпадал с
источником), ссылка в тексте — `<a class="rules-gloss-link" onclick="playSfx(...);rulesGotoTerm('ключ')">`.
`rulesPaginate()` при раскладке по страницам сканирует КАЖДЫЙ `h2`/`h3` на `data-gl` и
складывает `ключ → номер_страницы` в `termPageMap` (отдельно от `chapterStartIdx`,
который знает только про главы) — `rulesGotoTerm(key)` в `RB.termPageMap` ищет и прыгает
через уже существующий `rulesGoto()`. **Важный нюанс:** параграфы с инлайн-контентом
(`<img>`-иконки или `<a data-gl>`-ссылки внутри `<p>`) НЕ проходят через обычную
пословную нарезку (`rulesPaginate()` даже не пытается — она детектит `<p>` с
`querySelector('img, a')` и пускает его по «атомарной» ветке, как h2/h3, целиком). Причина:
пословная нарезка пересобирает параграф из `node.textContent`, что уничтожило бы любую
вложенную разметку. Значит абзац со ссылкой/иконкой либо весь помещается на страницу,
либо весь переезжает на следующую — не может разорваться посередине, в отличие от обычных
абзацев. На практике это ок, т.к. такие абзацы обычно короткие.
**Авторская конвенция для .txt-черновика правил** (автор пишет так, я руками конвертирую
при каждой правке — см. журнал сессии 2026-07-15 ниже): `+img filename.png Заголовок` в
`<h3>` → иконка перед текстом; `+2img a and b Заголовок` → две иконки; `img filename`/`ico
filename` посреди абзаца → инлайн-иконка на этом месте; `[Текст]` посреди абзаца → кликабельная
ссылка (я сам подбираю, к какому `data-gl` она ведёт, по смыслу — единого автомата для этого
нет и не планируется, слишком много неоднозначностей с русскими падежами).

**Размер иконок отвязан от шрифта (`--ricon-h`, 2026-07-15).** `.rules-icon{height:var(--ricon-h,1em);width:auto;...}` — раньше было жёстко `1em` (= размеру текста), теперь отдельная
CSS-переменная, которую можно крутить per язык/брейкпоинт независимо от размера шрифта
(`.rules-page-inner.{lang}-lang{--ricon-h:calc(var(--rpage-h)*N)}`, отдельно база/мобиле и
override внутри `@media(min-width:601px)` — **порядок в файле важен**: десктопный override
должен идти ПОСЛЕ базового правила, иначе при равной специфичности класса база в конце
файла победит несмотря на media query, это уже один раз ловил как баг). `width:auto` вместо
фиксированного — иконки-кнопки (не квадратные, напр. `btn_play.png` 244×88) больше не
сплющиваются в квадрат.

**4 случайных фона страницы (`.variant-1/2/3`, 2026-07-15).** `rules_pages.png` (дефолт,
без класса) + `rules_pages1/2/3.png`. Назначаются ОДИН РАЗ на страницу в `rulesPaginate()`
(`RB.pageVariants[i] = Math.floor(Math.random()*4)`, тот же массив, что и `pages`/
`termPageMap`), применяются в `rulesRender()` на ВНЕШНИЕ `#rulesPageLeft`/`#rulesPageRight`
(не на `-Inner`, у которых меняется только контент) через `rulesApplyPageVariant()`. Стабильны
при пролистывании туда-сюда, пересчитываются заново только при полной пересборке книги
(смена языка/ресайз — `rulesEnsureBuilt(force)`).

**Известные упрощения / на будущее:** оглавление всегда 1 страница (не проходит
через ту же пагинацию, что главы — при большом числе глав может не поместиться,
не проверялось). Анимация перелистывания — её НЕТ по прямому запросу автора
(просто смена контента + звук кнопки), не путать с багом.

-----

## Landing Page (`.landing-*` в styles.css, разметка в index.html) — детализировано 2026-07-15

Вся композиция — не пиксельная вёрстка, а **256-условных-единиц сетка**: почти каждый
размер записан как `calc(var(--lw) * N / 256)`, где `N` — юнит из ТЗ автора, а `--lw`
(logical width) — единственное число, которое реально зависит от экрана. Меняется `--lw`
→ пропорционально меняется вся композиция, стыки между ассетами не едут. Есть 2 группы
(верхняя и нижняя), которые с 2026-07-15 масштабируются НЕЗАВИСИМО друг от друга (см.
"Слои и масштаб" ниже) — у нижней своя переменная `--lw-bottom`.

### `--lw` / `--lw-bottom` — как считаются

```
--lw:        min(100vw, 600px)                                    /* мобила (<600px) — база */
--lw-bottom: var(--lw)                                             /* мобила — БЕЗ увеличения */

/* Десктоп, @media(min-width:600px): */
--tail-h:    6vh
--top-vh:    (100vh - --tail-h) * 0.5
--bottom-vh: (100vh - --tail-h) * 0.5
--lw:        min(--bottom-vh*256/240, --top-vh*256/288, 100vw)     /* см. пояснение ниже */
--lw-bottom: --lw * 1.2                                            /* нижняя группа на 20% крупнее — только десктоп, см. чат 2026-07-15 */
```

`--lw`-формула на десктопе — это `min()` от двух "бюджетов": сколько `--lw` может себе
позволить ВЕРХНЯЯ группа, чтобы её 288 юнитов (потолок 32 + стена 256) влезли в `--top-vh`,
и сколько может себе позволить НИЖНЯЯ, чтобы её 240 юнитов влезли в `--bottom-vh` (оба
бюджета сейчас равны — 50/50 от höhe экрана за вычетом хвоста). Какой из двух меньше —
тот и побеждает и становится общим `--lw` для ВСЕЙ верхней группы (потолок/стена/буфер).
Нижняя группа с 2026-07-15 в этой гонке не участвует — она получает своё, отдельное,
`--lw-bottom`, и на неё эта формула не давит.

### Слои и масштаб (важно, до этого не было и легко сломать)

- **Верхняя группа** (`.landing-top`: потолок → стена/иллюминатор → буфер) — обычный
  flow-элемент, ничего не менялось. Единственное, что в ней "резиновое" —
  `.landing-buffer` (`flex:1 1 ...`, ужимается вплоть до 0) — это и есть механизм
  автоматического зазора: сколько бюджета `--top-vh` осталось после фикс. потолка+стены,
  столько и получает буфер, вплоть до нуля.
- **Нижняя группа** (`.landing-bottom`) с 2026-07-15 физически **на 20% крупнее** на
  десктопе (`--lw-bottom = --lw * 1.2`), но при этом **не отъедает бюджет у верхней
  группы** — трюк: `.landing-bottom` остаётся обычным flow-элементом (не
  `position:absolute`), но получает `margin-top: calc(var(--lw) * -48 / 256)`
  (это ровно те самые +20% высоты, посчitanные от ИСХОДНОГО `--lw`, не от
  `--lw-bottom`) — из-за отрицательного margin реально резервируемое им место в потоке
  остаётся прежним (нижний край стыкуется с `.landing-tail` там же, где и раньше), а
  "лишние" 20% высоты визуально вылезают ВВЕРХ, поверх буфера. `z-index:2` на
  `.landing-bottom` (у `.landing-top` z-index не задан — обычный static) гарантирует, что
  этот прирост рисуется НАД буфером, а не под ним. **На мобиле margin-top:0 — увеличение
  только для десктопа** (просили явно "для лаптопа"; на мобиле буфер часто МЕНЬШЕ, чем
  20% прироста, и стол залезал бы на само окно — проверено, поэтому осознанно не тронуто).
  Если понадобится когда-нибудь поменять сам множитель 1.2 — искать `--lw-bottom` в
  `.landing` (2 места: база и десктоп-медиа) + `margin-top` у `.landing-bottom` (менять
  оба синхронно, `48/256` = `0.2 * 240/256`, если множитель не 1.2 — пересчитать).
- **Мобильный фикс** (2026-07-15): `.landing-ceiling` (фонарь) — `display:none` по
  умолчанию, `display:block` возвращается только на десктопе. Без фонаря на мобиле окно
  сразу прибито к верху. Заодно `.landing-top` получил `min-height:var(--lw)` (=
  высота одной стены-квадрата) вместо `min-height:0` — **это чинит отдельный баг**: без
  этого `.landing-top` мог схлопнуться МЕНЬШЕ суммы своих же несжимаемых детей
  (потолок+стена), и тогда стена визуально переполняла свой бокс и перекрывала верх
  `.landing-bottom` (был репортован как "верх стола не отображается на телефоне", хотя
  `display:none` там нигде не стоял — реальная причина была в этом переполнении).

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
| 3 | Буфер (резиновый 3-й слой) | `.landing-buffer` | нет (прозрачный плейсхолдер — сюда вешать фон стены) | `flex:1 1 36/256`, реально = остаток `--top-vh` |

### Нижняя группа — состав и точные размеры (все — на `--lw-bottom`)

| # | Полоса | Класс | Ассет(ы) | Высота (юниты/256) |
|---|---|---|---|---|
| 1 | Перспектива над столом | `.landing-strip-perspective` | `top_table.png` | `8/256` |
| 2 | Play-ворота | `.landing-strip-play` | `btn_playgame_gates_sheet.png` (спрайт-лист, 7 кадров, `700% 100%`), hover → `btn_playgame_hover.png`, статичная рама поверх → `btn_playgame_frame.png`; 3 кнопки режима под воротами: `btn_hotseat1/H/2.png`, `btn_vsai1/H/2.png`, `btn_online1.gif` (Online — задизейблена) | `64/256` |
| 3 | Music / Rules / SFX | `.landing-row-audio` | `btn_music_on1/2.png` (вкл) или `btn_music_off1/2.png` (выкл) — 64/256 ширины; `btn_rules1/H/2.png` — 128/256 ширины (сама кнопка теперь открывает книгу правил, см. Rules Book выше); `btn_sfx_on1/2.png` / `btn_sfx_off1/2.png` — 64/256 | `64/256` |
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

### Известные ограничения (не блокирующие, зафиксированы 2026-07-15)

- На очень узких, но высоких десктоп-окнах (условно `650×1400`, портретный монитор) —
  `--lw` может упереться в потолок `100vw`, и `--lw-bottom` (=`×1.2`) в этом случае
  вылезает за края вьюпорта на ~26px с каждой стороны. `.landing{overflow-x:hidden}`
  уже стоит, так что это тихо обрезается (без горизонтального скролла), но визуально
  стол чуть обрежется по бокам. Не пофикшено намеренно — редкий form-factor, автор
  подтвердит, если понадобится `min()`-клэмп.

-----

## Adding a New Card

All cards live in `js/data.js` in the `DEFS` object.

```js
trvlr_001: {
  name: "Szarg",       // display name
  cost: 1,             // essence cost to play
  hp: 1,               // starting HP (0 for spells/worlds/artifacts)
  atk: 2,              // attack value (0 for spells/worlds/artifacts)
  art: "🦈",           // emoji placeholder until PNG art is ready
  f: "tea",            // faction: "tea" or "jeet"
  tags: ["vanguard", "gtype:szg"],  // ability tags
  ab: "Vanguard.",     // text shown in catalog and on card preview
  // Optional type flags (omit for creatures):
  // spell: true       — instant, goes to void after use
  // world: true       — permanent passive, one active at a time
  // artifact: true    — permanent, up to 2 active, sleeps first turn
  // unique: true      — legendary, 1 copy per deck
},
```

Then add the key to the relevant archetype group array in `_composeDeckList()` (`deck.js`) —
`szarg`, `orb`, `drg`, `umb`, `mch`, `xui` (4 unique cards each, 1 copy), or `legs`/`spells`/
`worlds`/`arts`. This list feeds BOTH Classic mode (`buildDeck()`) and the Rush deckbuilder’s
pool (`getRushPool()`) — no separate registration needed for Rush.

### Deck modes (`DECK_CONFIGS` in deck.js)

Two modes, picked via the “Choose Your Deck” modal shown before Hot Seat/VS AI
(see `openDeckPicker()`/`chooseDeckConfig()` in ui.js):

|Mode     |What happens                                                                                                                                                                                                                                                                                       |
|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`classic`|Fixed 1st-edition starter — `buildDeck(f,'classic')` builds all 6 archetypes + all 5 legendaries + 3 copies of each spell (~45/46 Tea/Jeet). This is “every currently-implemented card” and is expected to keep changing size as balance testing continues — see `DECK_CONFIGS.classic` in deck.js.|
|`rush`   |No fixed list. The human player(s) build their own (min. `RUSH_MIN`=28 cards) via the deckbuilder screen (`js/deckbuilder.js`) — see below. The AI’s Rush deck (VS AI only) is `buildAiRushDeck()`: a random RUSH_MIN-card sample of the same pool a human would pick from.                        |

`getRushPool(f)` returns the Rush deckbuilder’s pool — the exact same card list Classic uses
(`_composeDeckList(f, DECK_CONFIGS.classic)`), deduped into `{key, max}` entries (`max` is 1 for
everything except spells, which can be picked up to `spellCopies` times, same as Classic). This
means the Rush pool always tracks whatever Classic currently contains — no separate list to keep
in sync when cards are added/rebalanced.

The Unseen bonus card (2nd-player-only, currently always Jeet) is NOT part of the pickable
pool in Rush — it’s appended automatically after the player finishes picking, same as
Classic’s `buildDeck()` already does for Jeet.

The choice is stored on `G.deckConfig` (‘classic’/‘rush’); for Rush, the actual finalized
deck lists are also stashed on `G.rushDecks` so “Restart (same setup)” (`resetGame()`) can
reshuffle the exact same picks instead of re-opening the deckbuilder.

### Rush deckbuilder flow (`js/deckbuilder.js`)

Entry point `startRushBuild(flow, opts)`, called from `ui.js` once Rush is picked (and, for
VS AI, the human’s faction is chosen):

- **Hot Seat**: runs twice — Tea, then Jeet — with the existing “pass the device” screen
  (`showPassScreen()`) between them, same pattern used for the hotseat mulligan handoff.
- **VS AI**: runs once, for the human’s faction only. The AI’s deck is `buildAiRushDeck()` —
  no deckbuilder UI for it.

Each step shows `#deckBuilderModal` (a wide modal, not the narrow `.modal` default — see
`#deckBuilderModal .modal` inline style in index.html) with a grid of that faction’s pool
(`getRushPool()`), reusing `.cat-card`’s markup/CSS from the Catalog (smaller size — see
`.db-card` in styles.css, which locally overrides `--card-w`/`--card-h` the same way the
mobile Catalog grid does). Single-copy cards toggle on/off by clicking the whole card;
multi-copy cards (spells) get a −/+ stepper (`dbSetQty()`). The “Start Game”/“Next” button
is disabled until the running total (`_dbTotal()`) reaches `RUSH_MIN`. `_finishRushBuild()`
assembles `rushDecks` and calls `initState()` exactly like the Classic-mode entry points do.

#### Deck JSON export / import (`dbExportDeck()`/`dbImportDeck()`/`_applyImportedDeck()`)

Testers can save the deck they’re assembling to a `.json` file and load one back in later
(or hand it to someone else) — same spirit as the existing battle-log export workflow. Buttons
live in `#deckBuilderModal`‘s footer; import only replaces the CURRENT step’s picks (this
faction, this step) — it doesn’t skip the flow or touch the other faction in Hot Seat, and
there’s no “load deck” shortcut on the earlier Classic/Rush picker (by design, for now).

File shape:

```json
{
  "game": "homes-journey-ccg", "kind": "rush-deck", "version": "1.0",
  "faction": "jeet", "total": 28,
  "cards": [ { "key": "j_trvl12_w", "name": "TRAVELER #12", "qty": 1 }, ... ]
}
```

`key` is the source of truth on import; `name` is purely for human readability of the file
(ignored on import). `version` is `GAME_VERSION` (`js/data.js`) at export time.

**`GAME_VERSION`** (`js/data.js`) — bump it whenever `DEFS` or game mechanics change in a way
that could make an older saved deck file (or battle log — it’s also stamped into
`downloadBattleLog()`‘s JSON, see `game.js`/`ui.js`) no longer match reality (card renamed,
removed, rebalanced, etc). `_applyImportedDeck()` compares the file’s `version` against the
current `GAME_VERSION` and — if they differ — shows a non-blocking notice (“saved from an
older version, double-check the build”) rather than silently trusting a stale file. It also
always: rejects files for the wrong faction outright, and skips+reports (rather than
silently dropping) any card `key` no longer in the current pool, or any `qty` above what’s
currently available (capped, reported, not rejected).

-----

## Tag System

Tags are strings in `card.tags`. Simple (`"vanguard"`) or with value (`"heal:2"`).
Multi-segment tags like `"aura:maxhp:1"` are parsed correctly by `getTagVal()`.

### getTagVal(card, tagName)

Returns the value after the tag name. Examples:

- `getTagVal(card, 'heal')` on `"heal:2"` → `2`
- `getTagVal(card, 'aura:maxhp')` on `"aura:maxhp:1"` → `1`
- `getTagVal(card, 'gtype')` on `"gtype:drg"` → `"drg"` (string)
- `getTagVal(card, 'vanguard')` on `"vanguard"` → `true`

### All Tags

**Passive (constant while on field):**

|Tag            |Effect                                                         |
|---------------|---------------------------------------------------------------|
|`vanguard`     |Attacks the turn it enters                                     |
|`provoke`      |All enemy attacks must target this. **2026-07-17**: no longer on Xuiqtr (`gtype:xui`) — all 8 Xuiqtr cards (both factions) swapped to `intercept` instead (see below); still live on Dreegan (`gtype:drg`).|
|`intercept`    |Xuiqtr's replacement for `provoke` (2026-07-17) — a THIRD, weaker defensive layer, below Bushido and Provoke: if the field has neither, one enemy attack per turn is automatically redirected onto this creature no matter which card the attacker picked (selection UI is untouched — `getTargetableCards()` doesn't know about Intercept at all; the swap happens at resolution time, inside `doAttack()`/`tryAttackBase()`, via a new `getInterceptor()` helper that checks Bushido→Provoke→available Intercept creature, in that order). Doesn't consume if the attacker already picked this creature directly. Once per turn per creature (`card.interceptUsed`, reset at the start of the OWNER's own turn — the "once per turn" only means anything during the turn the intercepting creature's owner is being attacked, i.e. the opponent's turn, so resetting at owner-turn-start is the earliest point that's still correct); with multiple Intercept creatures, whichever entered the field first (`field` array order = play order, `.push()`-only) goes first. `tryAttackBase()` explicitly marks `interceptUsed` itself when redirecting a base-click, since calling `doAttack(att, interceptor)` directly means `doAttack()`'s own redirect branch never fires (target already equals the interceptor) — a bug caught during implementation, not shipped.|
|`thorns:N`     |"Fire Shield" (2026-07-17, FAERON) — anti-invisible counterpart #1: whoever attacks this creature takes N damage back (magic, bypasses Armor, blocked by Ward), resolved in `doAttack()` right after the counter-attack, same "regardless of survival" contract (`deferDeath=true`) — skipped only if this exact hit was fully absorbed by Solana Shield (`target._shieldBlockedThisHit`), same rule fear/burn/taunt_break already follow.|
|`stealth`      |"Stealth" (2026-07-17, TEANTIST) — anti-invisible counterpart #2: cannot be targeted by a normal creature attack until it attacks for the first time (filtered out of `visible` in `getTargetableCards()`, same slot invisible's filter lives in — does NOT block targeted spells/Shard/AOE, same scope invisible itself has). That first attack (`card.stealthBroken` false→true) deals no counter-damage — snapshotted as `stealthFirstStrike` before the flag flips, same anti-self-cancelling pattern as `wasFearedBefore`/`wasExhaustedBefore`. One-time only; does nothing once broken. Resets on revive (`reviveCard()`/`resetC()`), same lifecycle as every other per-stint flag.|
|`pierce`       |**Reworked 2026-07-17 (MTG-style trample), twice same day.** No longer bypasses Provoke at all — Provoke is now absolute for every attacker (`getTargetableCards()`/`canAttackBase()` in game.js have zero pierce exception). Pierce's sole remaining perk lives in `doAttack()`: after normal combat resolves against WHATEVER creature it attacked (originally only Provoke-forced targets, widened same day to any enemy creature per author feedback — "reads more consistent"), if the hit was lethal, the overkill beyond the target's HP+Armor pool (read off `target.hp` going negative — see `dmgCard()` comments) splashes into the enemy base. A still-shielded target (Solana Shield) absorbs the whole hit, so overflow is correctly 0 with no separate check needed.|
|`bushido`      |All attacks must target this (overrides Pierce)                |
|`invisible`    |Cannot be targeted while allies exist; no counter when attacked|
|`aura:atk:N`   |All allies except self get +N ATK                              |
|`aura:maxhp:N` |All allies except self get +N maxHP                            |
|`aura:armor:N` |All allies except self get +N Armor (see `recalcArmor()`, Squad System section — stacks with squad-armor and `world_armor`). Added 2026-07-10, test-live on ABYSSWALKER (`aura:armor:1`).|
|`world_maxhp:N`|All allies including aura sources get +N maxHP (world only)    |
|`world_armor:N`|All allies get +N Armor (world only — mirrors `world_maxhp` naming, not `aura:armor`, since a World card isn't a creature and has no self-exclusion question). Added 2026-07-10, infrastructure only — no World card uses it yet.|
|`gtype:xxx`    |Traveler type for squad bonuses (szg/orb/drg/umb/mch/xui)      |
|`armor:N`      |A creature's OWN contribution to its `armorMax` total (own tag + squad + aura-from-ally + world — see `recalcArmor()`, Squad System section, added 2026-07-10). Extra HP-like buffer, absorbed BEFORE hp — but ONLY on PHYSICAL damage (the two `dmgCard()` calls inside `doAttack()`: the attack itself + its counter-attack) AND `enter_aoe` (on-enter AOE burst — author call 2026-07-10: not considered "magic" for this purpose, unlike the rest of the AOE family). Magic damage bypasses armor entirely — AOE active (`doUmbAsir()`/`doVardan()`), Shard (`doShardTarget()`), and targeted-spell damage (`doSpellDmgTarget()`) all call `dmgCard(card,dmg,faction,true)` — the 4th `bypassArmor` param; `enter_aoe` deliberately does NOT pass it (same `case 'aoe':` in `abilities.js` handles only `enter_aoe` in practice — `triggerAbilities(card,'active')` is never actually called, active AOE has its own dedicated code path in `doUmbAsir()`/`doVardan()`). Burn also bypasses it, via its own separate code path (see `burn` above) — armor is purely an anti-physical defense (author call, 2026-07-10). Refills to `armorMax` (NOT just its own tag value anymore — see `recalcArmor()`) at the start of the OWNER's own turn (`endTurn()`), NOT the opponent's. Reset to 0/`undefined` when a card leaves field/gets reshuffled (`resetC()`/`killCard()`). Added 2026-07-10, live on NABUNAGI/ABYSSWALKER (`armor:2`) — see Version 1.01.|
|`untamed`      |"Неукротимость" — this creature's `exhausted` clears already when ITS OWN turn ends (i.e. already usable/counter-attacking during the opponent's turn), instead of waiting for its owner's next turn like every other creature. Deliberate override of the normal exhausted-clears-on-owner's-turn rule (`endTurn()`) — Mood trait justification: Anime pink (see Lore/Trait mapping). Added 2026-07-10, live on FAERON/TUBORG (`untamed`). Renders as `ico_untamed.png` (author-supplied) via the same `TAG_ICONS`/`TAG_TOOLTIPS` pattern as fear/burn/etc — no longer spelled out in `ab` text on those two cards, same convention as every other tag icon.|
|`shield`       |Solana Shield (World-trait) — absorbs the FIRST hit of ANY kind (physical or magic, including counter-attack) entirely, checked at the very top of `dmgCard()` (game.js), before both Armor and Ward — unlike those two (each blocks only their own damage category), Shield blocks either. Fully one-time for the card's CURRENT stint on the field — `card.shieldConsumed` flips true and never refills on its own, but DOES reset (recharges) via `resetC()`/`reviveCard()` if the creature leaves the field and is later replayed/revived, matching its "activates on entry" flavor. Sets a same-tick transient flag `card._shieldBlockedThisHit` that `fear`/`burn`/`taunt_break` (on_attack cases, abilities.js) also check — a fully-absorbed hit carries NONE of its side-effects either, not just no HP loss (deliberately stricter than Armor, which lets fear/burn through even on a fully-absorbed hit). Does NOT intercept the burn DoT tick (that bypasses `dmgCard()` entirely by design, same exemption Armor already has). Render: field-only (`mkSmallEl()`) swaps the HP number for `img/solana_shield.png` in `.card-small-hp-box` while active (hand/catalog/deckbuilder show no icon swap — just the `ab` text mentions "Solana Shield"); status panel (`_cardStatusEntries()`) gets an explanatory row while active. Added 2026-07-13, live on TRAVELER #704 (test) and reserved for the Solana World-trait — NOT to be confused with the already-assigned Mood:Солана trait (→`ward`, a different, permanent magic-immunity mechanic; no overlap).|
|`ward`         |Magic-damage counterpart to Armor — full immunity to exactly the damage category that's flagged `bypassArmor=true` in `dmgCard()` (game.js): active AOE (`doUmbAsir()`/`doVardan()`), Shard (`doShardTarget()`), targeted-spell damage (`doSpellDmgTarget()`). Checked BEFORE the Armor/HP damage branch — `if(bypassArmor && hasTag(card,'ward'))` short-circuits and returns, still shakes the card for feedback. Mirror-image of Armor's scope: Armor blocks `bypassArmor=false` (regular attacks + counter-attacks + `enter_aoe`), Ward blocks `bypassArmor=true` — together they cover every `dmgCard()` call, deliberately non-overlapping. **2026-07-18 (по прямому запросу автора): теперь ТАКЖЕ блокирует Fear и Burn** — оба применяются отдельными путями (не через `dmgCard()`), так что проверка на `ward` продублирована в `abilities.js` во всех 4 местах, где выставляется `card.feared`/`card.burning` (`case 'fear'`/`'burn'` — точечные, и `fear_all`/`burn_all` — массовые, там `ward`-существа просто исключаются из фильтра целей). No stacking/value — pure boolean tag, no `:N`. Renders as `ico_ward.png` via `TAG_ICONS`/`TAG_TOOLTIPS`. Live on the Солана (Solana) Mood trait, 0.66 (see Essence pricing shop) — not to be confused with the separate Solana World-trait (→`shield`, a different, one-time-any-damage mechanic; no overlap). **Снят с TEANTIST 2026-07-18** (по прямому запросу автора — карта осталась с `draw:1`/`stealth`, без Ward).|

**On Enter:**

|Tag          |Effect                             |
|-------------|-----------------------------------|
|`enter_aoe:N`|N damage to all enemies when played|
|`enter_heal:N`|Heal N HP to all WOUNDED allies when played (self included if already on field at trigger time, but a just-entered creature is always at full HP so this never applies to itself in practice). Reuses the same `hp_add`/`target:'all'` execution path as World's on-enter heal (see Ability System below) — added 2026-07-13, live on TRAVELER #1/#583/#11 (test, bumped 1→2 same day) and reserved for the Bamboo World-trait (см. Essence pricing shop, `enter_heal:2`).|
|`enter_draw:N`|Owner draws N cards when this creature is played. Reuses the same `draw` execution path as instant/on_attack draw (see Ability System below) — no fly/sound animation, same as every other "draw outside turn start" source (Hunger/Altar/spell draw/Ryvlen). Added 2026-07-13, live on TRAVELER #6 (test) and reserved for the Valley World-trait (см. Essence pricing shop, `enter_draw:1`).|

**On Turn Start:**

|Tag             |Who                  |Effect                                     |
|----------------|---------------------|-------------------------------------------|
|`draw:N`        |world/artifact/unique|Draw N cards                               |
|`heal:N`        |artifact             |Heal all allies N HP                       |
|`regen:N`       |creature             |Restore N HP to self                       |
|`raise:N`       |creature             |Revive top graveyard card at N HP          |
|`ess_add:N`     |world/artifact       |Add N Essence                              |
|`ess_max:N`     |world/artifact       |+N to Essence max permanently              |
|`world_maxhp:N` |world                |Handled in applyAuras, not triggerAbilities|
|`on_own_death:N`|world                |Draw N when your creature dies (Hunger)    |

**On Attack:**

|Tag            |Effect                                   |
|---------------|-----------------------------------------|
|`fear`         |Target skips next turn, no counter-attack|
|`burn`         |Target takes 1 dmg each turn start       |
|`rage`         |Self gets +1 ATK permanently             |
|`draw_attack:N`|Draw N cards                             |
|`taunt_break`  |If target has Provoke, suppresses it (target.provokeBroken=true) — can be freely attacked past this turn, ignoring Provoke, as if the tag weren't there. No-op (silent, no log/sfx/icon) if target has no Provoke. Clears at the same point `feared` clears in `endTurn()` (end of the TARGET OWNER's own next turn) — net effect: broken through the rest of the attacker's turn + the target owner's following turn, back to normal by the attacker's next turn. Added 2026-07-13, live on TRAVELER #26/#550 (test) and reserved for the Схема (Skhema) World-trait.|
|`vampiric`     |On its OWN attack (not counter-attacks — same scope as fear/burn/taunt_break): heals for the ACTUAL HP removed from the target (`ctx.realDmgDealt` in `doAttack()`, game.js — a before/after HP snapshot around `dmgCard()`, NOT nominal ATK), capped at its own missing HP. Armor/Solana Shield absorption doesn't count as "drained" — if the hit was fully absorbed, `realDmgDealt=0`, no heal. Fires whether or not the target survives (lifesteal doesn't require a kill, unlike necrophage below). Added 2026-07-13, live on TRAVELER #775 (Jeet Dreegan) and reserved for the Незабываемый World-trait, 0.66.|
|`necrophage` ("Erase" in `ab` text) |On its OWN attack, ONLY if the hit was lethal (`on_kill` timing — see doAttack()'s `if(target.hp<=0) triggerAbilities(att,'on_kill',{target})`): erases the fallen creature from ITS owner's graveyard straight into their void (bypassing grave entirely — breaks any ticking Incarnation timer, no return possible), fully heals this creature to max HP, and cleanses its own Burning. Scope: attack-kills only — Shard/Bolt/AOE kills do NOT trigger this (separate damage paths, don't route through `doAttack()`'s on_kill call). Added 2026-07-13, live on TRAVELER #734 (Tea Szarg) and reserved for the Забудь всё World-trait, 0.66.|

**On Kill / Death:**

|Tag                  |Effect                                    |
|---------------------|------------------------------------------|
|`on_kill_base:N`     |+N HP to own base on kill                 |
|`on_enemy_death_base:N`|+N HP to own base on ENEMY creature death only. **Renamed/nerfed 2026-07-17** from `on_any_death_base` — used to fire on ANY death including the owner's own trades, which meant REAPER (the only card with this tag) healed the base even off a losing exchange. `killCard()` (game.js) now checks `card.f!==f` (the dying card's faction must be the OPPONENT of the tag-owner's faction) before healing.|
|`on_own_death_base:N`|+N HP to own base on YOUR OWN creature's death only. Added 2026-07-17 as REAPER's mirror-image ("anti-REAPER": profits off your own losses instead of the enemy's) — briefly lived on FAERON, moved to ASLEX same day once FAERON got `thorns` instead (see Passive table below) — `Reaper ↔ Aslex` is the intended pairing now. Same loop as `on_enemy_death_base` in `killCard()`, condition flipped (`card.f===f`). The dying card is already spliced out of `field` by the time this loop runs, so a card can never trigger off its own death.|
|`on_play_creature:N` |+N HP to own base when you play a creature|
|`incarnation:N`      |Self-only, delayed auto-revive. On this creature's OWN death (not other deaths), starts a timer: `card.incarnTimer=N`, ticks down by 1 in each of the OWNER's own `endTurn()` calls while the card sits in the graveyard, and self-revives at full HP once it hits 0 (see "Инкарнация — тик по кладбищу" block in game.js). One-time only — `card.incarnUsed` gets set on that revive, and if the card dies AGAIN afterward, `killCard()` forces `toVoid=true` regardless of the normal grave/void split, sending it straight to the Void instead of restarting the timer (no infinite respawn loop). Only applies to creatures — spells/worlds/artifacts never reach this branch. No interaction with burning-to-void (Burn/manual Void routes bypass the grave entirely, which already skips the timer for free — no separate check needed). Renders as `ico_incarn.png` via `TAG_ICONS`/`TAG_TOOLTIPS`. Live on the Эншент (Ancient) Mood trait, `incarnation:4`, 0.66 (see Essence pricing shop).|

**Instant (spells):**

|Tag          |Effect                                                               |
|-------------|---------------------------------------------------------------------|
|`draw:N`     |Draw N cards immediately                                             |
|`revive:full`|Revive last creature from graveyard at full HP                       |
|`bounce`     |Return all field cards to hands (delayed — see Targeted Spells below)|
|`ess_add:N`  |+N Essence this turn                                                 |
|`ess_max:N`  |+N to Essence max                                                    |
|`lose:N`     |Opponent discards N random cards from hand. Added 2026-07-17, live on FORGET-ME-NOT (Tea)/MINDROT (Jeet), `lose:2`. Silently no-ops on an empty opponent hand (`case 'lose'`, abilities.js) — `aiScoreCard()` mirrors `revive`'s empty-graveyard handling for this (`loseEmptyHandScore`), scales up with opponent hand size otherwise.|
|`spell_aoe_count`|Damage to ALL enemy creatures equal to their own current count (no fixed `:N` — computed at cast time from `G[oppK].field.length`, see `case 'aoe_count'`, abilities.js). Self-balancing by design: near-useless on a thin board, a full wipe on a packed one. Magic damage (bypasses Armor, blocked by Ward). Added 2026-07-17, live on RECKONING (Tea)/SWARM CULL (Jeet), cost 4. `aiScoreCard()` scores it by live enemy-creature count (`aoeCountEmptyBoardScore`/`aoeCountPerTargetWeight`), not the flat generic baseline.|
|`spell_fear_all`|Applies the Fear status (see `fear` On Attack tag above) to every enemy creature at once — reuses the exact same `card.feared` flag and its existing clear-timing (`endTurn()`), not a new status. Added 2026-07-17 ("Mass Sap" concept) as `case 'fear_all'` (abilities.js), live on STILLNESS (Tea)/NIGHTMARE (Jeet), cost 5. Note: a literal "set `exhausted=true`" implementation was considered and rejected — `exhausted` clears at the START of the target owner's OWN turn (`endTurn()`), i.e. before they'd ever feel the effect, so it can't be used to skip an opponent's upcoming turn; `feared` clears at the END of their turn instead, which is the correct timing for this. `aiScoreCard()` scores by live enemy count + a `'behind'`-state bonus (pure defensive tempo card).|

**Targeted spells (pause for a click, like Shard):**

|Tag                 |Targets|Effect                                                                                                              |
|--------------------|-------|--------------------------------------------------------------------------------------------------------------------|
|`spell_dmg_target:N`|enemy  |N damage to the chosen enemy creature (ARCHIVE→removed this, now JOURNEY)                                           |
|`spell_buff_temp:N` |ally   |+N ATK until end of turn (`tempAtkBonus`, see below) — ARCHIVE. Target restriction relaxed 2026-07-15: sleeping/exhausted allies are now valid targets too (only feared allies are excluded) — author's reasoning, nothing stops you from pre-buffing your own creature regardless of its action-state. Fixed in 3 places that had to move together: `onClick()`'s phase-routing check, the `.healable`/`.aim-heal` highlight condition in `render.js`, and `doSpellBuffTarget()`'s own internal validation (was silently rejecting even after the first two were fixed).|
|`spell_untap`       |ally   |Removes sleeping/exhausted, can act again this turn — OBLIVION                                                      |
|`spell_dispel`      |enemy  |Strips fear/burn/atk-buffs/squad bonuses — coded (`doSpellDispelTarget`) but not currently assigned to any live card|
|`spell_bounce_target`|any (own or enemy)|Single-card bounce — return ONE chosen creature to its owner's hand (not necessarily the caster's hand). Unlike `bounce` (UNSEEN — both sides' entire field), this targets any one field creature, either side. Fifth targeted-spell phase (`spellBounceTarget`), same `doPlay()`→pause→`onClick()`→`doSpellBounceTarget()` pattern as the other four. Added 2026-07-14, live on GUST (Tea)/REVERSE (Jeet), `t_sp5`/`j_sp5`. **Bug fixed 2026-07-15**: the target-prompt overlay ("CHOOSE TARGET / CLICK HERE TO CANCEL", `#targetPromptOverlay`) was missing this phase from its show-condition in `render.js` — same overlay omission also affected `healTarget`, which the code comment already claimed was handled but wasn't; both added in the same fix.|
|`spell_provoke_break_target`|enemy, Provoke only|EXPOSE (Tea)/UNMASK (Jeet), cost 2. Sets `card.provokeBroken=true` on the chosen target — same flag/clear-timing the `taunt_break` on-attack tag already used, just delivered as its own spell instead of a side-effect of attacking. Sixth targeted-spell phase (`spellProvokeBreakTarget`). Restricted at the click level (`onClick()`) to ONLY creatures that currently have unbroken Provoke — a click on anything else is silently ignored (does NOT cancel/refund), same UX precedent `spell_untap` set 2026-07-15 for "clicking something that fails the precondition." Added 2026-07-17.|
|`spell_dmg_trample_target:N`|enemy|BREACH (Tea)/RUPTURE (Jeet), cost 4, N=5. Same as `spell_dmg_target` (magic damage, bypasses Armor, blocked by Ward) but ALSO applies the pierce-trample overflow-to-base math from `doAttack()` — see `pierce` in the Passive table above — regardless of whether the attacker itself has the `pierce` tag; the trample here comes from the spell, not the caster. Seventh targeted-spell phase (`spellDmgTrampleTarget`). Added 2026-07-17.|

See “Targeted Spell System” section below for how these pause/resolve/cancel.

**Active (button/click):**

|Tag        |Effect                                                                |
|-----------|----------------------------------------------------------------------|
|`aoe:N`    |N damage to all enemies (button on card)                              |
|`heal:N`   |Heal ally N HP + remove debuffs (creature)                            |
|`sacrifice`|Altar: kill one of your creatures, +1 Essence                         |
|`shard:N`  |N damage to any enemy creature, ignores Provoke/Bushido. **2026-07-17**: two artifacts now carry scaling variants via a shared `shardBaseDmg(artifact, oppK)` helper (game.js) instead of a flat `getTagVal` read — `shard_burn_scale` (THE BOOK, Tea) adds +1 per currently-burning enemy creature; `shard_fear_scale` (SHARD, Jeet) adds +1 per currently-Feared enemy creature. The old "+1 dmg if the specific target is Feared" bonus on SHARD was removed the same day — it would have double-counted with `shard_fear_scale` (which already counts that same target if it's Feared), and THE BOOK never had an equivalent, so removing it keeps both artifacts on the exact same formula shape.|
|`bolt:N`   |N damage to any enemy creature (+1 if Feared) — creature-borne Shard clone, magic damage (`dmgCard(...,true)`, bypasses Armor, blocked by Ward). Has its own Squad bonus (`param:'bolt'`, gtype:umb, count 3 → +2 dmg instead of base 1 — see `SQUAD_DEFS`). Flow: `doUmbBolt()` selects the source card and enters `boltTarget` phase, `doBoltTarget()` resolves on click. Live on several Umbasir (`umb`) travelers, e.g. TRAVELER #583/#2/#52/#6 (Tea), #550 (Jeet, also `taunt_break`).|

-----

## Ability System

### getAbilities(card) → [{timing, effect, val, …}]

Parses tags and returns ability objects. Each has `timing`, `effect`, `val`.

### Timings

|Timing            |When it fires                                               |
|------------------|------------------------------------------------------------|
|`passive`         |Constant (provoke, pierce, invisible, vanguard, aura, gtype)|
|`_manual`         |Handled directly in game.js, not via triggerAbilities       |
|`instant`         |On play (spells)                                            |
|`on_enter`        |When played to field                                        |
|`on_turn`         |Start of owner’s turn                                       |
|`on_attack`       |On each attack                                              |
|`on_kill`         |When this card kills an enemy                               |
|`on_any_death`    |When any creature dies                                      |
|`on_play_creature`|When you play any creature                                  |
|`active`          |Manual player activation                                    |

### triggerAbilities(card, timing, ctx)

Called from game.js. Filters abilities by timing and executes effects.
`ctx` = `{target}` for attacks/heals.

Key call sites:

- `triggerAbilities(card, 'instant')` — spell played
- `triggerAbilities(card, 'on_turn')` — in endTurn for worlds/artifacts/field cards
- `triggerAbilities(card, 'on_enter')` — creature enters (Faeron, Maltor AOE)
- `triggerAbilities(card, 'on_attack', {target})` — after attack
- `triggerAbilities(card, 'on_play_creature')` — after creature played (Faeron)

-----

## Aura System

### applyAuras(faction)

Called after any field change. Handles both `aura:atk` and `aura:maxhp`.
Sources include field creatures AND world (if world has aura tag).

- `aura:atk` — resets all `atkBonus` to 0, then each source adds its val to all others
- `aura:maxhp` — resets to `baseMaxHp + squadMaxHpBonus`, then each source adds val to all others
- `world_maxhp` — applied separately, buffs ALL including aura sources themselves

### baseMaxHp

Stored on card to track original maxHP before any aura bonuses.
Used by applyAuras to recalculate correctly each turn.

-----

## Squad System

### SQUAD_DEFS (in game.js)

```js
// Szarg's squad bonus was Pierce (param) before 2026-07-10 — shelved by author request
// (not deleted from the game's vocabulary — the 'param'/pierce branch in
// checkSquadBonuses() still knows how to handle it if it ever comes back).
const SQUAD_DEFS = [
  {gtype:'drg', count:3, effect:'maxhp', val:1},
  {gtype:'mch', count:3, effect:'armor', val:1},
  {gtype:'orb', count:3, effect:'param', param:'heal',   val:2},
  {gtype:'umb', count:3, effect:'param', param:'aoe',    val:2},
  {gtype:'szg', count:3, effect:'atk',   val:1},
  {gtype:'xui', count:3, effect:'param', param:'regen',  val:2},
];
```

Note the swap (2026-07-10, author call): Merchird used to give ATK, Szarg used to give Pierce
— now Merchird gives Armor and Szarg gives ATK. `count:3` for all six (not 2 — see backlog
below, this had regressed to 2 in a past session and was restored).

### checkSquadBonuses(faction)

Called after every field change (doCreature, killCard, reviveCard, endTurn).
Must be called AFTER applyAuras to avoid maxHp conflicts. **Must ALSO be immediately followed
by `recalcArmor(faction)`** at every one of its own call sites (search for
`checkSquadBonuses(` — `recalcArmor(` follows every single one) — squad-armor
(`squadArmorBonus`) is only a flag here, same as `squadAtkBonus`; the actual armor math lives
entirely in `recalcArmor()`, see below.

Effects:

- `maxhp` — adds `squadMaxHpBonus` to card, mutates `maxHp`/`hp` directly (with the same
  "was-at-cap → grows with it" headroom rule as aura:maxhp — see `applyAuras()`)
- `atk` — adds `squadAtkBonus` to card (flag only — actual ATK total is computed on the fly
  wherever it's displayed/used: `atk+atkBonus+rageBonus+squadAtkBonus+tempAtkBonus`)
- `armor` — adds `squadArmorBonus` to card (flag only, same pattern as `atk` — actual math in
  `recalcArmor()`)
- `param` — sets `card.squadParam = {param: val}` (read by heal/aoe/regen/pierce logic)

### recalcArmor(faction) — Armor stacking (own tag + squad + world + aura-from-ally)

Added 2026-07-10, mirrors `applyAuras()`'s maxHp stacking model but is meaningfully simpler:
armor's "own" contribution is always freely re-derivable from the card's own `armor:N` tag (a
fixed DEFS value that never mutates at runtime) — unlike maxHp, whose own value ISN'T
tag-derived and needs a stored `baseMaxHp` snapshot to reconstruct. So `recalcArmor()` just
recomputes each card's full total fresh on every pass:

```
newMax = ownArmorTag + squadArmorBonus + worldArmorVal + auraFromAllies
```

...and diffs against the card's stored `armorMax` from last pass to decide what happens to
current `armor`:

- **First time ever seen** (`armorMax===undefined` — just entered/revived/raised): starts at
  full, `armor=armorMax=newMax`.
- **Max grew, card was AT cap**: current grows by the same delta too (2/2 → 3/3).
- **Max grew, card was BELOW cap** (already took a hit): current stays the same NUMBER — the
  new headroom is only usable after the next refill, at the start of the owner's own turn
  (1/2 → 1/3, not 2/3). Same rule the author specified for this exact scenario.
- **Max shrank** (aura source died, squad broke, world changed): current is clamped down to
  fit (`Math.min`).

Three sources, all stacking automatically through the same formula:
- **Own tag** — `armor:N` directly on a creature (e.g. NABUNAGI/ABYSSWALKER, `armor:2`).
- **Aura from an ally on the field** — `aura:armor:N` tag on a creature (e.g. ABYSSWALKER also
  carries `aura:armor:1` as a 2026-07-10 test — see below). Same self-exclusion rule as
  `aura:atk`/`aura:maxhp`: a source never buffs itself, only OTHER creatures on the same field.
- **World** — `world_armor:N` tag on a World card (separate tag name from `aura:armor`,
  mirroring `world_maxhp` vs `aura:maxhp` — a World card isn't a creature, so there's no
  self-exclusion question, and it's simpler to keep the two tag families visually distinct in
  DEFS). **Not yet used by any World card** — pure infrastructure, ready for whenever one is
  added; `doWorld()` already wires the `_worldArmorLog` flag and `recalcArmor()` call needed.

Refill (`endTurn()`, start of the OWNER's own turn) now checks `card.armorMax>0` instead of
`hasTag(card,'armor')` — a creature can have armor from squad/aura/world alone, with no
`armor:N` tag of its own, and still needs to refill to its (externally-granted) cap.

Render (`.card-armor-box`/`.card-small-armor-box`, see below) shows/hides based on the same
`card.armorMax>0` check, not `hasTag(card,'armor')` — so a Merchird-squad member or an
ABYSSWALKER-aura target that has NO armor tag of its own still gets the box once it's actually
carrying armor from an external source.

-----

## Targeted Spell System

Spells tagged `spell_dmg_target`/`spell_buff_temp`/`spell_untap`/`spell_dispel`/
`spell_bounce_target`/`spell_provoke_break_target`/`spell_dmg_trample_target` don’t resolve
instantly like other spells — `doPlay()` (game.js) intercepts them BEFORE calling `doSpell()`,
deducts cost, removes the card from hand, stores it in `G.pendingSpell`, and sets `G.phase` to
one of `spellDmgTarget` / `spellBuffTarget` / `spellUntapTarget` / `spellDispelTarget` /
`spellBounceTarget` / `spellProvokeBreakTarget` / `spellDmgTrampleTarget`. The next click is
routed by `onClick()` to the matching resolver (`doSpellDmgTarget()`, `doSpellBuffTarget()`,
`doSpellUntapTarget()`, `doSpellDispelTarget()`, `doSpellBounceTarget()`,
`doSpellProvokeBreakTarget()`, `doSpellDmgTrampleTarget()` — all in game.js, same pattern as
`doShardTarget()`). Clicking anything invalid calls `cancelPendingSpell()`, which **refunds**
the cost and returns the card to hand (unlike Shard/Altar, which act on cards already on the
field — a spell’s cost was already paid before the pause, so cancelling shouldn’t just waste
it) — **except** `spellUntapTarget` and `spellProvokeBreakTarget`, where a click that fails the
phase's precondition (target not actually sleeping/exhausted; target doesn't actually have
unbroken Provoke) is silently ignored instead of cancelling — there's no sane "any other
target" fallback for either, so a stray tap shouldn't burn the spell.

Visual targeting highlight lives in `mkSmallEl()` (render.js) — enemy-targeting phases
(`spellDmgTarget`/`spellDispelTarget`/`spellBounceTarget`(enemy side)/`spellProvokeBreakTarget`/
`spellDmgTrampleTarget`) get the red `.targetable`/`.aim-target` classes (same as Shard),
ally-targeting (`spellBuffTarget`/`spellUntapTarget`) get the green `.healable`/`.aim-heal`
classes. The `#targetPromptOverlay` ("CHOOSE TARGET" banner) show-condition in `render.js`
lists every phase above by name — a new targeted-spell phase that forgets to add itself there
gets no banner (silent UX gap, not a crash — see the `spell_bounce_target`/`healTarget` bug
fixed 2026-07-15 for exactly this failure mode).

`aiResolvePendingSpellTarget()` (ai.js) auto-resolves these for the AI right after it plays one —
without this the AI would just hang waiting for a click that never comes. `aiSpellHasValidTarget()`
also keeps the AI from picking a targeted spell with literally nothing to target in the first place.

**tempAtkBonus**: the ARCHIVE combat-trick buff lives in its own field, separate from `atkBonus`
(which is aura-driven and gets unconditionally reset to 0 every time `applyAuras()` runs — i.e. on
every card play). Reusing `atkBonus` for the spell buff was an actual shipped bug for one round —
it made the buff vanish the moment any other card was played, not at end of turn as intended.
`tempAtkBonus` is cleared explicitly in `endTurn()`’s per-turn cleanup instead.

-----

## AI Module (`js/ai.js`) — VS AI opponent

A simple rule-based bot that only reads `G` and calls the SAME functions a human
click would (`doPlay`/`doAttack`/`tryAttackBase`/`doSacrifice_target`/etc.) — it can’t
break any rule a hotseat human couldn’t also break. Runs only when
`G.mode==='vsai' && G.turn===G.aiFaction` (`runAiTurn()`).

### `AI_VERSION` vs `GAME_VERSION` — keeping the AI’s card knowledge in sync

`AI_VERSION` (top of ai.js) is a separate constant from `GAME_VERSION` (js/data.js), pinned
to whichever game version ai.js was last audited against. **Bump `AI_VERSION` to match
`GAME_VERSION` only after actually re-checking ai.js against whatever changed** — new cards,
new tags/mechanics, a new type of Active ability, a rebalance that changes what a “good” play
looks like. If you bump `GAME_VERSION` (new card, mechanic, or balance change) and DON’T touch
`AI_VERSION`, that’s a real signal the AI might now be blind to something — it’ll:

- log a `console.warn` on the very first AI turn of any VS AI game, and
- print one line to the in-game log (`⚠ AI logic last verified for v...`) at game start,

both from `_warnIfAiVersionStale()`, called once from `aiAutoMulligan()`. This is
non-blocking by design (nothing stops the AI from playing) — it’s purely so a stale-AI
situation is visible during testing instead of discovered by “huh, the AI didn’t know what
to do with the new card.”

As of `AI_VERSION`/`GAME_VERSION` `"1.0"`, the AI can legally play every card in the game
(every creature, every spell, world, and artifact — `aiPickBestCard()`/`aiScoreCard()` handle
all four types generically, not a hardcoded per-card list) and knows how to trigger every
**Active** ability that exists in the current card pool:

|Active ability        |Cards                      |AI function                                                                       |
|----------------------|---------------------------|----------------------------------------------------------------------------------|
|AOE damage            |Umbasir archetype creatures|`aiTryUseAoe()`                                                                   |
|Heal                  |Orb archetype creatures    |`aiActWithCreature()` (heals a wounded ally instead of attacking, when one exists)|
|Shard (direct dmg)    |SHARD artifact             |`aiTryUseShard()`                                                                 |
|Sacrifice (+1 essence)|ALTAR artifact             |`aiTryUseSacrifice()`                                                             |

Targeted spells (`spell_dmg_target`/`spell_buff_temp`/`spell_untap`/`spell_dispel`/
`spell_bounce_target`/`spell_provoke_break_target`/`spell_dmg_trample_target` — see
“Targeted Spell System” above) are auto-resolved by `aiResolvePendingSpellTarget()`.
Non-targeted instant spells that still need more than the flat generic score — `lose`
(discard), `spell_aoe_count` (Board Purge), `spell_fear_all` (Mass Sap) — get their own
`aiScoreCard()` branches too (added 2026-07-17) even though they don't pause for a click;
see “Card evaluation” below.
Everything else that reads like a “mechanic” (provoke/bushido/pierce/fear/invisible/rage/
regen/burn/squad bonuses/auras/on-play/on-death/on-attack triggers) is enforced by the core
game functions themselves (`doAttack`, `applyAuras`, `checkSquadBonuses`, `triggerAbilities`,
…) regardless of whether AI or a human triggered them — there’s nothing extra for the AI to
“know” there, only for genuinely player-facing CHOICES (which of several legal targets/actions
to take), which is what the table above and `aiActWithCreature()`’s targeting priority
(kill > hit base > forced target) cover.

**If a new card introduces a genuinely new Active ability or targeted-choice mechanic**, it
needs its own `aiTry...()` (mirroring `aiTryUseAoe`/`aiTryUseShard`/`aiTryUseSacrifice`) wired
into `aiPlayCardsStep()`, or its own case in `aiResolvePendingSpellTarget()`/
`aiSpellHasValidTarget()` if it’s a targeted spell — then bump `AI_VERSION`. A new PASSIVE
mechanic (no choice involved — an aura, an on-trigger effect) generally needs nothing here.

`armor:N` and `untamed` (added 2026-07-10, now live on NABUNAGI/ABYSSWALKER and
FAERON/TUBORG respectively — see Tag System + Version 1.01 roadmap) are both this last
category: pure passive damage-math/timing modifiers enforced by `dmgCard()`/`endTurn()`
themselves, no player-facing choice for the AI to make. No `AI_VERSION` bump needed per the
rule above. **Update 2026-07-16**: `aiScoreCard()`'s `tagBonus` weights now DO cover both
(and 3 more that had the same gap — `vampiric`/`necrophage`/`taunt_break`/`shield`/`draw`,
found via a full audit of every tag the engine supports against what `AI_WEIGHTS.tagBonus`
actually scores) — see `AI_VERSION` history and "Итог сессии 2026-07-16".

### Card evaluation (`aiScoreCard()`) and `AI_WEIGHTS`

This is NOT machine learning — there’s no training data, no self-play, no gradient descent.
It’s a hand-written scoring formula, same as any other game code; “improving the AI” means
editing these numbers/conditions and checking the result against a `battle_log_*.json`
(same workflow as AI BALANCE NOTES.md already uses for creature/spell balance). Every tunable
number the formula uses lives in one place, `AI_WEIGHTS` (top of ai.js) — tag bonuses, squad
bonuses, race thresholds, spell-value multipliers — so most tuning passes are “change a number
in `AI_WEIGHTS`, replay, compare” rather than editing the scoring logic itself.

`aiScoreCard(card, me)` scores a hand card using, beyond its raw stats:

- **Squad synergy** (`aiGtypeCount()`) — a creature that would complete an archetype’s
  3-of-a-kind Squad threshold (see `SQUAD_DEFS`, “Squad System” above) scores a large bonus
  (`squadCompleteBonus`); the 1st/2nd copy toward that threshold gets a smaller one
  (`squadBuildBonus`) — the AI now actively tries to finish squads instead of spreading
  itself thin across archetypes by pure chance.
- **Race state** (`aiRaceState()`) — `'ahead'`/`'even'`/`'behind'`, from HP difference AND
  board-power difference (`effAtk` sum) together, not HP alone. When `'behind'`, stabilizing
  tags (provoke/heal/regen) get extra weight (`stabilizeTagBonus`); when `'ahead'`,
  closing-out tags (fear/pierce/burn/rage) do (`aggroTagBonus`) — this is the “risk vs play it
  safe” lever: same card, different value depending on how the game currently looks.
- **Removal spells** (`spell_dmg_target`) now score based on the actual best target they can
  kill (`removalKillBonus` + a cut of the killed creature’s own `effAtk` — killing the
  opponent’s best attacker is worth more than killing a vanilla 1/1), not a flat “spells are
  fine” score. If nothing dies, it’s scored as chip damage only, worth a bit more when already
  `'behind'`.
- **Buff spells** (`spell_buff_temp`) get a rough (provoke/bushido-blind — it’s a scoring
  estimate, the actual attack still resolves through the normal forced-target rules either
  way) lethal check: if the buffed creature’s `effAtk` would meet-or-beat the opponent’s
  current HP, that’s a large bonus (`buffLethalBonus`).
- **Revive spells** (`revive`) check the actual graveyard instead of assuming “a spell is
  always fine to play” — an empty graveyard scores negative (`reviveEmptyGraveyardScore`,
  since it’d just log “graveyard empty” and waste the card), a strong body back scores well.
- **2026-07-17 additions** — five more spell shapes got their own scoring instead of the flat
  generic fallback, all following the same "check the thing that makes it a whiff, score it
  like `reviveEmptyGraveyardScore` if so, otherwise scale by the relevant board/hand number"
  shape: `lose` (discard, scales with opponent hand size), `spell_aoe_count` (Board Purge,
  scales with live enemy count), `spell_fear_all` (Mass Sap, scales with live enemy count +
  a `'behind'` bonus), `spell_provoke_break_target` (scales with the total `effAtk` of own
  creatures currently stuck on the Provoke target), `spell_dmg_trample_target` (same shape as
  `spell_dmg_target`'s removal scoring, plus a small bonus for guaranteed overflow).

**Known boundary, by design for now**: this is still a single-turn greedy evaluator — no
lookahead, no resource-holding across turns (the AI always spends everything it can afford
this turn rather than saving essence to combo two cards next turn), no full minimax on combat
math (removal/buff scoring above are targeted heuristics for those two spell shapes
specifically, not a general “simulate the rest of combat” solver). Worth revisiting if
playtesting shows the AI making a specific class of mistake these heuristics don’t cover —
same iterative process as everything else here: `battle_log_*.json` → identify the pattern →
add/adjust a term in `aiScoreCard()`/`AI_WEIGHTS`, not a rewrite.

-----

## Game State (G)

```js
G = {
  turn: 'tea' | 'jeet',
  turnNum: Number,
  phase: 'action' | 'selectTarget' | 'healTarget' | 'burn' |
          'sacrificeTarget' | 'shardTarget' |
          'spellDmgTarget' | 'spellBuffTarget' | 'spellUntapTarget' | 'spellDispelTarget',
  sel: cardId | null,
  pendingSpell: Card | null,   // held between doPlay() pausing and the target click resolving it
  previewCard: cardId | null,
  logs: [{msg, cls} | {msg:'', cls:'snapshot', hidden:true, snapshot:{...}}],
  mode: 'hotseat' | 'vsai',
  humanFaction: 'tea' | 'jeet' | null,   // vsai only
  aiFaction: 'tea' | 'jeet' | null,      // vsai only
  deckConfig: 'full' | 'compact' | 'mini',
  gameOver: Boolean,   // set once by checkWin(); guards against the win modal / further attacks re-firing
  tea: PlayerState,
  jeet: PlayerState,
}

PlayerState = {
  hp, maxHp,
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
  _auraAtkLog: cardId | null,   // flag to log ATK aura on enter
  _auraMaxLog: cardId | null,   // flag to log maxHP aura on enter
}
```

### Card Instance Fields

Beyond DEFS values, each card instance has:

```js
{
  id, key, name, cost, hp, maxHp, atk, art, f, tags, ab,
  spell, world, artifact, unique,
  sleeping, exhausted, feared, burning,
  atkBonus,        // from aura:atk sources — reset to 0 on EVERY applyAuras() call, don't reuse for anything else
  tempAtkBonus,    // from spell_buff_temp (combat tricks) — separate from atkBonus on purpose, cleared at end of turn
  rageBonus,       // accumulated from rage tag
  maxHpBonus,      // legacy, kept for compatibility
  baseMaxHp,       // original maxHp before aura buffs
  worldMaxHpBonus, // bonus from world_maxhp
  worldMaxHpSet,   // flag to prevent re-applying each turn
  squadAtkBonus,   // from squad atk bonus
  squadMaxHpBonus, // from squad maxhp bonus
  squadParam,      // {heal:2} or {aoe:2} or {pierce:true} or {regen:2}
}
```

-----

## Game Phases

|Phase              |Description                                          |
|-------------------|-----------------------------------------------------|
|`action`           |Normal turn                                          |
|`selectTarget`     |Creature selected, waiting for attack target         |
|`healTarget`       |Orbiton selected, waiting for heal/attack target     |
|`burn`             |Waiting for hand card to burn                        |
|`sacrificeTarget`  |Altar activated, waiting for creature to sacrifice   |
|`shardTarget`      |Shard activated, waiting for enemy creature to damage|
|`spellDmgTarget`   |Targeted-damage spell played, waiting for enemy click|
|`spellBuffTarget`  |Combat-trick spell played, waiting for ally click    |
|`spellUntapTarget` |Untap spell played, waiting for ally click           |
|`spellDispelTarget`|Dispel spell played, waiting for enemy click         |

-----

## Graveyard Rules

- Creatures → `grave` (revivable)
- Spells → `void` after cast
- Replaced worlds → `void`
- Burned cards → `void`
- Cards in `void` have `voided: true` and are excluded from raise/revive

-----

## Traveler Structure (NFT)

1100 total travelers planned. Each is a unique card (`trvlr_001` through `trvlr_1100`).
All share base mechanics of their type but may have additional tags.

Example:

```js
trvlr_001: {name:"Traveler #001", cost:1, hp:1, atk:2, tags:["gtype:szg"], ...},
trvlr_042: {name:"Traveler #042", cost:2, hp:1, atk:2, tags:["gtype:szg","burn"], ...},
```

Deck composition per starter: 30 travelers + 5 legendaries + 8 spells + 2 worlds + 2 artifacts + extras.

### Lore & Universe context — Home Travelers (Solana NFT)

The game is directly tied to **Home Travelers**, a generative NFT collection on the Solana
blockchain. This connection is MECHANICAL, not just thematic — traits on the NFTs map to
game tags:

- **Gates** (the body) — maps to the archetype/gtype grouping. A future task: show each
  traveler’s Gate visually on its card (waiting on a design decision, see Art backlog).
  **Author calls travelers by their Gate name in conversation** (e.g. “Orbiton”, “Merchird”) —
  Claude should recognize these. Six gates, `gtype:xxx` tag → mechanical identity:
  
  |Gate name|`gtype:` tag|Mechanical tags (typical)       |Ability                             |
  |---------|------------|--------------------------------|------------------------------------|
  |Szarg    |`szg`       |                                |Squad: +1 maxHP.                    |
  |Orbiton  |`orb`       |`heal:1`                        |Squad: Heal 2.                      |
  |Dreegan  |`drg`       |`provoke`                       |Squad: +1 Armor.                    |
  |Umbasir  |`umb`       |`bolt:1`                        |Squad: Bolt 2 dmg.                  |
  |Merchird |`mch`       |`pierce`                        |Squad: +1 ATK.                      |
  |Xuiqtr   |`xui`       |`provoke`                       |Squad: +1 ATK.                      |
  
  Each traveler carries its Gate’s core mechanical tag + `gtype:xxx`, plus sometimes one extra
  flavor tag (regen/fear/burn/vanguard/rage) justified by its NFT Mood trait (see below). The
  Squad line is each Gate’s 3-same-Gate-on-field bonus (see Squad System); Umbasir/Orbiton
  additionally get an Active (button) ability regardless of squad count.
- **Mood** (the eye/face area) — justifies extra ability tags. Example: a skull Mood is the
  lore reason a traveler carries the `fear` tag. When adding/rebalancing traveler cards,
  check the actual NFT’s traits — a tag should have a visible trait justifying it.
- **World** (the background) — connects to the World card type / world mechanics.
- **1/1s** — множество уникальных 1/1 из коллекции ещё НЕ использовано в игре. Это резерв
  для будущих карт и, возможно, новых типов существ.

### Essence pricing shop — актуальная экономика (переписано целиком 2026-07-16 —
предыдущая версия таблицы, где 1 HP = 1 ATK = 0.33 везде одинаково, полностью заменена
капитальным ребалансом этой сессии, см. "Итог сессии 2026-07-16" ниже за всю историю
решений). Всё, что тут написано, действует ПРЯМО СЕЙЧАС, проверено скриптом-аудитом
против живого `data.js` (0 нарушений доминирования — см. журнал).

**Главный сдвиг от старой системы: HP и ATK больше НЕ стоят одинаково.** Раньше оба стата
шли по 0.33/очко везде. Теперь у каждых Врат — свой фиксированный **skew** (пропорция
HP:ATK внутри общего бюджета статов), и вдобавок, начиная с cost2, **ATK стоит вдвое
дороже HP** (на cost1 — старая цена 1:1, сознательно не тронуто, чтобы не убить самые
дешёвые тела). Итог: дешёвые карты бьют слабее, чем раньше, но ощутимо крепче держат
удар — и наоборот, дорогие "танковые" Врата (Dreegan) стали радикально более выраженными
стенами, а "агрессивные" (Szarg) — правда хрупкими, но при этом не абсурдно опасными
(см. плавный skew-slide у Szarg ниже).

**Пайплайн расчёта тела рядовой карты (Врата), по шагам — именно в этом порядке:**
1. Взять базовую линию Gate на нужном cost из таблицы ниже (0 доп.тегов).
2. Добавить бонус КАЖДОГО доп.тега (Mood/World-трейт) — то же правило, что и раньше:
   дешёвый тег (0.33) → **+1 HP и +1 ATK**; дорогой тег (0.66) → **+1 к профильному
   стату** (HP у Dreegan/Umbasir/Orbiton, ATK у Szarg/Merchird/Xuiqtr). Несколько доп.тегов
   — бонусы суммируются независимо, каждый добавляет свой +1 к cost.
3. **Только для cost 2+**: досчитанный на шаге 2 ATK урезается — `new_atk = max(1,
   floor(atk/2))`. Если это НЕ дало реального снижения (ATK и так уже был 1) — вместо
   этого забирается **1 HP** как "плата" за то, что ATK остался на месте. Cost1 карты этот
   шаг вообще пропускают — у них старая цена 1:1 в силе.

Это НЕ приблизительное правило, а проверено построчно на живых картах (например
TRAVELER #1 — Dreegan cost3 + `enter_heal` → 6/2 после шага 2 → 7/1 после шага 3,
совпадает с data.js один в один).

**Базовая линия по Вратам (шаг 1), 0 доп.тегов, cost1→6:**

| Gate | Тег | Профиль | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|
| **Szarg** | — (чистые статы) | ATK, но со сползающим skew (см. ниже) | 1/2 | 1/1 | 2/2 | 3/3 | 4/3 | 5/4 |
| **Merchird** | `pierce` | ATK (45:55) | — | 2/1 | 3/2 | 4/2 | 5/3 | 6/3 |
| **Xuiqtr** | `provoke` | ATK (60:40) | — | 2/1 | 4/1 | 5/2 | 7/2 | 8/2 |
| **Dreegan** | `provoke` | HP (85:15) | — | 2/1 | 5/1 | 7/1 | 9/1 | 11/1 |
| **Umbasir** | `bolt:1` | HP (65:35), урезанный бюджет | 1/1 | 1/1 | 3/1 | 5/1 | 6/1 | 7/2 |
| **Orbiton** | `heal:2` | HP (65:35), урезанный бюджет | 1/1 | 2/1 | 4/1 | 5/1 | 6/2 | 8/2 |

Общий бюджет статов (HP+ATK ДО применения шага 3) у Szarg/Merchird/Xuiqtr/Dreegan —
**один и тот же на любой цене** (3/4/7/9/11/13 на cost1-6) — они отличаются ТОЛЬКО
пропорцией разреза, не суммой: Dreegan вкладывает почти всё в HP (чистая стена), Szarg —
почти всё в ATK (стекло с бритвой), Merchird/Xuiqtr — промежуточные варианты (Merchird
чуть танкее по ощущению за счёт частого `armor:1` доп.тега, Xuiqtr — "боец-танк",
provoke + заметный ATK). У Szarg skew не фиксирован, а **плавно сползает** с ~33:67
(cost1-2) к ~38:62 (cost6) — на верхних costах его ATK был совсем безумным при жёстких
25:75, автор попросил смягчить. Umbasir/Orbiton намеренно на урезанном бюджете (2/3/5/7/9/11
и 2/4/6/8/10/12 соответственно, ДО шага 3) — их ценность в способности (болт/хил), не в
теле; Orbiton чуть живее Umbasir за счёт того, что `heal` дешевле `bolt`.

**Тег-прайс (шаг 2), без изменений от предыдущей ревизии:**

| Что | Цена | Эффект доп.тега |
|---|---|---|
| `untamed`, `regen`, `enter_heal` | 0.33 (дешёвый) | +1 HP и +1 ATK |
| `armor:N`, `burn`, `fear`, `draw_attack`, `ward`, `incarnation`, `rage`, `invisible`,
  `vanguard`, `taunt_break`, `shield`, `vampiric`, `necrophage`, `enter_draw` | 0.66 (дорогой) | +1 к профильному стату |
| `provoke`, `pierce`, `bolt:N`, `heal:N` | — (эксклюзив самих Врат, не доп.тег) | входит в базовую линию |

**Mood/World-трейты — та же таблица тегов, что и раньше** (Rarity/Trait/тег), без изменений
цены — см. предыдущую версию этого раздела в истории коммитов, если нужен полный список
редкостей. Ничего не переименовывалось.

### Orbiton/Umbasir — правило симметрии с Merchird (закреплено 2026-07-18)

**Проблема, найденная автором:** старая "урезанный бюджет"-таблица baseline выше (Umbasir
1/1·1/1·3/1·5/1·6/1·7/2, Orbiton 1/1·2/1·4/1·5/1·6/2·8/2 на cost1-6) в теории давала честный
скью, но НЕ была строго привязана к живым числам Merchird/Xuiqtr на тех же costах — из-за
этого за несколько сессий тестовых довесок тегов (armor/vanguard/untamed/regen/enter_heal/
enter_draw/fear/taunt_break, все навешаны 2026-07-10..17 "по одному представителю на тест",
см. записи выше) конкретные карты уплыли далеко от любого справочного узла: TRAVELER #398
(Orbiton, cost3) дошёл до hp7 с armor:1+vanguard+untamed, TRAVELER #550 (Umbasir, cost4) —
до hp7 при cost4, оба заметно жирнее любого Merchird/Xuiqtr того же costа. Аудит (см. таблицу
ratio ниже) подтвердил: у Orbiton было HP/cost=1.64, у Umbasir — 1.47, у Merchird (эталон
"крепкого, но не саппорт-архетипа") — всего 1.11, у Xuiqtr — 1.36. При этом ATK/cost у
Umbasir и так самый низкий из четырёх (0.47) — проблема была чисто в HP, не в ATK.

**Новое правило (заменяет старую baseline-таблицу выше ДЛЯ ЭТИХ ДВУХ АРХЕТИПОВ конкретно —
Merchird/Xuiqtr/Dreegan/Szarg таблица и её skew-логика продолжают работать как описано):**

1. **ATK всегда фиксирован на 1**, на любом cost, без исключений. Никогда не растёт — это
   единственный жёсткий пол/потолок одновременно. (Раньше Umbasir #583 имел atk:2 на cost3 —
   единственное нарушение, поймано и исправлено этой сессией.)
2. **Базовый HP = cost** для Orbiton (т.е. тело "как у Merchird" по чистому HP, тот же
   паттерн — живые Merchird-числа cost2-6 это буквально 2/3/4/5/6, HP=cost один в один).
   **Базовый HP = cost − 1** для Umbasir (специально на 1 ниже Orbiton на любом одинаковом
   costе и одинаковом числе тегов — "Умбасир дохлее всех"). Cost1 — исключение по общему
   правилу дешёвых тел, всегда 1/1 у обоих архетипов, минус-1 не применяется (нечего вычитать).
3. **Каждый ДОПОЛНИТЕЛЬНЫЙ тег сверх сигнатурного (`heal:2` у Orbiton, `bolt:1` у Umbasir)
   даёт +1 HP** — ровно один, независимо от того, дешёвый тег (0.33: untamed/regen/
   enter_heal) или дорогой (0.66: armor/fear/burn/vanguard/taunt_break/enter_draw/etc).
   Разницы в цене тега здесь больше нет, потому что ATK у этих архетипов зафиксирован (шаг 1)
   и не может забрать половину бонуса, как у core-4 Врат — весь бонус тега уходит в HP.
   Несколько тегов — бонусы складываются (пример: #398 — vanguard+untamed+armor:1 = +3 HP).
4. **Armor разрешена Orbiton'у** (как у Merchird — 2 карты из 8 несут `armor:1`, то же
   соотношение, что и у Merchird 4-из-8, "танковость" внутри бюджета архетипа это ок).
   **Armor категорически НЕ даётся Umbasir'у никогда** — 0 из 8 сейчас и впредь, это и есть
   часть "Умбасир — самый хрупкий" наравне с правилом cost−1.

**Как считать нового Orbiton/Umbasir (шпаргалка для будущих карт):**
```
Orbiton:  HP = (cost===1 ? 1 : cost) + (кол-во доп.тегов сверх heal:2)
          ATK = 1 всегда
          armor:N — можно вешать как доп.тег (даёт +1 HP как любой другой тег,
                    N — отдельное авторское решение, не считается формулой)
Umbasir:  HP = (cost===1 ? 1 : cost-1) + (кол-во доп.тегов сверх bolt:1)
          ATK = 1 всегда
          armor — НИКОГДА не вешать на Umbasir
```
Пример: новый Orbiton cost4 с тегом `fear` → HP=4+1=5, ATK=1. Новый Umbasir cost5 с тегами
`regen`+`vanguard` → HP=(5-1)+2=6, ATK=1.

**Правки этой сессии (2026-07-18), по этому правилу:**
- Orbiton #398 (cost3, vanguard+untamed+armor:1): hp 7→**6** (3+3=6, было накручено до 7).
- Orbiton #454 (cost3, regen+armor:1): hp 6→**5** (3+2=5).
- Umbasir #583 (cost3, regen+enter_heal:2): hp 5→**4** (2+2=4), atk 2→**1** (жёсткий пол).
- Umbasir #2 (cost2, untamed): hp 3→**2** (1+1=2).
- Umbasir #6 (cost3, enter_draw:1): hp 4→**3** (2+1=3).
- Umbasir #550 (cost4, fear+taunt_break): hp 7→**5** (3+2=5).
- Umbasir #20 (cost3, vanguard+untamed): hp 5→**4** (2+2=4).
Остальные 9 карт (Orbiton #10/#433/#1034/#170/#429/#523, Umbasir #52/#53/#54) уже совпадали
с формулой без изменений — аудит прогнан по всем 16 картам архетипов, не выборочно.

После правки: Orbiton HP/cost=1.5, Umbasir HP/cost=1.16 (было 1.64/1.47) — Umbasir теперь
почти вплотную к эталону Merchird (1.11), Orbiton чуть выше за счёт двух armor-карт, что
и требовалось ("наравне с Мехирдами по HP/броне, ниже по атаке").

**Trait-слоты без назначения (ждут решения, не относится к сегодняшнему ребалансу):**
Optical Dope · Розовые облака (кандидат: иммунитет к Fear — не закреплено, см. Итог сессии
2026-07-13).

**Механики "россыпью", ещё не привязанные к конкретному трейту** (тентативные цены,
не закреплены окончательно):
- `enter_aoe` (AOE при входе) — ~0.66
- Полный death-пакет: карта + урон базе врага + эссенция + хил (не реализовано) — ~0.33.
  Автор рассматривал и сознательно ОТЛОЖИЛ (2026-07-13) — комбинируется с уже существующими
  Hunger (мир, добор при смерти своего существа) + Reaper (легендарка, хилит базу при ЛЮБОЙ
  смерти). Третий "смерть → ценность" источник на РЯДОВОЙ карте, да ещё стекающийся с
  Алтарём (сакрифайс уже даёт +1 эссенция +1 карта) в одно действие — прямая дорога туда же.
  Если делать — резервировать под ОДНОГО конкретного 1/1 с урезанными статами-компенсацией,
  не под общий World-трейт.

**Уникальные 1/1 — свои цены + НОВОЕ правило "пола" (закреплено 2026-07-16):**

Тело Уника должно быть **≥ бюджету рядовой карты той же цены на шаге "до ATK-урезания"**
(т.е. до шага 3 — Уники сами по себе ATK-урезание НЕ проходят, "старая" полная цена статов
для них в силе). Пол = 3/4/7/9/11/13 на cost1-6 (тот же бюджет, что у core-4 Врат). Способность
Уника — **всегда сверху** этого пола, а не вместо части тела. Все 10 существующих Уников
уже подняты под этот пол этой сессией — см. таблицу состояний ниже.

Цены самих уникальных способностей — без изменений от предыдущей ревизии (Аура/Некромантия/
Бусидо/etc — всё также 2.0, AOE активка — 1.33 за 1 урона, Инкарнация — вдвое быстрее рядовой
при той же цене).

**Миры и Артефакты:** без изменений — тело 4.0 фикс (0/0 статов) + способность 2.0 сверху,
итог почти всегда cost 6.

**Спеллы:** без изменений в структуре цен, кроме одной точечной правки — **0-костовые
спеллы на "получить эссенцию" (`ess_add`) теперь дают 1 эссенцию, а не 2** (SCHEME/BLACK
MAGIC, правка 2026-07-16, по прямому запросу автора — держит темп игры более плавным).
Остальные позиции (1 карта добора = 1 эссенция, воскрешение на полном HP = 3 эссенции,
untap = 2, +1 ATK до конца боя = 1.5) не менялись.

**Текущее состояние всех Уникальных карт** (обновлено под пол 2026-07-16):

| Карта | Cost | HP/ATK | Теги |
|---|---|---|---|
| TEANTIST | 5 | 9/2 | draw:1 |
| ASLEX | 5 | 8/3 | aura:maxhp:1 |
| TUBORG | 5 | 7/4 | aura:atk:1, untamed, armor:1 |
| FAERON | 4 | 7/2 | burn, on_play_creature:1, untamed |
| NABUNAGI | 6 | 11/2 | bushido, armor:1, ward |
| REAPER | 5 | 8/3 | on_any_death_base:1 |
| RYVLEN | 4 | 5/4 | fear, draw_attack:1 |
| ABYSSWALKER | 5 | 9/2 | armor:1, aura:armor:1 |
| PHLEGMOR | 6 | 11/2 | raise:1, incarnation:2 |
| SEEKER | 4 | 6/3 | invisible, pierce |

**Миры/Артефакты (не менялись, все cost 6):** VALLEY (draw:1), DOMUS (world_maxhp:1),
THE BOOK (ess_add:1), FOUNTAIN (heal:1, AOE-хил всем союзникам — своя, отдельная от
Orbiton-хила механика, не путать), HUNGER (on_own_death:1), NORRIA (world_armor:1),
SHARD (shard:2), ALTAR (sacrifice).

**Проверка целостности (скрипт-аудит, воспроизводимо):** строгое сравнение возможно
ТОЛЬКО между картами одних Врат с одинаковым числом доп.тегов ОДНОЙ ценовой категории —
сравнивать карты с разным набором тегов напрямую по статам бессмысленно (тег — это
реальная способность, а не просто "минус к телу"). При такой строгой проверке по всем 50
рядовым — 0 пар, где одна карта строго хуже другой за ту же или меньшую цену. Разовая
находка и фикс этой сессией: TRAVELER #579 (cost 4→3, статы не менялись) — единственная
карта во всей игре, отклонявшаяся от формулы без видимой причины.

### P1 — сделано (журнал)

- [x] ~**Спящие карты**: вместо прозрачности — индикатор «z Z Z»~ — сделано 2026-07-06
  (см. Done list): brightness-затемнение вместо прозрачности + анимированный zZZ; уставшие
  затемняются сильнее. `.pcard` в персистентной зоне не трогали.
- [x] ~**Подсветка доступных карт в руке**~ — сделано 2026-07-06 (см. Done list): слабый
  золотой пульс, ~1/3 интенсивности `.previewed`.
- [x] ~**Untap (OBLIVION) фидбек**~ — сделано 2026-07-07 вместе с Targeted-spell UX ниже (тот
  же оверлей закрывает оба пункта: OBLIVION — это `spellUntapTarget`, один из 4 фаз, которые
  теперь показывают оверлей).
- [x] ~**Targeted-spell UX**~ — сделано 2026-07-07: `#targetPromptOverlay` (index.html,
  внутри `.player-hand-zone`) перекрывает всю зону руки на время `spellDmgTarget`/
  `spellBuffTarget`/`spellDispelTarget`/`spellUntapTarget` (см. `render()` в render.js) —
  надпись “CHOOSE TARGET” + “CLICK HERE TO CANCEL” на пульсирующем красном фоне. Клик по
  оверлею вызывает `cancelPendingSpell()` — тот же цикл отмены с рефандом, что и раньше
  срабатывал при клике по карте в руке; поведение не сломано, просто явное. `stopPropagation`
  не даёт клику улететь в `handleGameClick()`. ДОРАБОТАНО в этой же сессии по фидбеку: размер
  шрифта был завязан на vh (высоту `.player-hand-zone`) — на узких телефонах не влезало в
  строку; переведено на vw (ширина экрана, у `.game` нет max-width) с px-потолком. Заодно
  приглушены фон (был насыщенно-красный) и мигание (было `steps(1,end)` — жёсткий флик,
  заменено на плавную ease-in-out пульсацию 1↔0.55) — по фидбеку выглядело слишком агрессивно.
  ЕЩЁ РАЗ доработано в этой же сессии (второй заход): размер шрифта переведён с vh на vw (был
  всё ещё “слишком широким” на телефоне после первого фикса), фон сделан в разы бледнее,
  мигание смягчено (плавная пульсация вместо резкого флика). Автор ещё думает над рамкой/
  подложкой под текст — см. “На подумать” ниже.
- [x] ~**OBLIVION можно было впустую нажать на не спящую/уставшую карту**~ — сделано
  2026-07-08 (исправлено повторно по уточнению автора — первая версия фикса трогала не то:
  зумленную карту трогать не нужно было, там и так поведение как у обычной маленькой карты,
  специально ничего не делали). Реальная проблема была в `onClick()` (game.js, фаза
  `spellUntapTarget`): клик по своей карте засчитывался целью независимо от того, спит/устала
  ли она — можно было случайно потратить заклинание на карту, которая и так уже может
  действовать. Добавлено условие `(card.sleeping||card.exhausted)` — клик по активной своей
  карте теперь просто отменяет применение (как клик по любой другой невалидной цели), как и
  остальные точечные заклинания. AI (`ai.js`) уже фильтровал кандидатов так же — трогать не
  пришлось.
- [x] ~**Фон подсказок бафов/дебафов на зумленной карте**~ — сделано 2026-07-08: `.card-status-row`
  (styles.css) приведён к тому же виду, что и обычный тултип по наведению (`.card-tooltip`) —
  `#0c0c18ee` фон, рамка `#9B937F`, тень `#CBBE9A66`, вместо отдельного более тёмного/золотого
  варианта.
- [x] ~**Фон/рамка под “CHOOSE TARGET”/“CLICK HERE TO CANCEL”**~ — сделано 2026-07-08: текст
  обёрнут в `.target-prompt-box` (index.html + styles.css) — тёмная полупрозрачная подложка +
  тонкая рамка в цвет текста, существующая пульсация фона/текста не тронута. Закрывает пункт
  из “На подумать” ниже.
- [x] ~**Подсказки (тултипы) периодически всплывали на телефоне**~ — сделано 2026-07-08:
  подсказки и раньше были задуманы desktop-only (завязаны на `mousemove`), но некоторые
  мобильные браузеры после тапа всё равно шлют синтетическое mousemove — из-за этого подсказка
  иногда мелькала и мешала визуалу (фидбек автора). Добавлен жёсткий флаг `IS_TOUCH_DEVICE`
  (`'ontouchstart' in window || navigator.maxTouchPoints>0`) в ui.js — обработчик `mousemove`
  теперь сразу выходит на тач-устройствах, плюс `touchstart` принудительно гасит подсказку,
  если она всё же успела показаться. На устройствах с реальной мышью поведение не изменилось.
- [x] ~**Анимация полёта карты из колоды в руку**~ — сделано 2026-07-08: `_flyCardFromDeck()`
  - `_deckPlaceholderRect()` (render.js) — при появлении новой карты в СВОЕЙ открытой руке
    (`rZone`, zone===‘hand’) от плейсхолдера колоды (`#deckPlaceholderT`/`#deckPlaceholderJ`)
    до места карты летит спрайт-рубашка (`runaha.png`, новый `.card-fly-sprite` в styles.css),
    тает в последние ~140мс полёта (300мс, `CARD_FLY_MS`). Настоящая карта на это время спрятана
    (`animation-delay`+`fill-mode:both` на уже существующем `.card-drawn`) и проявляется своим
    обычным fade ровно к моменту, когда спрайт исчезает — иллюзия единого “прилёта”. Несколько
    карт разом (начало партии/большой добор) — вылетают со сдвигом 90мс друг за другом, а не
    одновременно. Если плейсхолдер колоды сейчас не виден (`offsetParent===null`, напр. скрыт
    под модалкой муллигана/деколадера) — полёт просто пропускается, карта появляется как раньше,
    обычным fade без спрайта. ОБЛАСТЬ: только своя открытая рука; чужая скрытая рука
    (`rHiddenHand`, рубашки без данных) не анимирована — не диффит новые/старые элементы по id,
    добавление аккуратного отслеживания туда не входило в этот заход, при необходимости можно
    сделать отдельным пунктом.
- [x] ~**Подложка “CHOOSE TARGET” была полупрозрачной**~ — сделано 2026-07-08: `.target-prompt-box`
  (styles.css) — фон сделан полностью непрозрачным (`rgba(10,4,4,1)`), рамка/тень не тронуты.
- [x] ~**OBLIVION: клик по активной карте отменял заклинание**~ — сделано 2026-07-08, по
  уточнению автора: раньше клик по своей уже активной (не спящей/уставшей) карте отменял
  заклинание целиком (рефанд). Теперь такой клик просто ничего не делает — заклинание остаётся
  в ожидании валидной цели; отмена по-прежнему доступна через `#targetPromptOverlay` (клик
  “CLICK HERE TO CANCEL”) или клик по чужой карте/другой недопустимой цели.
- [x] ~**Всплывающие тексты-плейсхолдеры для ещё не покрытых эффектов**~ — сделано 2026-07-08,
  через существующий `queueFieldFx()` (тот же механизм, что уже дал SQUAD!/FEARED!/-SQUAD/
  CLEANED — см. Art backlog “Анимации”, автор потом заменит текст на гифки): OBLIVION успешно
  активировал карту → “AWAKENED!” (`fx-untap`); карта принесена в жертву Алтарю → “SACRIFICED!”
  (`fx-sacrifice`); урон от Shard-артефакта → “SHARD!” (`fx-shard`); точечный урон от
  заклинания (`spell_dmg_target`) → “HIT!” (`fx-spell-dmg`), рядом с уже существующей цифрой
  урона; точечный баф от заклинания (`spell_buff_temp`) → “BUFFED!” (`fx-spell-buff`), рядом с
  уже существующей цифрой `+ATK`. Все пять — новые CSS-классы в styles.css рядом с
  `fx-cleaned`/`fx-fear`.
- [x] ~**Хил → попап с кнопкой**~ — сделано 2026-07-08, доработано в этой же сессии по
  фидбеку (первая версия была неверной — хил всё ещё запускался сразу по клику на существо,
  просто с оверлеем поверх). Теперь хилер ведёт себя как Umbasir/Vardan (AOE): клик по
  существу просто выделяет его (`selectTarget`, как у любого другого атакующего — можно сразу
  бить врага/базу напрямую), и ТОЛЬКО ЕСЛИ есть кого хилить (своя не-spell/world/artifact карта
  с hp<maxHp), над ним всплывает попап-кнопка (`.fab-btn.heal`, тот же `.field-ability-popup`,
  что и у AOE-кнопки). Клик по НЕЙ — и только по ней — переводит в `healTarget` с уже готовым
  паттерном (подсветка целей + оверлей `#targetPromptOverlay` для отмены по зоне руки).
  Плейсхолдер картинки — `img/btn_heal.png` (файла пока нет, автор подключит свой позже, как
  и `btn_spell.png` для AOE).
  ДОБАВЛЕНО в этой же сессии по фидбегу: кнопка технически появлялась, но была НЕВИДИМА —
  `background-image` с несуществующим путём рендерится пустым местом, а не “битой картинкой”,
  и у `.fab-btn` больше не было своего фона/рамки. Добавлен видимый фолбэк на `.fab-btn.heal`
  (зелёная заливка + рамка + сердечко `::after`) — как только появится реальный
  `img/btn_heal.png`, он ляжет НАД этим фолбэком (два `background-image` через запятую,
  картинка первая), фолбэк можно будет убрать отдельным пунктом.
- [x] ~**Зеркалирование X/Y для остальных декоративных плейсхолдеров**~ — сделано 2026-07-08,
  переделано в этой же сессии по фидбеку (первая версия отражала каждый плейсхолдер НА СВОЁМ
  МЕСТЕ — только контент/ориентация, позиция на панели не менялась; автор указал, что нужно
  СВЕТ, а не просто зеркало на месте: объект из правого верхнего угла у нас должен оказаться в
  левом нижнем у оппонента, т.е. вся панель разворачивается на 180° вокруг центра — меняются
  местами И позиция, И ориентация одновременно). Исправлено:
  — pcard (Мир/Артефакт) + hp-placeholder + statbar-extra — обычные flex-элементы в потоке,
  их новая позиция теперь получается ПРОСТЫМ РАЗВОРОТОМ ПОРЯДКА всего ряда (`_mkStatsBarHtml`
  в render.js, `[...].reverse()`) — этого одного достаточно, чтобы автоматически расставить их
  по противоположным сторonам, как при повороте на 180°. pcard остаётся нечитаемым для
  зеркала контентом — не трогаем; hp-placeholder/statbar-extra дополнительно отражаются
  transform’ом в styles.css (позиция уже верная через reverse, отражается только содержимое).
  — HP-box/Essence-box ВНУТРИ `statbar-core` — reverse() всего ряда не заглядывает внутрь
  одного блока, поэтому их порядок (`hp-name-ess` ↔ `ess-name-hp`) по-прежнему флипается
  отдельным условием на `mirrored`, как и раньше.
  — `.statbar-edge-left/-right/-right-2` — `position:absolute`, порядок в разметке на их
  позицию не влияет никак, поэтому им прописаны ЯВНЫЕ зеркальные координаты в styles.css
  (`#oppStats .statbar-edge-*`): left↔right меняются местами (не просто “тот же left/right,
  но контент перевёрнут”, как было раньше), а tea-шный угловой край (`top:0;right:0`,
  art trubi1.png) теперь уходит в буквально противоположный угол панели (`bottom:0;left:0`).

- [x] **Случайный выбор первого хода — дайс-модалка (`orderRollModal`)** — реализовано
  2026-07-10, roadmap Version 1.01 пункт 2. Новый шаг между выбором режима/фракции и
  мулиганом/дек-билдером, во ВСЕХ 4 комбинациях (hotseat×{classic,rush}, vsai×{classic,rush}):
  два кубика (плейсхолдер — цифры 1-6 в рамке, реальный арт граней подключит автор),
  ~1.4с случайного перебора чисел с обеих сторон одновременно (`_rollOrderDice()` в ui.js),
  затем фиксация результата; ничья → пауза 0.9с → автоматический повторный бросок, без ручной
  кнопки reroll. Победитель (больше цифра) визуально подсвечивается (`.order-roll-winner`),
  результат допечатывается посимвольно (`_typeOrderResult()`, тот же CRT-стиль, что у
  остальных модалок). `btn_ready` неактивна до фиксации результата; `btn_back_corner`
  возвращает на шаг назад (vsAiPickerModal для vsai, deckPickerModal для hotseat — ОДИН шаг
  назад, как у остальных модалок в цепочке, а не сразу на два).
  — Дек-билдер (Rush) в hotseat теперь строит колоды в порядке результата броска
  (`buildOrder` в `startRushBuild()`, deckbuilder.js), а не всегда Tea→Jeet — у игрока за 2-й
  ход теперь есть возможность собрать другую колоду под эту роль.
  — `backFromDeckBuilder()` теперь возвращает к ПЕРЕброску (снова открывает orderRollModal),
  а не сразу к vsAiPickerModal/deckPickerModal — раньше между ними не было дайс-модалки,
  теперь один "назад" = один шаг назад и здесь тоже.
  — Хардкод "jeet = второй игрок" убран из четырёх мест: `G.turn`/`G.mulliganTurn` в
  `initState()` (были захардкожены на `'tea'`), `G.jeetFirstTurn` → переименовано в
  `G.secondFirstTurn` + условие в `endTurn()` (game.js) теперь на `G.secondFaction`,
  `skipDraw`/`turnNum++` в том же `endTurn()` — на `G.firstFaction`/`G.secondFaction`,
  и хардкод мулиган-цепочки Tea→Jeet в `readyFromMulligan()` (ui.js) — теперь на
  `G.firstFaction`/`G.secondFaction`. Restart (win-модалка) переигрывает с ТЕМ ЖЕ
  `firstFaction`, что и завершившийся матч (не новый бросок).
  — UNSEEN (бонус 2-го игрока) убран из самой колоды (был `buildDeck()`/`buildAiRushDeck()`
  в deck.js, шёл в общий шаффл — то есть раньше МОГ попасться в стартовой руке до муллигана,
  что автор не хотел) и теперь выдаётся напрямую в руку `G.secondFaction`-игрока 6-й картой
  (`grantUnseenBonus()`, ui.js) в момент, когда фаза муллигана реально заканчивается
  (`phase='action'` в `readyFromMulligan()` — единая точка схождения для всех 4 комбинаций
  режим×конфиг колоды, поэтому один вызов покрывает их все).
  — Арт граней кубика подключён 2026-07-10 (тот же день) — автор добавил `dice_1.png`…`dice_6.png`
  в `img/`; `.order-roll-die` заменён с бордер-рамки+цифра на `background-image` (JS-хелпер
  `_setDieFace(el,n)` в ui.js подставляет `img/dice_${n}.png`), тот же размер бокса
  (`clamp(46px,12vw,58px)`), подсветка победителя — `drop-shadow` вместо рамки/box-shadow
  (у самого арта уже есть форма кубика, рамка была нужна только для цифры-плейсхолдера).

- [x] **Три доп. правки к order-roll/deckbuilder** — 2026-07-10, тот же день.
  — `dice_1..6.png` добавлены в `preloadAssets()` (ui.js), отдельным блоком рядом с
  остальным art для этой модалки.
  — Тайпинг-эффект (тот же, что у результата броска) вынесен в переиспользуемые хелперы
  `_typeText(el,text,charMs,onDone)` (обычный текст) и `_typeHtmlLine(el,segments,charMs,onDone)`
  (текст с инлайн `<strong>`, посимвольно, без поломки тега) — теперь используется ещё в
  двух местах: deckPickerModal (`_playDeckPickerTyping()` — две строки Classic/Rush печатаются
  последовательно) и vsAiPickerModal (`_playVsAiPickerTyping()` — одна строка). Обе модалки
  переигрывают тайпинг при КАЖДОМ показе, не только при первом открытии — весь код показа
  этих модалок стянут в `_showDeckPickerModal()`/`_showVsAiPickerModal()` (единая точка входа
  вместо четырёх разбросанных `classList.remove('hidden')+_modalPopIn`), чтобы это не пришлось
  дублировать на каждом "назад".
  — Кнопка "назад" в дек-билдере (Rush) — раньше вела на пере-ролл кубиков (см. вчерашнюю
  запись), теперь по прямому запросу автора ведёт сразу на landing (главное меню), минуя
  faction/deck-config пикеры и order-roll целиком — черновик колоды всё так же не сохраняется.
  Иконка сменена с `btn_back1/2/H` на `btn_home1/2/H` (те же файлы, что у win-модалки).

- [x] **Тайпинг-эффект распространён на confirmModal + winModal** — 2026-07-10. Тот же
  `_typeText()` (см. запись выше), теперь ещё в двух местах: `showConfirm()` печатает
  тело сообщения (Restart/Main Menu confirmations В ТОМ ЧИСЛЕ — тот же showConfirm() и у
  них; заодно и у deckbuilder.js import-notices, бесплатно, тот же вызов) вместо мгновенного
  `textContent`; `showWin()` печатает флейвор-строку под "VICTORY"/"DEFEAT". Заголовки (`h2`)
  остаются мгновенными везде — тот же паттерн, что уже был у order-roll/deckPicker/vsAiPicker.

- [x] **Баг: Unseen у Tea не кликалась** — 2026-07-10, найдено автором в тесте. Причина:
  `DEFS.unseen.f` в data.js захардкожен на `"jeet"` (наследие тех времён, когда Unseen всегда
  доставался Джиту) — `card.f` при этом используется ПОВСЮДУ как "чья это карта" (клик по
  руке — `card.f===G.turn` в `game.js`, `.affordable`-подсветка, рендер своей/чужой руки), так
  что когда `grantUnseenBonus()` кладёт карту в руку Tea (Tea выиграла бросок и стала 2-м
  игроком), сама карта физически лежит в `G.tea.hand`, но `card.f` всё ещё `'jeet'` — клик по
  ней проваливает проверку `card.f===G.turn` и ничего не происходит. Исправлено в
  `grantUnseenBonus()` (ui.js): после `mkCard('unseen')` явно переставляется `card.f=second`
  (фактический владелец по броску), а не то, что лежит в DEFS. `DEFS.unseen.f` сам не тронут —
  это просто дефолт для любого места, читающего его ДО назначения реального владельца
  (например каталог).

- [x] **Механики `armor:N` и `untamed` — реализованы в движке** — 2026-07-10, первые две
  механики Version 1.01, закрепляющие саму версию (см. roadmap выше для полной технической
  спецификации). Ни одна из двух пока не висит ни на одной живой карте — карта/трейт-привязка
  и визуал (иконка щита, автор рисует отдельно) сознательно отложены на потом. Заодно записан
  большой бэклог идей архетипов/механик (Инкарнация X, reflect, poison, ess_steal, evolve и
  т.д. — чисто брейншторм, нигде отдельно не оформлен списком, не ищи по названию раздела) —
  ничего из него не реализовано.

- [x] **Баг: кнопка активного хила не появлялась для дебаффнутой-но-полной-HP цели** —
  2026-07-10, найдено автором в тесте. `hasHealTarget` (render.js, попап-кнопка Heal) и
  подсветка `.healable` (render.js) проверяли только `hp<maxHp`, хотя сама резолюция клика
  (`onClick()` в game.js, `G.phase==='healTarget'`) УЖЕ умела снимать `burning`/`feared` даже
  без изменения HP — просто клик по такой цели физически не проходил гейт `card.hp<card.maxHp`
  на входе. Все три места (кнопка/подсветка/клик) теперь читают
  `hp<maxHp || burning || feared` одинаково.
- [x] **Баг: тултип ATK не показывался на маленькой карте** — 2026-07-10, найдено автором.
  `.card-atk-box` (зумленная/большая карта) давно имел `data-base`/`data-bonus` и попадал в
  `TOOLTIP_TRIGGER_SELECTOR`; `.card-small-atk-box` (мини-карта в руке/на поле) не имел ни
  того, ни другого — тултип с разбивкой бонуса физически не мог сработать. Добавлены те же
  `data-base`/`data-bonus` на мини-карту (render.js) + класс в селектор + case в
  `_tooltipDataFor()` (ui.js, тот же кусок кода обслуживает оба класса).

- [x] **Броня vs магический урон + доп. тестовые привязки untamed** — 2026-07-10, по
  прямому запросу автора (см. полную техническую спецификацию в roadmap выше, Version 1.01):
  `armor` теперь блокирует ТОЛЬКО физический урон (атака+контратака), магия (AOE/Shard/
  targeted-spell/burn) бьёт напрямую — `dmgCard()` получил 4-й параметр `bypassArmor`.
  `untamed` — тестово ещё на 7 обычных travelers (#25/#398/#2/#187/#36/#20/#22) плюс у #26
  убран лишний `aoe:1`. Найден и исправлен баг: иконка `untamed` не рендерилась в Каталоге —
  оказалось, `TAG_ICONS`-подобных копий по всему проекту не 2 (render.js), а 5 (+2 в
  catalog.js, +1 в deckbuilder.js) — везде своя дублирующаяся копия списка тег→иконка вместо
  одного общего источника. Добавлено во все 5. Новая идея в бэклог — «Невосприимчивость»
  (`warded`, working name): иммунитет к магическому урону + fear + burn, не реализовано.

- [x] **5 точечных правок по запросу автора** — 2026-07-10.
  1. **Squad-порог вернули на 3** (было ошибочно 2 в живом `game.js`, хотя и в этом же
     `CLAUDE.md` — "Squad System" выше — и в `ai.js` (`aiGtypeCount`/`squadCompleteBonus`)
     давно уже документирован и посчитан именно порог 3 — то есть `game.js` был единственным
     местом, где значение реально разъехалось с остальным проектом). `SQUAD_DEFS`
     (`count:2`→`count:3` во всех 6 записях) — единственное место, которое меняли, ИИ трогать
     не пришлось, его веса уже были рассчитаны на 3.
  2. **Модалки с тайпингом больше не растут по ходу печати.** `_typeText()`/`_typeHtmlLine()`
     (ui.js) теперь измеряют высоту ПОЛНОГО (готового) текста ДО начала анимации и фиксируют
     её через `min-height`, а не только потом — печать идёт уже внутри готового по размеру
     блока. Намеренно `scrollHeight`, а не `getBoundingClientRect().height` — в момент вызова
     модалка может ещё доигрывать pop-in анимацию (`transform:scale()`, см.
     `.modal-pop-in`/`@keyframes modalPopIn` в styles.css), а `getBoundingClientRect()`
     чувствителен к transform родителя (вернул бы уже отмасштабированный, неверный размер);
     `scrollHeight` — чисто layout-свойство, transform на него не влияет.
  3. **Disabled-версия кнопки мулигана больше не "прозрачная".** Причина — общий dimming-
     фильтр `.modal-art-btn:disabled{filter:brightness(0.5) saturate(0.4)}` (добавлен в сессии
     с order-roll для его Ready-кнопки, у которой не было своего disabled-арта) каскадом
     применялся и к `.btn-mulligan`, у которой СВОЙ готовый спрайт (`btn_mulliganD.png`) —
     фильтр поверх готового спрайта и выглядел как лишняя прозрачность/тусклость. Добавлен
     override `.modal-art-btn.btn-mulligan:disabled{filter:none;}` (styles.css).
  4. **`enter_aoe` больше не игнорирует броню** — armor/magic-bypass правку (прошлая сессия)
     пришлось разделить: активная AOE-кнопка (Umbasir/Vardan, `doUmbAsir()`/`doVardan()` в
     game.js) — отдельный код-путь, магия, по-прежнему игнорирует; а `enter_aoe:N` идёт через
     ОБЩИЙ `case 'aoe':` в `abilities.js` (единственный потребитель — `triggerAbilities(card,
     'on_enter')`, вызывается из `doCreature()`; `triggerAbilities(card,'active')` вообще
     нигде не вызывается, тот код мёртв) — этому пути `bypassArmor` убрали, по прямому запросу
     автора ("enter_aoe — не магический урон").
  5. **ALTAR теперь даёт и карту, и эссенцию за жертву** (было — только эссенция) — см.
     Version 1.01 roadmap выше.

- [x] **Рендер Брони на карте** — 2026-07-10. `.card-armor-box`/`.card-small-armor-box`
  (styles.css): позиция — слева, под cost (`left` совпадает с `.card-cost`, `top` сразу под
  его нижним краем), высота бокса = высоте `.card-tag-icon` (`calc(var(--card-h)*0.108)` /
  `calc(var(--card-small-h)*0.13)`), ширина = высота×2 (ратио 2:1, задан явно через
  `calc(...*2)`, не через `aspect-ratio`, для консистентности с остальными calc-based
  размерами карты). Фон — `armor_bg.png`, иконка — `armor.png` (оба файла — автор, добавлены
  в `preloadAssets()`). Паддинги/font-size — скопированы буквально с `.card-hp-box`/`.card-hp`
  (`padding:1px 1px 4.5px 1px`, `font-size:calc(var(--card-h)*0.11)`), иконка — существующий
  общий класс `.stat-icon` (уже был `em`-based, автоматически подхватывает и полный, и
  мини-размер через существующее правило `.card-small .stat-icon{width:0.6em;...}` — ничего
  добавлять для этого не пришлось). Показывается ТОЛЬКО если `hasTag(card,'armor')` — как и
  тег-иконки, не резервирует место, если тега нет.
  — **Добавлено во ВСЕ рендер-контексты** (6 мест, отдельно от общего
  `TAG_ICONS`-дублирования — тут отдельная вставка markup, а не общий список иконка↔тег):
  render.js (полноразмерная карта + мини-карта), catalog.js (сетка + модалка деталей),
  deckbuilder.js (пул Rush-подбора). Зум-режим (`zoomHandCardFly`→`showFieldCardPreview`)
  использует тот же `mkEl()`, что и обычный рендер — отдельно ничего чинить не пришлось,
  кроме списка `pointerEvents='auto'` для зум-клона (та же строка, что чинили для ATK на
  мини-карте в прошлой сессии) — `.card-armor-box` туда тоже добавлен, иначе наведение в
  зуме не ловилось бы (клон целиком `pointer-events:none`, кроме явно перечисленных детей).
  — **Тултип** — `_tooltipDataFor()` (ui.js), новый case на `data-armor`/`data-maxarmor` →
  `"N/M Armor"` (тот же формат, что и у HP-бокса). Для живых карт (render.js) — `data-armor`
  реальный текущий пул (может быть меньше max, если часть уже поглощена в этом ходу);
  для превью вне игры (catalog.js/deckbuilder.js, там нет живого `card`, только `def`) —
  `data-armor`===`data-maxarmor` всегда (просто показывает базовое значение тега).

- [x] **Аура Брони (`aura:armor`) + `world_armor` + переработка Squad-бонусов Merchird/Szarg**
  — 2026-07-10, полная спецификация в разделах "Squad System"/"Tag System" выше, кратко:
  — Новая функция `recalcArmor(faction)` (game.js) — тот же принцип, что у `applyAuras()` для
  maxHp (own tag + squad + aura-от-союзника + world, все три стекуются), но проще: own-часть
  всегда пересчитывается с нуля из тега `armor:N` (он не мутирует в рантайме, в отличие от
  maxHp), поэтому не нужен `baseMaxHp`-подобный снэпшот — просто diff нового total против
  сохранённого `card.armorMax` с прошлого прохода. Headroom-правило автора: на кэпе — кэп
  растёт (2/2→3/3); не на кэпе — текущее число не меняется, новый запас доступен только со
  следующего рефилла (1/2→1/3, не 2/3). Вызывается СРАЗУ после каждого `checkSquadBonuses()`
  (все call sites, включая `abilities.js` raise-эффект).
  — Merchird squad-бонус: было ATK+1 → стало Armor+1. Szarg squad-бонус: было Pierce (param) →
  стало ATK+1 (забрал старый бонус Merchird). Старый Szarg-бонус (Pierce) НЕ удалён из кода —
  просто убран из `SQUAD_DEFS`, ветка `param`/pierce в `checkSquadBonuses()` по-прежнему на
  месте, если понадобится вернуть. Текст `ab` у всех 16 карт (8 mch + 8 szg) обновлён.
  — `world_armor:N` — по аналогии с `world_maxhp` (не `aura:armor` — у World-карты нет вопроса
  самобаффа). Чистая инфраструктура, ни одна World-карта пока его не использует —
  `doWorld()` уже целиком готов (лог-флаг `_worldArmorLog`, вызов `recalcArmor()`).
  — Тестовая аура: ABYSSWALKER (`j_mal`) получил `aura:armor:1` В ДОПОЛНЕНИЕ к своему
  `armor:2` — как и остальные ауры, себя не бафает, но может получать бонус от других
  источников (например будущего Мира с `world_armor`).
  — Рендер (`.card-armor-box`) переведён с `hasTag(card,'armor')` на `card.armorMax>0` —
  теперь бокс брони показывается и у карт БЕЗ собственного тега `armor`, если они получают её
  извне (Merchird-сквад без своего armor-тега, союзник ABYSSWALKER и т.д.); `data-maxarmor`
  тоже теперь `card.armorMax`, а не голый тег. Рефилл в `endTurn()` — та же замена условия.
  — Везде, где раньше сбрасывались `squadMaxHpBonus`/`squadAtkBonus`/`squadParam`
  (`killCard()`, `reviveCard()`, raise-эффект, `resetC()`, `doSpellDispelTarget()`) — рядом
  добавлен сброс `squadArmorBonus`/`armorMax`.

- [x] **4 бага в системе Брони — найдены автором в тесте, исправлены** — 2026-07-10.
  1. **0/0 → 0/1 вместо 1/1 при появлении нового источника бонуса.** Реальный сценарий: 2
     Merchird стоят на поле без брони (легитимно 0/0 — своего тега armor нет, squad ещё не
     активен), заходит 3-й — squad срабатывает, у ВСЕХ троих должно стать 1/1. Свежевошедший
     получил верно (свой первый проход через `recalcArmor()` — `armorMax===undefined` branch).
     Два УЖЕ стоявших — получили 0/1 вместо 1/1. Причина: `wasFull` в `recalcArmor()` требовал
     `armorMax>0`, а у них `armorMax` было легитимным 0 (не `undefined` — они уже проходили
     через recalcArmor раньше, при своём собственном входе на поле, с нулевым результатом) —
     0/0 не считалось "на кэпе" из-за `>0`, хотя логически 0 из 0 доступных — это тоже "полно".
     Убрал `&&a.armorMax>0` из условия — теперь `wasFull=(a.armor||0)===a.armorMax`, работает
     для 0/0 так же, как для 2/2. Тот же баг был у ABYSSWALKER (аура давала союзникам 0/1
     вместо 1/1) — один и тот же код, один и тот же фикс.
  2. **Squad-бонус брони не отображался в статус-панели существа** (при наведении/зуме) — у
     Merchird с активным squad не было видно "+1 Armor" среди баффов. `_squadBonusText()`/
     `_cardStatusEntries()` (render.js) проверяли только `squadAtkBonus`/`squadMaxHpBonus`/
     `squadParam`, про `squadArmorBonus` забыли. Добавлено в оба места.
  3. **Аура-бонус брони (от ABYSSWALKER/будущего Мира) тоже не отображался в статус-панели**
     союзников, которые её получают — в отличие от ATK-ауры и maxHP-ауры (у обеих есть
     персистентные поля `atkBonus`/`worldMaxHpBonus`, которые `_cardStatusEntries()` уже умеет
     показывать), для брони такого персистентного поля не было вообще — `recalcArmor()`
     считал aura/world-вклад только "на лету" внутри `reduce()`, никуда не сохраняя. Добавлены
     два новых персистентных поля — `card.auraArmorBonus` (от союзника) и
     `card.worldArmorBonus` (от Мира), заполняются в `recalcArmor()` на каждом проходе,
     показываются в статус-панели тем же паттерном, что и `atkBonus`/`worldMaxHpBonus`.
     Сброс этих полей добавлен везде, где сбрасывается `armorMax` (`killCard()`,
     `reviveCard()`, raise-эффект, `resetC()`).
  4. **Броня NABUNAGI (свой тег `armor:2`) не рендерилась в руке** — только после выхода на
     поле. Причина: рендер-условие было `card.armorMax>0`, а `armorMax` вычисляется ТОЛЬКО
     внутри `recalcArmor()`, которая проходит исключительно по `cur.field` — карта в руке
     никогда через неё не проходит, `armorMax` там всегда `undefined`, даже если у карты
     есть собственный тег armor. Добавлен хелпер `_armorDisplay(card)` (render.js): если
     `armorMax>0` — показывает живое поле-значение (как раньше); если `armorMax===undefined`
     (карта вне поля) — показывает СОБСТВЕННЫЙ тег как "полный" (2/2) — squad/aura всё равно
     не действуют, пока карта не сыграна, показывать нечего кроме своего базового значения.
     Используется в обоих местах рендера (`mkSmallEl()`/`mkEl()`), тултип не потребовал
     изменений — те же `data-armor`/`data-maxarmor` атрибуты, только источник значений другой.

- [x] **5 правок по фидбеку автора** — 2026-07-10.
  1. ~~**Звук/анимация добора карты вне обычного хода (Hunger/Altar/spell-draw/Ryvlen
     on-attack)**~~ — ⚠️ ПОПЫТКА ФИКСА НЕ СРАБОТАЛА, ОТКАЧЕНА тем же днём (см. запись ниже,
     "Откат попыток фикса"). Гипотеза была: `render()` обновлял видимость `SidebarBtns`/
     `BottomBar` (внутри которого физически лежит `deckPlaceholderT`/`J`) ПОСЛЕ вызовов
     `rZone()` для рук, из-за чего `_deckPlaceholderRect()` видел устаревшее состояние —
     переставил блок видимости выше вызовов `rZone()`. Автор протестировал — эффекта не дало,
     проблема осталась ровно такой же. Реальная причина всё ещё НЕ найдена — см. Backlog.
  2. **Аура maxHP от карты (не Мира) не показывалась в статус-панели.** Та же природа, что
     чинили для брони в прошлой сессии — у `worldMaxHpBonus` (Мир) есть персистентное поле,
     у ATK-ауры есть `atkBonus`, а у maxHP-ауры ОТ СУЩЕСТВА такого поля не было вообще — её
     вклад считался только "на лету" внутри `baseMaxHp`-математики в `applyAuras()`, никуда
     не сохраняясь. Завёл `card.auraMaxHpBonus` (сбрасывается и пересчитывается в
     `applyAuras()` на каждом проходе, тот же цикл, что уже трогает `baseMaxHp`), добавил
     отдельную строку в `_cardStatusEntries()` (render.js) — теперь ДВЕ разные строки:
     "+N Max HP from an aura on the battlefield" (от карты) и "+N Max HP from the World card"
     (от Мира, было и раньше, просто уточнил формулировку под пару). Сброс поля добавлен
     везде, где сбрасывается `atkBonus`/`baseMaxHp` (`resetC()`, `reviveCard()`, raise-эффект).
  3. **Убран текст "Armor: N" из `ab` NABUNAGI/ABYSSWALKER** — визуальный бокс брони на
     карте уже показывает это число, дублировать в тексте способности не нужно (та же логика,
     по которой раньше убрали текст про Untamed, когда завели ему иконку). У ABYSSWALKER текст
     про ауру ("Aura: allies +1 Armor.") остался — для эффекта, который карта даёт СОЮЗНИКАМ,
     визуального индикатора нет (бокс брони показывает только собственное текущее значение).
  4. **Ложная "+1 HP" анимация при чистом clean-хиле.** Клик хилером на дебаффнутую, но уже
     полную по HP цель (легитимный кейс — снять fear/burn без реального лечения, см. прошлую
     сессию) корректно снимал дебафф, но всё равно показывал плавающую "+1 HP", хотя HP не
     менялось. Посчитал фактическое исцеление (`actualHeal = card.hp - oldHp`, с учётом cap по
     maxHp) — floating-текст теперь показывается, только если `actualHeal>0`; лог-сообщение
     тоже адаптировано ("cleanses X" вместо "+0 HP to X", если реального хила не было).
  5. **Косметика: бокс брони подвинут** так, что его низ теперь совпадает с низом арта карты
     (`top: calc(var(--card-pad) + var(--card-art-size) - <высота бокса>)` для полной карты,
     аналогично для мини — через `--card-small-art-h`), вместо раньше произвольно подобранного
     отступа. Использует те же CSS-переменные, что и сам `.card-art`, так что останется верным
     автоматически, даже если размеры карты позже поменяются.

- [x] **Откат попыток фикса анимации добора — рабочим остался только один кусок** —
  2026-07-10, автор протестировал предыдущую запись выше и оба фикса из неё, результат:
  ничего не изменилось для Hunger/Altar/Ryvlen/spell-draw, они как молчали, так и молчат.
  1. **Оставлено (реально помогло): скрытая рука соперника больше НЕ "летит" со звуком при
     каждой передаче хода в hotseat.** Причина была отдельная от анимации добора и не связана
     с ней — контейнер руки в hotseat каждый ход меняет РАЗМЕТКУ целиком (открытая через
     `rZone` ↔ скрытая через `rHiddenHand`), `wrongType`-проверка в `rHiddenHand()`
     срабатывала почти на каждой передаче, контейнер вайпился целиком и ВСЯ рука (не только
     реально новые карты) переигрывала анимацию+звук. По прямому запросу автора анимация/звук
     для скрытой чужой руки убраны ПОЛНОСТЬЮ (`rHiddenHand()`, render.js) — это ОСТАЛОСЬ в
     силе, автор подтвердил, что хотя бы это не мешает.
  2. **Откачено (не помогло, не давало эффекта): всё остальное.** И реордеринг видимости
     `SidebarBtns`/`BottomBar` внутри `render()` (см. пункт 1 записи выше — восстановлен
     исходный порядок), и весь механизм `drawCardsAnimated()`/`G._pendingDrawFx` (принудительная
     постановка добранных карт в очередь на анимацию в обход `existingIds`-диффинга в `rZone()`)
     — удалены целиком из `game.js`/`render.js`/`abilities.js`. Оба захода на проблему
     оказались основаны на гипотезах, не подтверждённых тестом — раз реального движения нет,
     решили не оставлять недоказанный код "на всякий случай", а откатить и разобраться заново
     позже с более прицельным подходом (возможно — с логированием прямо в браузере автора,
     раз статический разбор кода дважды не попал в причину).
  — **Позже нашли и починили** — пункт "Добор карт вне начала хода — без анимации/звука"
  отмечен [x] сделанным ниже по документу (не в отдельном разделе Backlog, ссылка на который
  тут раньше была битой).

### Итог сессии 2026-07-10 (разбор дня целиком)

Очень длинная сессия, от Version 1.01 turn-order UI до целой новой механики Брони. Кратко,
что реально доехало до рабочего состояния (детали — в записях журнала выше по датам):

**Доехало и подтверждено автором:**
- Дайс-модалка порядка хода (order-roll) — полностью, все 4 комбинации hotseat/vsai×
  classic/rush, включая реальный арт граней от автора.
- Тайпинг-эффект — размножен на все модалки (deckPicker/vsAiPicker/confirm/win), не растёт
  по ходу печати (фикс через `scrollHeight`, устойчиво к pop-in transform).
- Баг с Unseen у Tea (не кликалась) — найден и исправлен.
- Механика **Брони** (`armor:N`) целиком: own tag + squad (`effect:'armor'`) + aura
  (`aura:armor:N`) + world (`world_armor:N`, инфраструктура без карты) — все три стекуются
  через единый `recalcArmor()`, headroom-правило (на кэпе растёт вместе с бонусом, не на
  кэпе — не растёт до следующего рефилла), полный визуальный рендер во ВСЕХ контекстах
  (рука/поле/зум/каталог/декбилдер), тултипы, статус-панель. Прошла через 2 раунда багфиксов
  по фидбеку автора (0/0→0/1 баг, отсутствие в статус-панели, руки без рендера, позиция бокса).
- Механика **Неукротимость** (`untamed`) — снимает exhausted уже в ход соперника, иконка
  подключена во все 5 мест дублирования тег→иконка (найдено и исправлено, что их не 2, а 5).
- Squad-система: порог вернули на 3 (регрессия), Merchird↔Szarg поменялись бонусами местами
  (armor↔atk), тестовые привязки untamed на 7 travelers.
- ALTAR даёт и карту, и эссенцию. `enter_aoe` больше не игнорирует броню (в отличие от
  остальной AOE-семьи — осознанное разделение). Куча мелких UI-фиксов (disabled-кнопка
  мулигана, ATK-тултип на мини-карте, ложная "+1 HP" при чистом clean-хиле, отдельная
  статус-строка для aura-maxHP vs world-maxHP).
- Записан объёмный бэклог трейтов NFT-коллекции (Mood/World → механики) и бэклог идей новых
  механик архетипов (см. секции выше).


### Приоритет — завтра

- [x] **Добор карт вне начала хода — без анимации/звука (Hunger/Altar/spell draw "draw N
  cards"/Ryvlen on-attack draw).** Открыто с 2026-07-10, автор нашёл в тесте. Обычный добор в
  начале хода (`endTurn()`) анимируется и звучит нормально — эти 4 источника молчат. Две
  попытки фикса за 2026-07-10 (реордеринг видимости `SidebarBtns`/`BottomBar` в `render()`;
  затем отдельный явный механизм принудительной постановки в очередь на анимацию,
  `drawCardsAnimated()`/`G._pendingDrawFx`) — ОБЕ не дали эффекта на тесте автора, обе
  откачены (см. журнал сессии выше, "Откат попыток фикса анимации добора"). Единственное, что
  реально помогло в процессе — не связанный с этим фикс: скрытая рука соперника в hotseat
  больше не переигрывает анимацию/звук при каждой передаче хода (`rHiddenHand()` — анимация/
  звук убраны оттуда полностью, это осталось в силе).
  **ВЕРОЯТНАЯ РЕАЛЬНАЯ ПРИЧИНА — найдена автором тем же днём, ещё не проверена в коде:**
  дело не в диффинге/видимости (обе прошлые гипотезы were ошибочны), а в РАССИНХРОНЕ момента,
  когда меряется целевая точка полёта, и момента, когда рука реально сжимается в веер.
  `rZone()` считает `restRect=cardEl.getBoundingClientRect()` СРАЗУ после `appendChild` —
  то есть ДО того, как отработает `adjustHandOverlap()` (та вызывается только на следующий(-е)
  кадр(ы) через `requestAnimationFrame`, см. конец `render()`). При малом числе карт в руке
  несжатая раскладка почти совпадает с итоговой (сжатой) — совпадение маскирует баг, полёт
  выглядит нормально. При большом числе карт несжатая раскладка карт значительно шире видимой
  зоны — карты в руке физически стоят за пределами экрана справа, и `restRect` для добранной
  карты берётся именно оттуда, ДО сжатия. Анимация летит в эту (ещё не сжатую) точку — визуально
  выглядит как "улетает куда-то за экран", хотя реально просто целится не в то место. Это,
  скорее всего, объясняет и "тишину" — сама fly-анимация и её звук (внутри `_flyCardFromDeck`,
  `render.js`) всё это время МОГЛИ срабатывать, просто улетали не туда/визуально терялись, что
  на глаз воспринималось как "ничего не произошло". **Возможное направление фикса** (НЕ
  реализовано, требует проверки перед тем как кодить): дать `adjustHandOverlap()` отработать
  СИНХРОННО (не через `requestAnimationFrame`) до того, как `rZone()` меряет `restRect` для
  свежедобранной карты — либо просто переставить порядок вызовов, либо явно дёрнуть
  `adjustHandOverlap()` перед измерением. Нужно перепроверить, не сломает ли это остальную
  анимацию руки (сжатие само по себе плавно анимируется через CSS transition — синхронный вызов
  может либо ничего не изменить визуально, либо потребовать доп. `void el.offsetWidth` для
  форс-reflow, как это уже делается в других местах кода).

- [x] ~**Кнопка “назад” во всех модалках до муллигана**~ — сделано 2026-07-08. mulliganScreen
  подтверждённо БЕЗ кнопки. Финальные позиция/размер/арт (несколько раз менялись за день) —
  см. консолидированную запись “Красивая модалка декбилдера” чуть ниже, там же и навигация:
  — `backFromDeckPicker()`/`backFromVsAiPicker()` (ui.js), `backFromDeckBuilder()`
  (deckbuilder.js, черновик Rush аннулируется целиком, независимо от шага).
- [x] ~**Красивая модалка декбилдера (2 этапа + доводка)**~ — сделано 2026-07-08, финальное
  состояние ниже (по ходу дела несколько раз переделывались зум и позиция кнопки “назад» —
  тут только итог, не история промежуточных попыток):
  — **Два окна**: слева выбранная колода (`#deckBuilderChosenGrid`), справа весь пул
  (`#deckBuilderPoolGrid`) — клик по карте в пуле перебрасывает её в выбранное и наоборот.
  Заклинания с несколькими копиями (`max>1` в `getRushPool()`) рисуются одной “стопкой”
  (`_dbStackEl()` в deckbuilder.js) — верхняя карта + 1-2 тени-слоя со сдвигом
  (`.db-stack-layer`, `--layer-i`), БЕЗ рамок/подсветок и БЕЗ цифр-бейджей — только тени.
  — **Хедер** (не скроллится, отдельный flex-ребёнок `.modal`, вне `.modal-body`):
  заголовок → разделитель → вторая строка (статистика+кривая маны слева, фильтры справа,
  разделитель между ними). На мобильном (`≤600px`) фильтры уходят на ТРЕТЬЮ строку через
  `flex-wrap` (без изменения HTML/DOM), у стата+кривой равномерные отступы
  (`justify-content:space-evenly`).
  — **Статичный размер**: `#deckBuilderModal .modal` — `width:95vw;height:88vh` (жёстко, не
  auto-по-контенту — раньше “прыгала” при смене фильтра и не растягивалась на широких
  экранах из-за того, что `.modal` — flex-item без `flex-grow`, а `width:auto` для него
  значит “ужаться по контенту”, а не “занять всё доступное”). Рамка тоньше стандартной
  (`--modal-border-w:27px` вместо 54px, `border-image-slice:54` вместо 108) — своя, не
  трогает остальные модалки. Арт рамки — `bg_modal_deck.png` (уже подключен).
  — **Сетка карт**: 3 колонки везде (было пробовали 5/4 — на телефоне слишком тесно, карта
  ломается). Размер карты — `min(cqw-формула, var(--cat-card-w))`, тот же приём, что у
  Каталога, с потолком в каталожный дефолтный размер. Отступы на десктопе НЕсимметричные
  (по просьбе автора) — `row-gap:10px` (2×), `column-gap:2.5px` (0.5×); на телефоне
  обычный симметричный `gap:5px`.
  — **Мобильная раскладка (`≤600px`)**: НЕ лево/право (тесно), а верх/низ — сверху весь пул,
  снизу выбранное, каждая половина на всю ширину экрана СО СВОИМ независимым скроллом
  (`.db-pane{overflow-y:auto}` у каждой панели отдельно, а не общий скролл на
  `.modal-body`). Визуальный порядок — через `order` (CSS), DOM не трогали.
  — **Зум по долгому нажатию**: после трёх неудачных попыток (клонирование теряло cqw-размеры;
  копирование “готовых” значений через `getComputedStyle` тоже не работало — незарегистрированные
  custom-свойства без `@property` отдают через `getComputedStyle` СЫРОЙ ТЕКСТ формулы, а не
  число в px) — решение: **не** пытаться перенести cqw-размеры вообще, а переиспользовать
  готовый `showFieldCardPreview()`/`closeFieldCardPreview()` из render.js (тот же зум, что у
  карт поля/руки в игре) — он строит карту заново через `mkEl()` на обычных vh-переменных
  `:root`, которые всегда резолвятся корректно вне зависимости от DOM-контекста.
  `_dbPreviewCard(faction,key,def)` в deckbuilder.js собирает “карту” из `DEFS[key]` с
  синтетическим id (плюс `maxHp:def.hp`, т.к. mkEl ждёт `card.maxHp`, а в DEFS только `.hp`).
  Масштаб — `1.6` (тот же `HAND_ZOOM_SCALE`, что и в игре). Долгое нажатие открывает,
  отпускание закрывает — тот же паттерн, что и у зума карт поля (не свой backdrop с кликом).
  — **Подсказки при наведении** — уже работали “из коробки” на большинстве атрибутов
  (глобальный `mousemove`-слушатель в ui.js), но у `.card-tag-icon` не было `data-tag`, а у
  `.card-hp-box` не было `data-hp`/`data-maxhp` (показывало “undefined/undefined HP”) —
  добавлены в `_dbCardEl()`. Заодно та же дыра нашлась и почищена в Каталоге
  (`js/catalog.js`, и сетка, и `openCardDetail()` — там ЕЩЁ и `pointer-events:none` на
  обёртке мешал, убрано).
  — **CRT-экран** (`.modal-crt-screen` в styles.css) добавлен на все модалки с “просто
  текстом” (deckPicker/vsAiPicker/confirm/win) и на mulliganScreen/passScreen — тёмно-зелёный
  фон + толстые (3px) линии скана + виньетка, тот же стиль перенесён и на боевой лог (`.log`,
  было 2px линии — стало тоже 3px, единый вид). У мулигана карты (`#mulliganCards`)
  ПОДНЯТЫ над полосами (`z-index:3`) — на картах полосы смотрелись плохо, на тексте это и
  есть задуманная стилизация. `padding:0` на `.modal-body` этих модалок — иначе CRT-экран не
  доходил до края рамки (не растягивался на всю плитку).
  — **Кнопка “назад”**: в deckPicker/vsAiPicker — угловая, `position:absolute` СИБЛИНГ внутри
  `.modal-stack` (НЕ потомок `.modal` — иначе обрезает `overflow:hidden/auto` у `.modal`, та
  же история, что у `.modal-footer-plate`), в нижнем левом углу (`bottom:0;left:0`), размер —
  РОВНО толщина рамки (`--modal-border-w`, был сначала вдвое меньше). Свой арт
  `btn_back_corner1/H/2.png` (класс `.btn-back-corner`, ОТДЕЛЬНЫЙ от футерного `.btn-back`).
  В deckBuilderModal — этой угловой кнопки НЕТ вообще, “назад” переехала в общий ряд кнопок
  футера, первой по счёту, тот же `.sq` размер, что Clear/Import/Export/OK (арт для неё пока
  `btn_back1/H/2.png` на плейсхолдере — ждём).
  — **Мана-кривая**: цвет по фракции (`#5BDF7A` Tea / `#b44fd4` Jeet, класс `tea-curve`/
  `jeet-curve` на `#deckBuilderCurve`, ставится в `_renderDbCurve()`), квадратная (не
  растянута на всю ширину футера), высота = высоте блока статистики рядом.
  — **Кнопка “Очистить”** — первая в футере (после back), сбрасывает `_db.picks[faction]`
  целиком.
  — **Разные попутные фиксы**: `<html>` не имел `overflow-x:hidden` (только `<body>`) — на
  мобильном Safari `<html>` часто и есть реальный скроллящийся элемент, добавлено (плюс
  `overflow:hidden` на `.modal-overlay` подстраховкой). Classic/Rush кнопки были
  `aspect-ratio:2/1` — почти вдвое выше кнопки Yes (`3/1`) — приведены к `3/1`.
  Стиль (не логика): скопирован конвеншн плейсхолдеров — `background-image` под три
  состояния (idle/hover/active) можно прописывать НЕзакомментированным сразу (несуществующий
  файл просто не подгружается, класс `.placeholder` даёт видимую заглушку) — когда автор
  кладёт реальные файлы, достаточно убрать `placeholder` из HTML, CSS трогать не надо.
- [x] ~**Подключить звуки от Муры**~ — сделано 2026-07-08 (сессия автора), актуализировано
  2026-07-09: все файлы подключены, чеклист ниже полностью отмечен. Три НОВЫХ звука ждём
  отдельно (не от старой пачки) — см. Sound checklist ниже, свежая пометка “жду от Муры”.
- [x] ~**Анимация перехода “ворота открываются”**~ — идея с воротами снята автором
  2026-07-09 (арт для неё так и не понадобился), вместо неё сделан отдельный переход
  муллиган → арена, целиком на коде, без арта:
  — Верхняя полоса (статус оппонента + его рука) выезжает сверху вниз ЕДИНЫМ блоком, нижняя
  (рука игрока + его статус + активный `teaBottomBar`/`jeetBottomBar`) — снизу вверх, тоже
  единым блоком. “Единый блок” — не общий DOM-контейнер, а одинаковая пиксельная дистанция
  (CSS-переменная `--slide-dist`, считается в JS как суммарная высота группы) для всех
  элементов группы при `delay:0`; если бы каждый элемент ехал на свои `100%` высоты, разные
  по росту полосы двигались бы с разной скоростью и группа “тянулась” бы визуально.
  — Поля боя (`oppFieldZone`/`playerFieldZone`) в этой анимации НЕ едут — внутри них живут
  декоративные `.field-star` (см. `spawnStars()`), которые как прямые дети контейнера иначе
  ехали бы вертикально вместе с ним поверх собственного мерцания (смотрелось странно).
  Вместо этого звёзды получают отдельный “вырост из точки” (`.field-star-grow-in`,
  `starGrowIn` keyframe — scale 0→1, transform-origin по умолчанию центр).
  — Поверх всего один раз выезжает надпись “Battle begins!” (`#battleBeginsText`/
  `#battleBeginsInner`) — вырастает из центра (scale 0→1) в точке шва между
  `oppFieldZone`/`playerFieldZone` (не центр экрана, чуть выше), держится и пульсирует 1с
  красным, затем уходит в fade. Font-size не захардкожен — меряется фактическая ширина
  отрисованного текста и подгоняется под 40% ширины окна (шрифт `MEK` кастомный, точные
  метрики глифов заранее неизвестны).
  — Вся логика — `playArenaRevealAnimation()`/`_playFieldStarsGrowIn()`/
  `_playBattleBeginsText()` в `ui.js`, вызывается из обеих точек `readyFromMulligan()`
  (vsAI и hotseat-ветка) вместо старого плоского `game-fade-in`. Новые keyframes/классы —
  `styles.css`, рядом со старым `.game-fade-in` (оставлен как есть, просто больше не
  используется в этих двух местах).

-----

### Итог сессии 2026-07-13

Разношёрстная сессия — арт для Jeet, полировка анимаций, один найденный баг, один новый тег.

- **Кастомный арт кнопок для Jeet** — автор прислал `button_1/2_jeet.png`, `button_grav_1/2_jeet.png`,
  `btn_wait_jeet.gif`, `deck_jeet.png`. Подключены тем же паттерном, что уже был у
  `.bottom-bar-sensor`/`.bottom-bar-extra-4` (скоуп через `#jeetBottomBar`/`#deckPlaceholderJ`,
  без трогания Tea-стороны). Заодно найдены и добавлены в preload-список `js/ui.js` 8 файлов,
  которые реально использовались в CSS/JS, но не грузились заранее (`bg_cost_neutral`,
  `btn_heal`, `btn_spell_cncl`, `db_decorR`, `drill`, `icon-192`, `left_tea`, `zzz`).
- **Полёт добора карты в руку — теперь настоящий клон карты, не рубашка `runaha.png`.**
  `_flyCardFromDeck()` (render.js) клонирует уже готовый `cardEl` (снимается ДО навешивания
  `card-drawn`/`animation-delay` на оригинал — иначе клон унаследовал бы `opacity:0`), летит
  лицом вверх. Добавлен кроссфейд с самой картой в руке (`CARD_FLY_FADE_MS=140`) — карта в
  руке проявляется в ТО ЖЕ окно, где тает клон (было — жёсткий стык без нахлёста), по аналогии
  с `flyClone`/`isNewStack` в `dbSetQty()` (deckbuilder.js).
  - `.card-fly-sprite` (фон `runaha.png`) удалён, заменён на `.card-fly-clone` (только
    позиционирование/тень — визуал теперь несёт сам клонированный `.card`).
- **Баг (репорт автора, тем же днём) — свежедобранные карты в руке бешено мигали
  `.affordable`-пульсацией.** Причина: инлайновые `animation-delay`/`duration`/`fill-mode`,
  которые кроссфейд (см. выше) ставит на `cardEl` для `cardDrawn`, НЕ привязаны к конкретному
  `animation-name` — действуют на ЛЮБУЮ анимацию, что запустится на том же узле после, пока
  инлайн не снят. Карта в руке почти всегда `.affordable` (своя анимация `goldPulseWeak 1.8s`)
  — без очистки та наследовала `duration:140ms` вместо `1.8s`.
  - **Первая попытка фикса** — слушатель `animationend` с проверкой
    `e.animationName==='cardDrawn'`, снимающий инлайн-стили и класс `card-drawn` по
    завершении. НЕ сработала для реального случая: `.hand .card.affordable` — 3 классовых
    селектора (специфичность 0,3,0) БОЛЬШЕ, чем `.card.card-drawn` — 2 (0,2,0) → у
    affordable-карт `goldPulseWeak` побеждает `cardDrawn` ЦЕЛИКОМ (включая имя анимации) —
    `cardDrawn` для них не играет вообще, а `goldPulseWeak` — `infinite`, событие
    `animationend` для нее никогда не наступает → слушатель молча никогда не срабатывал
    именно для самого частого случая (affordable-карта в свой ход).
  - **Реальный фикс** — детерминированный `setTimeout(..., CARD_FLY_MS)` вместо
    `animationend`: снимает инлайн-стили/класс по истечении того же окна, независимо от того,
    чьё имя анимации реально победило в CSS-каскаде.
- **Мишень (прицел) для точечных заклинаний/активок-кнопок/артефактов.** Новые классы
  `aim-target`/`aim-heal` (доп. к существующим `targetable`/`healable` в `mkSmallEl()`,
  render.js) — вешаются ТОЛЬКО на shard/bolt/sacrifice/spellDmgTarget/spellDispelTarget
  (красная `mishen_red.png`) и spellBuffTarget/spellUntapTarget/healTarget-своя-сторона
  (зелёная `mishen_green.png`). Обычное выделение цели атаки (`selectTarget`, и
  enemy-ветка `healTarget` — атака хилером) — БЕЗ мишени, только исходная красная рамка.
  Позиция — по центру АРТА карты (не всей карты): `top:calc(2px + var(--card-small-art-h)/2)`,
  посчитано от паддинга `.card-small` и высоты арта, не магическое число. Лёгкое мигание
  (`mishenBlink`, opacity 1↔0.55, 1.1s).
- **Цвет `#e14c43`** унифицирован на: `CHOOSE TARGET` (`.target-prompt-main`), подпись
  `CLICK HERE TO CANCEL` (`.target-prompt-sub`), рамку попапа (`.target-prompt-box`,
  border+shadow), и `Battle begins!` (`.battle-begins-inner`) — весь красный текст/рамки
  таргетинга и вступления теперь одного оттенка.
- **Баг — тултип Инкарнации в Каталоге/Деккбилдере не показывал число ходов.** Причина:
  `catalog.js` (2 места — сетка и попап деталей карты) и `deckbuilder.js` рендерили
  `.card-tag-icon` БЕЗ `data-tagval` — только `data-tag`. `_tooltipDataFor()` (ui.js) ищёт
  именно `dataset.tagval` для подстановки числа в "Incarnation N" — без него откатывался на
  общее "Incarnation" без цифры. `render.js` (сама игра) всегда делал это правильно, три
  остальных места — нет. Поправлено во всех трёх на ту же `{base,val}`-логику.
- **Каталог — сортировка теперь разворачивается по повторному клику.** `catalogFilters.dir`
  (±1) — клик по УЖЕ активной кнопке сортировки не пересортировывает тем же порядком, а
  разворачивает направление. Подпись кнопки переключается между вариантами (`data-label1`/
  `data-label2` в index.html, напр. `Cost ↑`/`Cost ↓`) — видно, в какую сторону сейчас сортирует.
- **Новый тег `enter_heal:N`** — зеркало `enter_aoe`, тот же тайминг `on_enter`, но лечит
  вместо вредит. Переиспользует ГОТОВЫЙ execution-путь `hp_add`/`target:'all'` (раньше
  доступный только World-картам) — лечит только раненых союзников своей стороны, клампится
  по maxHp, ничего не делает при полном HP без доп. условий в коде. См. Tag System выше.
  - Протестирован на 3 рядовых (test-теги, не финальный баланс): TRAVELER #1 (cost 2→3,
    hp 3→5), TRAVELER #583 (hp 4→3), TRAVELER #11 (hp 5→4) — изначально `enter_heal:1`,
    ПОЗЖЕ ТЕМ ЖЕ ДНЁМ поднят автором до `enter_heal:2` на всех трёх (текст `ab` тоже обновлён).
  - Закреплён за трейтом **Бамбук** (World-трейт, был в списке "без назначения") —
    `enter_heal:2`, цена 0.33 эссенции (см. Essence pricing shop выше).
- **Новый тег `enter_draw:N`** — тем же вечером, зеркало `enter_heal`/`enter_aoe`: существо
  при входе даёт владельцу N карт добора. Переиспользует ГОТОВЫЙ execution-путь эффекта
  `draw` (просто добавлен `on_enter` в список таймингов, которые резолвятся сразу, наравне с
  `instant`/`on_attack`) — без анимации/звука прилёта, как и все остальные "добор вне начала
  хода" источники (Hunger/Altar/spell draw/Ryvlen). См. Tag System выше.
  - Протестирован на TRAVELER #6 (cost 2→3, hp 3→4, `enter_draw:1`).
  - Закреплён за трейтом **Долина / Valley** (World-трейт, был в списке "без назначения") —
    `enter_draw:1`, цена 0.66 эссенции (см. Essence pricing shop выше). ⚠️ Тёзка уже
    существующей уникальной World-карты VALLEY (`t_w1`, `draw:1` on-turn) — та карта не
    трогалась, это просто трейт с похожей темой добора на РЯДОВЫХ травелерах; если название
    смущает (два "Valley" в разных смыслах) — стоит переименовать трейт при случае.
- **Новый спелл — GUST (Tea) / REVERSE (Jeet)**, cost 1, `1_windy.png`/`1_revers.png`,
  3 копии в стартовой Classic-колоде каждой фракции (и в Rush-пуле деккбилдера — оба
  автоматически, просто добавлены ключи `t_sp5`/`j_sp5` в список спеллов `deck.js`). Новый
  тег `spell_bounce_target` — точечный баунс ("bounce на минималках"): в отличие от полного
  `bounce` (UNSEEN — все карты с поля обеих сторон), тут ОДНА выбранная карта, и цель может
  быть как своя, так и вражеская (владелец карты определяет, в чью руку она вернётся, не
  обязательно в руку кастера). Пятый targeted-spell phase (`spellBounceTarget`) по образцу
  существующих четырёх — `doPlay()`→пауза→`onClick()`→резолвер `doSpellBounceTarget()`
  (game.js), с тем же паттерном задержки/анимации, что у полного bounce (звук `wind_card`,
  карта пропадает с поля сразу, в руку — через 400мс). AI не зависает: приоритет — баунснуть
  сильнейшее существо человека, фоллбэк — своё самое дешёвое. См. Targeted Spell System выше.
- **`GAME_VERSION` — история дня**: сначала было поднято до `1.1` вместе с ребалансом трёх
  травелеров, автор попросил откатить (версию не поднимать без явного запроса) — откачено на
  `1.0`, правило записано в Session Workflow выше. Позже ТЕМ ЖЕ ДНЁМ автор сам явно попросил
  поднять версию — до `1.01` (не `1.1`), с этим ПОСЛЕДНИМ явным запросом версия и стоит на
  момент записи этого файла.
- **Закрыты последние 2 незакреплённых World-трейта — Схема и Solana World.**
  - **`taunt_break`** (новый тег, on_attack) — на атаке подавляет Provoke у цели
    (`target.provokeBroken=true`), если он у неё есть (иначе тихий no-op). Снимается ТЕМ ЖЕ
    путём, что и `feared` в `endTurn()` (конец следующего хода ВЛАДЕЛЬЦА цели) — по прямому
    подтверждению автора: "к следующему ходу противника [атаковавшего], карта уже
    реабилитируется". Учитывается в `getTargetableCards()` (game.js) — Provoke с
    `provokeBroken=true` больше не форсирует атаку на себя. Рендер: иконка-способность
    `ico_tb.png` добавлена во ВСЕ 5 мест `TAG_ICONS`/`DB_TAG_ICONS` (render.js×2,
    catalog.js×2, deckbuilder.js×1) + `TAG_TOOLTIPS` (ui.js); на поле — третий слот
    мини-значка над картой (`.card-small-tauntbroken`, по центру, между уже существующими
    `.card-small-feared`/`.card-small-burning` на 35%/65%); строка в статус-панели зумленной
    карты (`_cardStatusEntries()`). Протестирован на TRAVELER #26/#550 — закреплён за
    трейтом **Схема**, цена 0.66.
  - **`shield`** (новый тег, "Solana Shield") — одноразовый абсорб ПЕРВОГО удара любого типа
    (физика/магия/контрудар), проверяется в самом начале `dmgCard()` (game.js), ДО Ward и
    Брони. По прямому запросу автора — строже Брони: блокирует не только HP-урон, но и ЛЮБОЙ
    сопутствующий эффект того же удара (fear/burn/taunt_break) через транзитный флаг
    `card._shieldBlockedThisHit` (сбрасывается на каждый вызов `dmgCard()`, читается
    `fear`/`burn`/`taunt_break` в abilities.js в тот же синхронный тик). НЕ перехватывает
    burn-тик (тот в принципе идёт мимо `dmgCard()`, та же экземпция, что уже у Брони).
    `shieldConsumed` — одноразовость НА ТЕКУЩЕЕ пребывание на поле, сбрасывается в
    `resetC()`/`reviveCard()` (при возврате в руку/колоду или воскрешении щит "перезаряжается"
    заново — по флейвору "активируется при входе"). Рендер: ТОЛЬКО на поле (`mkSmallEl()`) —
    вместо числа HP в `.card-small-hp-box` показывается `img/solana_shield.png`, пока щит не
    потрачен; в руке/каталоге/деккбилдере иконка НЕ подменяется, только текст "Solana Shield"
    в `ab`. Строка в статус-панели зумленной карты, пока щит активен. Протестирован на
    TRAVELER #704 — закреплён за трейтом **Solana World** (не путать с уже занятым
    Mood:Солана→`ward`, другая механика), цена 0.66.
  - ⚠️ **Стоимость/статы TRAVELER #26/#550/#704 НЕ менялись** — по правилу "доп.тег → +1 cost
    и +1 к профильному стату" (см. Essence pricing shop) это, строго говоря, стоило бы
    пересчитать, но автор в этот раз не давал конкретных цифр (в отличие от раунда
    enter_heal/enter_draw, где цифры были явно продиктованы) — оставлено как есть до
    отдельного запроса, чтобы не повторить историю с самовольным `GAME_VERSION`.
  - **Позже тем же днём — ребаланс по факту, цифры продиктованы:** TRAVELER #26 cost 2→3
    (hp 2→3, статлайн 3/2), TRAVELER #704 cost 3→4 (hp 3→4, статлайн 4/2), TRAVELER #550 —
    снят `armor:1` (не нужен на этом теле). Баги найдены и исправлены при первом тесте: мишень
    поднята/анимация мигания (см. отдельный пункт выше), а сам taunt_break/shield изначально
    казались нерабочими — репорт автора оказался ложной тревогой (стейл-кэш/неполный набор
    файлов), логика при повторной сверке (и при живом тесте автора) оказалась верной с первого
    раза — оставлено как есть, без изменений в логике.
- **Vampiric и Necrophage/"Erase"** (Незабываемый / Забудь всё) — и заодно **полный пересмотр
  порядка резолва в `doAttack()`** (game.js), меняющий ВСЕ атаки в игре, не только эти два
  тега (автор запросил явно, после того как через рассуждение о vampiric/necrophage сам нашёл
  дыру в старой логике):
  - **Было:** `dmgCard(target)` → контрудар (проверял только `feared`/`exhausted`, НЕ
    проверял `target.hp>0`!) → `triggerAbilities(att,'on_attack',...)` в самом конце. То есть
    мёртвая цель ФИЗИЧЕСКИ всё равно наносила контрудар — баг, вскрывшийся именно через
    вопрос "если некрофаг съел труп, откуда тогда прилетает ответка?".
  - **Стало:** `dmgCard(target)` → резолв `on_attack` (fear/burn/taunt_break/vampiric) СРАЗУ →
    если удар был смертельным (`target.hp<=0`) — резолв `on_kill` (necrophage) → контрудар
    ТОЛЬКО если `target.hp>0` (НОВАЯ проверка) И не feared/exhausted/invisible-атакующий.
  - Сознательный балансный сдвиг (автор принял с пониманием): раньше смертельный удар всё
    равно гарантированно возвращал урон атакующему — теперь чистый килл проходит без ответки.
    Слегка усиливает высокий ATK/burst за счёт гарантированных прежде розменов.
  - `realDmgDealt` (новое) — снимок `target.hp` до/после `dmgCard()`, а не номинальный ATK:
    Броня/Solana Shield уже "съели" часть — та часть не считается "снятой кровью" для vampiric
    (по прямому запросу автора: "сколько именно хп снято", не номинальный урон атаки).
  - **`vampiric`** — лечит на `realDmgDealt` (клампится по своей нехватке HP), работает
    независимо от того, убил удар цель или нет (лайфстилу килл не нужен, в отличие от
    necrophage). НЕ реагирует на контратаки (тот же скоуп, что у fear/burn/taunt_break —
    только собственная инициированная атака).
  - **`necrophage`** (текст карты — **"Erase"**, само название тега в коде осталось техническим)
    — оживил заодно МЁРТВУЮ инфраструктуру: `on_kill_base` был зарегистрирован в
    `getAbilities()` с 2026-07-10+, но `triggerAbilities(...,'on_kill',...)` НИКТО никогда не
    вызывал — теперь вызывается в `doAttack()` при смертельном ударе, `on_kill_base` тоже
    ожил бесплатно (хотя пока ни одна карта его не носит). Necrophage: труп жертвы стирается
    из кладбища ЕГО владельца прямо в войд (Инкарнация, если тикала — обрывается), сам
    Erase-обладатель лечится до полного HP, снимает с себя ожог. Скоуп — только килл ПРЯМОЙ
    атакой, Shard/Bolt/AOE это не подхватывают (свой урон, мимо `doAttack()`).
  - Рендер обоих — новые постоянные иконки-способности (`ico_vamp.png`/`ico_erase.png`,
    автор кладёт в репо сам) добавлены во все 5 мест TAG_ICONS/DB_TAG_ICONS + TAG_TOOLTIPS
    (ui.js) + preload (ui.js), тем же паттерном, что taunt_break/incarnation до этого.
  - Тестовые карты: **TRAVELER #734** (Tea, Szarg gtype:szg, cost 3, 4/3) получил `necrophage`
    (5-й член Szarg-группы у Tea); **TRAVELER #775** (Jeet, Dreegan gtype:drg, cost 4, 5/3,
    provoke) получил `vampiric` (5-й член Dreegan-группы у Jeet) — оба архетипа уже были
    симметрично представлены на обеих фракциях, просто добавлен 5-й рядовой в уже
    существующую группу. Закреплены за трейтами **Незабываемый** (`vampiric`, 0.66) и
    **Забудь всё** (`necrophage`/"Erase", 0.66) — обе таблицы/списки в Essence pricing shop
    выше обновлены.
  - ⚠️ **Важный технический нюанс, найденный при добавлении** — просто дописать новую карту
    в `data.js` (DEFS) НЕДОСТАТОЧНО, чтобы она попала в стартовую Classic-колоду ИЛИ в
    Rush-пул деккбилдера. `_composeDeckList()` (`deck.js`) держит СВОИ ОТДЕЛЬНЫЕ хардкоженные
    массивы ключей по архетипам (`szarg`/`orb`/`drg`/`umb`/`mch`/`xui`, по 4 ключа на
    фракцию — ровно `DECK_CONFIGS.classic.groupSize`), и `.slice(0, cfg.groupSize)` берёт
    только ПЕРВЫЕ N из них. Новая карта, не вписанная в нужный массив, существовала бы только
    в каталоге (тот, похоже, просто перебирает весь DEFS), но была бы НЕДОСТИЖИМА ни в одной
    реальной колоде. Пришлось: (1) дописать `t_trvl734_w`/`j_trvl775_w` в конец соответствующих
    массивов (`szarg`/`drg`), (2) поднять `groupSize: 4→5` в `DECK_CONFIGS.classic` — безопасно
    для остальных 10 групп-массивов (5 архетипов × 2 фракции), которые всё ещё ровно по 4:
    `.slice(0,5)` на 4-элементном массиве просто вернёт все 4, no-op. **На будущее: каждая
    НОВАЯ рядовая карта (не ребаланс существующей) требует правки в ДВУХ файлах — `data.js`
    (сама карта) И `deck.js` (массив архетипа + при необходимости `groupSize`), не только в
    первом.**
  - **Розовые облака** — пока НЕ закреплён, только предложена кандидатура (иммунитет к Fear,
    `fear_immune`) — ждёт подтверждения автора, реализация не начата.

-----

### Итог сессии 2026-07-15 — Rules Book (книга правил)

Полностью переделан экран правил из плоского скролла в постраничную книгу
(обложка + разворот, перелистывание кнопками, оглавление). Новый файл
`js/rules-book.js` + большой блок стилей в `styles.css` (`.rules-*`). **Полная
архитектура, все договорённости и формулы — см. секцию "Rules Book" выше**, здесь
только хронология и грабли:

- Первая версия — сразу не заработала: HTML-комментарий перед `#rulesScreen`
  закрыт `*/` (CSS-синтаксис) вместо `-->` — браузер молча съедал всю разметку
  экрана. Кнопка технически кликалась, экран физически не существовал в DOM.
  Нашёл и поправил только после того, как начал проверять живьём в headless
  Chromium (Playwright), а не полагаться на чтение кода — см. новое правило в
  Session Workflow выше.
- Несколько раундов точечных правок по месту (все проверены в headless-браузере
  перед отправкой): фон страниц `lore_pages.png` → `rules_pages.png` (потом cut
  42 → 54), перенос текста — с "весь параграф на след. страницу" на честную
  разбивку по словам, кнопка "домой" получила режим "к оглавлению" после 3
  первых страниц, навбокс — с серого плейсхолдера на реальный арт автора
  (`rules_btn_*`, `rules_navigation_box.png`), отступы навбокса подбирались
  дважды (1/2 → 1/4 высоты кнопки), border навбокса — с фиксированных px на
  `--rnavbtn/3`, заголовок обложки получил свой 9-slice бокс (`rules_title_bg.png`,
  border=`1em/3`), цветовая палитра текста внутри книги задана отдельно от
  остального UI, RUS/VN шрифты решены через `Press Start 2P`/`Be Vietnam Pro`
  (пиксельных шрифтов с вьетнамской диакритикой по сути не существует).
- Один раз по ошибке прислал автору zip вместо `.txt`-файлов — автор указал на
  нарушение правила из Session Workflow, поправлено сразу же.

**Заодно в этой же сессии — Landing Page (верхняя/нижняя группа композиции).**
**Полная архитектура, вся сетка 256 юнитов и таблица ассетов — см. новую секцию
"Landing Page" выше.** Кратко что изменилось: (1) нижняя группа (стол) стала на 20%
физически крупнее на десктопе, не тронув формулу верхней группы — через отдельную
переменную `--lw-bottom` + трюк с отрицательным `margin-top` (резервирует место в потоке
как раньше, но визуально "вылезает" вверх, съедая буфер); (2) на мобиле пофикшен реальный
баг (не то, что казалось на первый взгляд) — "верх стола не виден" был не про
`display:none`, а про то, что `.landing-top` мог схлопнуться меньше суммы своих
несжимаемых детей (потолок+стена) и стена переполняла свой бокс, перекрывая верх стола;
почин — фонарь скрыт на мобиле + `min-height` на `.landing-top`. Перед отправкой каждая
итерация проверена в headless-браузере с реальными числами (замер `getBoundingClientRect`
у всех слоёв на mobile/iPad/laptop/wide-laptop), не на глаз.

**Продолжение той же сессии — Rules Book доведена до содержательного контента (не только
каркас). По просьбе автора: анализ структуры (сравнение с Hearthstone/MTG) → полная
переработка содержания на русском (7 глав вместо плоского текста, недостающие термины
в глоссарий) → внедрение авторской правки → добавлена система внутритекстовых
кросс-ссылок (`data-gl` — см. "Rules Book" секцию, механизм описан там подробно) →
переведено на английский, потом на бразильский португальский, потом на вьетнамский —
все 4 языка теперь ОДНОЙ структуры (7 глав, 69 подпунктов, одинаковые 12 ссылок/иконок
у каждого). По ходу — россыпь мелких находок и правок: `border-image-repeat:repeat`→`round`
(тайлы бортика больше не обрезаются грубо), иконки режимов игры в разделе "Режимы игры"
переведены с кнопочных ассетов на выделенные `ico_*` (чётче читаются мелким размером),
цитата-плейсхолдер получила реальный текст ("Свечи в космосе" + переводы) и переехала в
нижний правый угол, 4 случайных варианта фона страницы (`rules_pages.png`/`1`/`2`/`3`,
стабильны для конкретной страницы — не дёргаются при пролистывании туда-сюда), несколько
раундов подбора размера шрифта/иконок по языку и брейкпоинту (RUS/ENG/POR/VN, десктоп/
телефон — каждая комбинация в итоге настраивалась независимо через `--ricon-h`), заголовок
обложки VN уменьшен, боковые декор-плейсхолдеры боттом-бара (`zabor1/2`, `boltics`,
`screen1`, обе фракции) спрятаны на планшетах именно в портретной ориентации
(`min-width:601px and max-width:1024px and (orientation:portrait)`) — раньше показывались
там же, где и на десктопе, и не помещались.

**Заодно 3 находки прямо в геймплее (не в Rules Book), по скриншотам автора:**
- Крестик закрытия в деталях карты каталога рендерился системным шрифтом браузера, не
  пиксельным `MEK` — у `.card-detail-close` просто не было `font-family` в CSS. Сначала
  почина́л шрифт, но автор решил проще — кнопка вообще не нужна, раз клик по фону и так
  закрывает попап (`onclick` уже стоял на самом оверлее) — кнопку убрали совсем, в обоих
  местах, где она дублировалась (`catalog.js`).
- Подсказка "CHOOSE TARGET / CLICK HERE TO CANCEL" (`#targetPromptOverlay`) не показывалась
  для точечного заклинания-баунса (`spellBounceTarget` — тег `spell_bounce_target`, добавлен
  ещё 2026-07-14, но в список фаз для оверлея не попал) — и заодно для `healTarget`, который
  по своему же комментарию в коде ДОЛЖЕН был там быть, но так и не был дописан. Оба добавлены
  в `render.js`.
- Точечный бафф (`spell_buff_temp`, ARCHIVE) не давал выбрать спящих/уставших своих же
  существ целью — по факту не было причины это блокировать (баффнуть своё существо можно
  независимо от того, действовало оно уже или нет). Ограничение дублировалось в ТРЁХ местах
  одновременно (роутинг клика в `game.js`, подсветка `.healable`/`.aim-heal` в `render.js`,
  и отдельная защитная проверка внутри `doSpellBuffTarget()` — если поправить не все три,
  получилось бы либо "не подсвечивается, но кликается", либо "подсвечивается, но тихо
  игнорируется") — снял ограничение везде разом. `feared`-ограничение специально оставлено
  (не входило в просьбу).
- В каталоге фильтр типа карт переименован "Creatures"→"Travelers" (соответствует
  терминологии остальной игры/Rules Book).

-----

### Итог сессии 2026-07-16 — капитальный ребаланс + лимит поля + версия 1.02

Самая объёмная сессия по балансу за всё время. `GAME_VERSION` поднят **1.01 → 1.02**
(явное разрешение автора получено). `AI_VERSION` поднят до `1.02.1` — ai.js реально
пересмотрен под все изменения ниже, не формальная синхронизация номера.

**Rules Book:**
- `rules_card.png`/`rules_battle.png` — вторая иллюстрация вставлена под "The Board"/"Поле",
  тем же классом `.rules-full-art`, что и первая (Карта) — переиспользуется вся уже готовая
  инфраструктура (flex:1 + принудительный page-break сразу после атомарной картинки).
- "3. Field"→"Battleground" (и по смыслу на все 4 языка — RUS "Поле боя", POR "Campo de
  Batalha", VN "Sân Đấu" — везде специально ДРУГОЕ слово, чем в заголовке самой главы,
  иначе схлопывается само с собой), "9. Void"→просто "Void" (без номера), "10. Battle
  Log"→"9. Battle Log" (перенумерация вслед за пропавшим номером у Void).
- Orphan-heading fix в пагинации (`rulesPaginate()`) — `h3`, который влезает внизу
  страницы, но не оставляет места ни на один токен своего `<p>` следом, теперь
  принудительно переносится на чистую страницу вместе с телом (lookahead на 1 токен
  вперёд перед принятием решения).
- `h2` — `text-align:center` + размер `+20%` (1.7em→2.04em), одинаково для всех языков
  (масштабируется от per-language базового font-size, отдельных правок не нужно).

**UI-полировка:**
- Крестики закрытия (кладбище/лог) — с фиксированных `30px` на `max(vh,vw)`-формулу
  (сначала ×1.5 от заголовка панели, потом по правке автора — ×1.2).
- Иконки статусов на карте (горение/страх/слом брони) — получили `z-index:4`, раньше
  прятались под `card-type-dot`(2)/`card-tag-icons`(3) при геометрическом наложении.
- Свечение базы (`.player-name-box`) — `z-index:2`, чтобы `box-shadow`-glow всегда рисовался
  поверх ОБОИХ соседних стат-боксов (ess/hp), а не только того, что раньше в DOM.
- Бургер-меню — три отдельных бага одним заходом: (1) открытое X-состояние
  `translateY(7px)` был фикс-пиксель от старой вёрстки, ломался на новом (часто меньшем)
  размере кнопки — заменён на `translateY(200%)` (относительно своей же высоты, всегда
  сходится в центр); (2) тап-зона на коротких landscape-экранах падала до ~17px — поднят
  пол кнопки до `30px` + `.header` получил свой минимум высоты `40px`, чтобы кнопка
  помещалась целиком, не обрезаясь `#game`-контейнером сверху; (3) залипающий класс
  `.btn-waiting` — `updateEndTurnBtn()` брал кнопку по `G.humanFaction` (`null` в хотсите),
  поэтому не мог СНЯТЬ класс, оставшийся от предыдущего vsAI-матча на том же переиспользуемом
  DOM-элементе — теперь обе кнопки чистятся безусловно на каждый рендер, потом ставится
  заново только где нужно.
- dat4ik.gif (`.bottom-bar-sensor`) — с фикс. `60px` на `7vh` (= высота самого бара, честный
  1:1) — раньше не совпадало с реальной высотой бара на разных экранах.

**Лимит поля — максимум 6 существ одновременно (новая механика):**
Применяется ВЕЗДЕ, где карта может оказаться на `cur.field`: обычный розыгрыш существа
(`doPlay()`), спеллы-воскрешения (`revive` — SHEN'S CALL/FORGETTING), автоматический
`raise` PHLEGMOR (пассивный on_turn-триггер — тихо не срабатывает, лог-хинт вместо ошибки),
и Инкарнация (`incarnTimer` в `endTurn()` — при истечении таймера, если поля нет, таймер
держится на 0 и не идёт в минус, повторная проверка на КАЖДЫЙ следующий ход владельца, пока
не найдётся место). UI: попап Play-кнопки в превью карты уступает место индикатору
"Battleground is full" (тот же визуальный класс, что у "Not enough essence") — для существ И
для revive-спеллов. ИИ полностью в курсе лимита: `aiPickBestCard()`/`aiTryBurnCard()`
исключают существ и revive-спеллы из числа кандидатов при заполненном поле (без этого AI
зацикливался до 20 итераций/~11 сек, раз за разом выбирая ту же заблокированную карту).

**Боевая механика — три отдельных изменения, все взаимосвязаны:**
1. **Fear-контратака** — снимок `target.feared` берётся ДО резолва on_attack-эффектов
   этого удара, не после. Раньше fear-атакующий бил первым же ударом безнаказанно (fear
   успевал наложиться этим же ударом и тут же снимал его собственную контратаку).
2. **Контрудар возвращён на смертельные удары** (второй пересмотр — до этого с 13 июля было
   наоборот, "мёртвая цель не бьёт в ответ"). Причина отката — по прямому запросу автора:
   без ответки высокий ATK убивал вообще без всякого риска, "чит-кнопка". Теперь урон в бою
   всегда двусторонний, как в MTG/Hearthstone (одновременное разрешение, а не по очереди).
   Техническая тонкость: боевая сила цели (`targetCounterAtk`, включая squadAtkBonus/
   rageBonus) снимается СНИМКОМ до `dmgCard()`/`killCard()` — иначе `killCard()` успевает
   обнулить эти бонусы у мёртвой карты, и контрудар оказался бы слабее, чем цель реально
   имела в момент удара.
3. **necrophage/"Erase"** — получил свой отдельный timing `on_kill_survive` (не обычный
   `on_kill`) и резолвится теперь ПОСЛЕ контрудара, только если `target.hp<=0 && att.hp>0`
   (килл состоялся, атакующий пережил ответку). Раньше лечение до полного HP срабатывало ДО
   контрудара — существо с necrophage фактически не могло проиграть размен. Если атакующий
   сам погибает от контрудара — necrophage не срабатывает вообще, труп остаётся в кладбище
   как обычно (не стирается, не даёт хила).

**Капитальный ребаланс статов рядовых и уников** — см. полностью переписанный раздел
"Essence pricing shop" выше, здесь только хронология решений:
1. Первый заход — плоский тир-бонус к HP (+0/+1/+2 по цене) поверх старой формулы, чтобы
   HP не стоило вдвое дешевле ATK без разбора. **Полностью суперсежен** следующим пунктом,
   упоминается тут только для истории решений.
2. По ходу нашли и почини ли реальный баг: TRAVELER #579 (Xuiqtr, `fear`) стоил cost4 при
   идентичном теле у трёх других карт той же ценовой категории тега за cost3 — единственная
   найденная строгая поломка во всей игре (доказано скрипт-аудитом на 50 картах).
3. **Полный пересчёт по архетипам** — вместо формулы "по очку", каждые Врата получили
   осмысленный HP:ATK skew (Szarg агрессор-стекло, Dreegan чистая стена, Xuiqtr
   боец-танк, Merchird между ними, Umbasir/Orbiton — намеренно урезанное тело ради
   способности), с общим бюджетом, растущим по цене. Уники подняты под новый "пол"
   (тело ≥ бюджет топового рядового той же цены).
4. Orbiton-хил поднят 1→2 (Squad 2→4) по прямому запросу автора — иначе плоский
   HP:ATK skew не отражал реальную силу способности после этого баффа.
5. Umbasir/Orbiton reskew 50:50→65:35 (в пользу HP) — раз хил/болт признаны более ценными,
   меньше бюджета остаётся на тело, конкретно на ATK.
6. **Финальный проход** — ATK для cost2+ рядовых стоит вдвое (halved на выходе: `new_atk =
   max(1, floor(atk/2))`, при упоре в пол ATK=1 забирается 1 HP вместо дальнейшего урезания).
   Cost1 карты и все Уники этот шаг не проходят (сознательно, по прямому запросу автора —
   не резать самое дешёвое, и не трогать уников, они и так были на своём месте).
   Каждый шаг проверялся строгим доминированием (0 нарушений на выходе).

**Другие механики:**
- Сжигание карты — больше НЕ поднимает `essMax` навсегда, только `+1 ess` на текущий ход
  (текст в Rules Book обновлён на всех 4 языках).
- 0-костовые "получить эссенцию" спеллы (SCHEME/BLACK MAGIC) — `ess_add:2`→`ess_add:1`.
- ИИ: аудит `AI_WEIGHTS.tagBonus` нашёл **5 тегов с нулевым весом** (`vampiric`,
  `necrophage`, `taunt_break`, `shield`, `draw` — существовали в движке, но не влияли на
  выбор карты вообще) — веса добавлены по аналогии с уже откалиброванными тегами. Отдельно:
  ИИ больше не баунсит СВОЁ существо просто "чтобы не потратить спелл впустую" —
  `aiWorthBouncingOwn()` разрешает это только если есть реальный смысл (on-enter эффект при
  повторном входе, или vanguard-редетаплой уже отходившего существа ради второй атаки).

**Логи:** проверено 13 партий (5 + 8 новых) — 0 ошибок/аномалий в движке за всё время, темп
партий 8-19 ходов (среднее ~12), без явного перекоса победителя. 14-карточное поле в одной
из старых игр — наглядное ретроактивное подтверждение, зачем вообще понадобился лимит поля.
Новые 8 логов сняты чуть РАНЬШЕ последних двух патчей (ATK-halving, 0-cost-спеллы) —
для честной проверки именно этих изменений нужен свежий батч после обновления сборки.

-----

### Итог сессии 2026-07-17 — pierce/trample-ребаланс, REAPER-нерф, 6 новых заклинаний, ИИ-фиксы, i18n

`GAME_VERSION`/`AI_VERSION` **НЕ подняты** — ни разу за сессию не запрошено явное разрешение
автора, несмотря на объём изменений ниже (включая core-механику pierce/Provoke). Держим тот же
принцип, что и раньше: версия — решение автора, не Клода. Стоит поднять при следующей сессии
после явного ОК.

**Разбор логов (5 файлов, `battle_log_178421-178427*`)** — та же методология, что в AI BALANCE
NOTES.md: pierce/mch доминирование по урону в базу подтвердилось **5-ю сессию подряд** (12/17,
20/31, 18/32 урона от mch в трёх из четырёх актуальных игр). REAPER (`on_any_death_base:1`,
ещё не переименован на тот момент) засветился 16 раз за одну игру, вылечив базу почти с нуля —
подтвердил находку от 07-09, рекомендация из той сессии так и не была реализована до сих пор.
Один лог оказался на устаревшей версии (1.01/1.0.2) — находки по ИИ из него помечены как менее
надёжные.

**REAPER — нерф.** Тег переименован `on_any_death_base`→`on_enemy_death_base` (data.js + текст
карты), `killCard()` (game.js) теперь проверяет `card.f!==f` — лечит базу только от смертей
ВРАЖЕСКИХ существ, свои размены больше не хилят. `abilities.js` (тултип-генератор) синхронно
переименован. `GAME_VERSION` не тронут.

**ИИ + Solana Shield — реальный баг найден и починен.** `killable`-расчёт в `aiActWithCreature()`
(ai.js) вообще не проверял `shieldConsumed` — ИИ мог "убить" щит-цель ударом, который щит
поглощал целиком (0 урона). Исправлено: щит-цель с непотраченным щитом больше не считается
killable. Отдельно — `getAiCreatureQueue()` теперь сортирует атакующих по возрастанию ATK, если
на поле противника есть непотраченный щит (слабый идёт первым, снимает щит, сильный добивает
следующим) — грубая эвристика на весь ход, не полноценный per-target план, но дешёвая и рабочая.

**Pierce/Provoke — двухэтапный редизайн, финально MTG-style trample.**
1. Первый заход: pierce перестал полностью игнорировать Provoke, стал резолвиться как обычная
   атака ПРОТИВ провок-цели (контрудар/on_attack/on_kill/броня/щит как обычно), а излишек урона
   сверх HP+Брони цели — перекидывался в базу (`doAttack()`, читает overkill с `target.hp`,
   намеренно уходящего в минус в `dmgCard()` на летальном ударе). При этом pierce ВСЁ ЕЩЁ мог
   свободно выбрать базу/любую карту при живом Provoke — только сам факт клика по базе с живым
   Provoke резолвился через трампл вместо прямого попадания.
2. По прямому запросу автора ("не по-дизайну") — Provoke сделан АБСОЛЮТНЫМ для всех:
   `getTargetableCards()`/`canAttackBase()` (game.js) и `aiCanHitBase()`/`forced` (ai.js)
   полностью лишились pierce-исключения. Trample переехал из `tryAttackBase()` прямо в
   `doAttack()` — единственное, что осталось у pierce, это сам перелив, происходящий
   автоматически при любой обычной атаке через forced-target (как и у всех остальных).
3. Тем же днём, по дополнительному запросу — trample расширен с "только провок-цели" на
   **любую** вражескую карту, которую атакует pierce (убрана проверка `targetHadProvoke`,
   единственное условие — `attHasPierce`). Обоснование автора: "логичнее", pierce-существо,
   ударившее случайного 1-HP блокера, тоже должно доливать остаток в базу, не только против
   танков.

Каждый из 3 шагов проверен живьём в headless Chromium (playwright) прямыми вызовами игровых
функций — не косвенно через UI-клики, а `doAttack()`/`tryAttackBase()`/`getTargetableCards()`
напрямую, с ручным конструированием состояния поля. Ни одной живой правки без такой проверки —
см. предупреждение в начале файла про "не полагаться на чтение кода глазами".

**Текст способности pierce** (тултип EN + правила на 4 языках) — после правки автора, убравшей
из формулировки любую отсылку к "раньше было по-другому" (никто кроме автора игру ещё не видел,
упоминание старого поведения — надуманная рамка для несуществующих "старых игроков"), текст
свёлся к простому факту: *"After attacking an enemy creature card, if it dies from the hit, any
remaining excess damage carries over to the enemy base."* — этот текст уже достаточно общий,
чтобы пережить шаг 3 (расширение trample) без повторной правки: он и так не упоминал Provoke.

**Английский в скобках — PT/VI.** 63 точечных правки в `index.html`: все 72 заголовка глоссария
(4 языка × одинаковый порядок) сверены построчно по позиции, английский термин в скобках
добавлен в PT и VI везде, где он уже был в RU (эталон автора). Заодно найдены и поправлены 2
несостыковки в самом RU: опечатка "Taunt breake"→"Taunt Break", "(Vampirism)"→"(Vampiric)" —
расходились с реальным именем тега в `ui.js`/`TAG_TOOLTIPS`, что напрямую било по цели всей
задачи (сопоставление с реальными английскими словами в игре).

**Хидер.** Сворачивающийся хидер (`toggleHeaderCollapsed()`) уже был закодирован раньше в этой
же сессии (не отмечен в бэклоге) — хендл стоял по центру вместо под бургер-кнопкой, как просил
автор. Подвинут (`right:5px`, ширина — та же calc-формула, что у `.hamburger-btn`), проверено
скриншотами headless-браузера на мобильной ширине.

**6 новых заклинаний** (из списка идей, накиданного в предыдущей сессии — см. чуть выше в файле
"давай начнём думать над введением большего числа заклинаний"):

|Карты (Tea/Jeet)|Cost|Тег|Что делает|
|---|---|---|---|
|RECKONING / SWARM CULL|4|`spell_aoe_count`|Урон всем вражеским существам = их числу на поле|
|FORGET-ME-NOT / MINDROT|4|`lose:2`|Соперник сбрасывает 2 случайные карты из руки|
|EXPOSE / UNMASK|2|`spell_provoke_break_target`|Снимает Provoke с цели до конца хода|
|BREACH / RUPTURE|4|`spell_dmg_trample_target:5`|5 урона по цели + перелив overkill в базу|
|STILLNESS / NIGHTMARE|5|`spell_fear_all`|Fear всем вражеским существам сразу|

Mass Sap (STILLNESS/NIGHTMARE) — механически НЕ буквальный "exhausted", как в исходном
брейнстроме: `exhausted` снимается в начале хода ВЛАДЕЛЬЦА (`endTurn()`), то есть эффект стёрся
бы ДО того, как противник вообще получил бы ход. Вместо этого переиспользован готовый движок
`feared` (снимается в правильный момент — конец хода владельца), просто применённый разом на
всё поле одним спеллом.

Все таргетируемые (EXPOSE/UNMASK, BREACH/RUPTURE) получили полную обвязку: попап-подсказка
(`#targetPromptOverlay`), подсветка карт-целей (`aim-target`), резолв для ИИ
(`aiResolvePendingSpellTarget`/`aiSpellHasValidTarget`), свой скоринг в `aiScoreCard()` вместо
плоского фолбэка — как и для трёх нетаргетируемых (RECKONING/SWARM CULL, FORGET-ME-NOT/MINDROT,
STILLNESS/NIGHTMARE), которые раньше падали бы в общий "flat baseline" и не отличали пустое
поле/руку соперника от полного. Все 6 добавлены в `_composeDeckList()` (deck.js) — автоматически
попадают и в Rush-пул, и в AI Rush-дек, отдельно трогать не пришлось.

**Живая проверка за сессию** — множественные прогоны playwright/headless Chromium: trample
(3 сценария), Solana Shield AI-фикс (killable + очередь), REAPER-нерф (свои/чужие смерти),
Board Purge (с целями/без), discard-спелл (полная/пустая рука), все 3 таргетируемых спелла
(human click flow + AI auto-resolve + edge cases типа клика мимо валидной цели/Ward-иммунитета),
AI-скоринг sanity-чек на все новые ветки — 0 JS page-ошибок ни на одном прогоне, включая полную
загрузку страницы и `vsai`-инициализацию.

-----

### Итог сессии 2026-07-17 (продолжение) — багфиксы, редизайн Tea-движка, Intercept, финальный баланс-проход

Прямое продолжение той же календарной сессии — версии всё ещё НЕ подняты (`GAME_VERSION`/
`AI_VERSION`), то же самое ожидание явного ОК от автора.

**Багфиксы (4 находки за один заход, все живые, не гипотетические):**
1. **Ранний звук у 3 новых спеллов** (BULWARK/CARAPACE, BREACH/RUPTURE, EXPOSE/UNMASK) —
   корень: общий фильтр `_isTargetedSpell()` (render.js), решающий играть ли `card_spell_atack`
   ДО выбора цели или отдать звук резолверу. Три новых тега (`spell_armor_temp`,
   `spell_dmg_trample_target`, `spell_provoke_break_target`) забыли туда вписать при заводе —
   одна правка чинит все три сразу.
2. **Реальный баг с базой**: после EXPOSE/UNMASK база оставалась недоступна ДАЖЕ ПОСЛЕ
   успешного снятия Provoke. Причина — `canAttackBase()`/`tryAttackBase()`/`aiCanHitBase()`
   проверяли только наличие тега `provoke`, не флаг `provokeBroken` (Provoke формально
   остаётся на карте, просто подавлен). Четвёртое такое же место найдено попутно —
   `aiTryUseBolt()`'s `forced`-расчёт, там же ещё и болтался устаревший pierce-эксепшн от
   ДО-абсолютной версии Provoke.
3. **Тайминг provokeBroken/taunt_break пересмотрен** — снятие переехало с конца хода
   ВЛАДЕЛЬЦА цели на НАЧАЛО (тот же `endTurn()`, просто другой из двух блоков). Обоснование
   автора: подавление Provoke имеет смысл только на ходу того, кто его снял (это он атакует
   мимо провокации) — держать debuff весь следующий ход цели было чистым мёртвым временем.
4. Попутно: анимация Board Purge (`HIT!` на каждую цель, как у JOURNEY) и статус "+X Armor
   from a spell" в зум-панели для BULWARK/CARAPACE.

**Аудит архетипов и Мира/Артефакта/Уников по фракциям** — сведена полная таблица: какой
gtype что даёт (Squad-бонус), у кого есть Мир/Артефакт/Уник-payoff под архетип, у кого нет.
Находки: Jeet имеет цельный сквозной движок HUNGER+ALTAR+PHLEGMOR+REAPER ("твои смерти —
ресурс"), Tea — нет ничего подобного, только разрозненный generic-value. Дыры по конкретным
архетипам: Orbiton-Jeet без heal-payoff, Dreegan-Tea без armor-payoff (на тот момент),
Umbasir-Tea без ping-payoff. 13 заклинаний на фракцию (после симметрии) разложены по ролям:
6 универсальных, 3 билд-эраунд, 4 контр-теч — пропорция признана здоровой.

**Редизайн Tea-движка — первая итерация (VALLEY/FAERON/THE BOOK):**
- **VALLEY**: `draw:1`/ход → `on_enemy_death:1` (новый тег, зеркало HUNGER с обратным
  условием — тянет карту от **вражеской** смерти, не своей). Реактивно, не пассивно — по
  прямому запросу автора, чтобы не было ощущения "карты сами прилетают бесплатно". Заодно
  прямая контра ALTAR: жертва своего существа теперь кормит руку соперника тоже.
- **FAERON**: `on_play_creature:1` → `on_own_death_base:1` (новый тег, "anti-REAPER" —
  лечит от СВОЕЙ смерти, а не вражеской). Позже в той же сессии переехал на ASLEX (см. ниже,
  финальный баланс-проход) — FAERON получил другую роль.
- **THE BOOK**: пассивный `ess_add:1`/ход → активный пингующий артефакт как SHARD, но урон
  масштабируется от числа горящих вражеских существ (`shard_burn_scale`, см. запись в общей
  таблице тегов выше). Технически дёшево: раз слот артефакта всего один, вся taretting-обвязка
  (фаза, подсветка, ИИ) переиспользовалась через тег `shard` бесплатно — понадобился только
  общий хелпер `shardBaseDmg()`.

**Симметрия колоды достроена до конца** — 2 карты добивали асимметрию, найденную аудитом:
**HEX** (Jeet, `spell_dmg_target:3`, зеркало JOURNEY) и **INSIGHT** (Tea, `draw:2`, зеркало
JEET WAVE). Теперь у каждой фракции ровно 13 уникальных заклинаний, 39 карт в колоде с
каждой стороны (13×3 копии) — полная механическая симметрия.

**Intercept — новый пассивный кейворд для всего архетипа Xuiqtr** (все 8 карт, обе фракции,
`provoke`→`intercept`). Третий защитный слой ПОСЛЕ Bushido и Provoke: если ни того ни
другого на поле нет, но есть непотраченный в этот ход Кситр — вражеская атака автоматически
подменяется на него на резолве, независимо от того, кого выбрал атакующий (выбор цели в UI
не меняется вообще — `getTargetableCards()` про Intercept не знает). Не тратится, если
атакующий и так выбрал Кситра напрямую. Раз за ход на карту, между несколькими Кситрами —
первый вышедший на поле первым перехватывает (порядок `field`-массива = порядок розыгрыша,
`.push()`-only). Пойман и починен один тонкий баг ещё на этапе кодинга: `tryAttackBase()`
при перехвате клика по базе вызывает `doAttack(att, interceptor)` НАПРЯМУЮ — собственная
redirect-ветка `doAttack()` в этом случае не срабатывает (цель и так уже = перехватчик),
поэтому `interceptUsed` пришлось явно взводить в `tryAttackBase()` до вызова, а не полагаться
на `doAttack()`. Статус-панель, тултип, правила на 4 языках — добавлены.

**Финальный баланс-проход дня — 6 пар антиподов на Legendary-тире, по чек-листу автора:**
- **REAPER ↔ ASLEX** — Aslex потерял `aura:maxhp:1` (Szarg остаётся без Legendary-поддержки
  вообще, автор подтвердил "ничего страшного пока" — вернётся, когда доберём карточный пул),
  получил `on_own_death_base:1` (переехал с FAERON).
- **FAERON ↔ SEEKER** — Faeron получил новый тег `thorns:2` ("Fire Shield") — анти-invisible
  пара: вместо неуязвимости (Seeker) — наказание атакующего (см. запись в таблице тегов).
- **RYVLEN ↔ TEANTIST** — `fear` переехал с Ryvlen на Seeker (см. ниже), делая пару чище:
  доброр-от-атаки/доброр-пассивно, invisible/ward, без лишнего третьего тега на одной из
  сторон. TEANTIST получил новый тег `stealth` ("Скрытность") — вторая анти-invisible пара:
  недостижим для атак существом, пока сам не атаковал; первая атака без контрудара; дальше
  тег ничего не делает (см. таблицу тегов).
- **ABYSSWALKER+NORRIA ↔ TUBORG+DOMUS** — решено дать Jeet чистую броню, Tea чистую атаку
  (шаг 1, автор оставляет за собой право поменять местами или сделать крест-накрест после
  тестов). Jeet уже был чистой бронёй (ничего трогать не пришлось). Tea: DOMUS —
  `world_maxhp:1` → `aura:atk:1`. Приятная находка: код для Мира с `aura:atk` уже был
  полностью готов (`applyAuras()`/`doWorld()` — строки `if(cur.world&&hasTag(cur.world,
  'aura:atk'))`) и просто ждал карту, которая на нём заведётся — ноль новых строк кода,
  только смена тега в data.js.
- **SHARD ↔ THE BOOK** — SHARD получил `shard_fear_scale` (зеркало Book, только по
  Feared-существам вместо горящих). Попутно найден и убран дубль-каунт: у SHARD раньше был
  отдельный бонус "+1 если ИМЕННО ЭТА цель Feared" — с новым каунтом по ВСЕМ зафиренным
  врагам это бы засчиталось дважды на выбранной цели. Убран, теперь SHARD и BOOK на
  идентичной формуле.

**Живая проверка** (второй заход дня) — 7 сценариев: Aslex-хил-от-своей-смерти, Faeron
больше НЕ хилит от смерти + Fire Shield реально жжёт атакующего, Domus даёт ATK-ауру
(переиспользуя существующий механизм), fear-swap Ryvlen/Seeker, полный жизненный цикл
Stealth (недостижим → первая атака без контрудара → достижим и с контрударом дальше),
Shard fear-scale без дубль-каунта — плюс отдельно 7 сценариев на Intercept (redirect,
не-тратится-при-прямом-выборе, раз-за-ход, Bushido выше приоритетом, ловит и клик по базе,
сброс в начале хода владельца, статус-панель) и 8 сценариев на сам bugfix-заход выше (звук,
баг с базой, тайминг provokeBroken). Везде 0 JS page-ошибок, включая финальные full-load +
`vsai`-инициализацию смоук-тесты.

-----

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
отклонили идею "у двух копий одной карты разные теги" (типа один экземпляр Traveler #775 с
vampiric, другой без) — автор подтвердил: каждая карта в DEFS уже устоявшийся, зафиксированный
шаблон (арт рисуется под финальный набор тегов, трейты не рандомятся при минте). Значит одна
NFT-копия ключа `t_trvl775_w` СТРОГО идентична другой такой же — модель "ключ → количество"
(как уже `_db.picks` сегодня) остаётся верной и для рядовых, и для уников, никакого
`{key: [instanceId, ...]}` не требуется. Единственное, что меняется под маркетплейс — откуда
берётся число `max` на ключ (сегодня хардкод из `getRushPool()`, тогда — реальное владение).

**Финальный свод лимитов для constructed-режима:**

| Тип карты | Лимит | Обоснование |
|---|---|---|
| Спелл | ≤3 копии одного ключа | как уже в Classic сегодня (`spellCopies:3`) |
| Рядовой путешественник | ≤3 копии одного ключа | НЕ 1 — иначе нет смысла покупать вторую/третью копию с маркета |
| Уникальный 1/1, Мир, Артефакт | ≤1 копия | по определению "уникальный" |
| Любой gtype (Врата) суммарно | ≤5 карт (независимо от того, сколько разных ключей внутри) | уже реализовано сегодня в `dbSetQty()`/`_dbGtypeCount()` (деккбилдер), пока непроверяемо на практике — см. запись выше |
| Колода | одна фракция, минимум `RUSH_MIN` (28) | уже так работает |

Потолок в 3 копии рядового — намеренно НЕ 1: без него один сильный рядовой при достатке
копий сам по себе упирался бы в лимит gtype (5) практически в одиночку, колода превращалась
бы не в "деку", а в "5 одинаковых карт". При потолке в 3 гарантированно нужно НЕ МЕНЕЕ 2 разных
карт одного архетипа, чтобы дойти до 5 — правило создаёт разнообразие ВНУТРИ архетипа, а не
только ограничивает копирование, и стимул купить конкретную сильную карту с маркета остаётся
(можно взять 3, а не 1).

**Технически всё ложится в ОДНУ и ту же точку, что уже есть сегодня** — `getRushPool()`
отдаёт `max` на ключ, `dbSetQty()` (деккбилдер) клэмпит по нему + по gtype-потолку. Разница
только в том, ОТКУДА берётся число `max`:
- Сегодня: хардкод (`1` для существ/уников/миров/артефактов, `3` для спеллов, из курируемого
  Classic-списка).
- Тогда: `Math.min(владеемых_копий, потолок_по_типу)`, где потолок = 3 для спелла/рядового,
  1 для уника/мира/артефакта.

Никакой структурной перестройки деккбилдера не понадобится — только источник данных для `max`.

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
  не соблюдает, но и не может их нарушить при текущих данных (см. запись про gtype-cap выше);
  как только копии рядовых станут возможны — этот пробел станет реальным, нужно будет доделать.

-----

## Roadmap — версии (реорганизовано 2026-07-07)

*По прямому запросу автора: механики/баланс сознательно НЕ трогали до 2026-07-16 —
копились списком (Version 1.01 ниже). 2026-07-16 автор явно попросил капитальный ребаланс
статов + лимит поля + несколько боевых механик — сделано, `GAME_VERSION` поднят до **1.02**
(см. "Итог сессии 2026-07-16" выше за полную хронологию). Крупные технически самостоятельные
блоки (Version 2.0) — по-прежнему не трогаем, пока не решим всё остальное.*

### Version 1.01 → 1.02 — контент и баланс (версия закреплена 2026-07-16)

- [x] Unseen: cost 0 — сделано, `data.js` подтверждён.
- [x] Случайный выбор кто ходит первым/вторым — момент решения ПЕРЕД муллиганом (сделано
  2026-07-10 — см. запись в журнале выше, "Случайный выбор первого хода — дайс-модалка").
  Реализовано через дайс-модалку (`orderRollModal`), не хардкод Tea-первый/Jeet-второй.
  Второй игрок получает 5 карт (обычная стартовая рука) + Unseen 6-й картой СРАЗУ ПОСЛЕ
  мулигана, не как часть колоды/мулиган-пула (уточнение с автором закрыто: "5 + Unseen"
  = 6 карт итого, не "5 включая Unseen").
- [x] Точечная активка-спелл на существе — сделано 2026-07-12 как тег `bolt:N` (Umbasir) —
  магический точечный урон по кнопке, бонус за Feared-цель, отдельные функции
  `doUmbBolt()`/`doBoltTarget()` в `game.js`. Цена и статы — см. "Essence pricing shop" выше.
- [x] Заклинание, дающее +урон/бафф НАВСЕГДА (не до конца хода) — решено 2026-07-12: ARCHIVE
  теперь "+2 ATK до конца БОЯ" (переживает ход соперника, сбрасывается в начале следующего
  хода ВЛАДЕЛЬЦА, не в конце текущего хода). Не отдельный тег — тот же `spell_buff_temp`,
  просто сброс `tempAtkBonus` перенесён из `endTurn()` (выходящий игрок) в блок начала хода
  (входящий игрок, рядом с армор-рефиллом).
- [x] ALTAR — базовый пейофф расширен 2026-07-10: теперь жертва даёт И карту, И эссенцию
  (было — только +1 эссенция). `doSacrifice_target()` (game.js) — `cur.hand.push(cur.deck.shift())`
  рядом с `cur.ess+=1`, no-op если колода уже пуста (просто без карты, эссенция всё равно
  начисляется). Текст `ab` карты (data.js) обновлён.
- [x] Механика «Броня» — реализовано 2026-07-10. Тег `armor:N`, отдельный пул `card.armor`
  поверх HP, но ТОЛЬКО против ФИЗИЧЕСКОГО урона (обычная атака + её контратака, оба вызова
  `dmgCard()` внутри `doAttack()`) — сначала вычитается из `armor`, и только остаток (если
  есть) — из HP. **Магический урон Броню полностью игнорирует** (правка того же дня, по
  прямому запросу автора: AOE-активка, Shard, направленное заклинание-урон — "удары магией,
  Броне не почём"; burn — туда же, свой отдельный путь мимо `dmgCard()`, но тот же принцип).
  Технически: `dmgCard(card,dmg,faction,bypassArmor)` — 4-й параметр, `true` у AOE-активки
  (`doUmbAsir()`/`doVardan()`), у Shard (`doShardTarget()`) и у targeted-spell урона
  (`doSpellDmgTarget()`); физическая атака/контратака (`doAttack()`) параметр не передают —
  там броня работает как обычно. **`enter_aoe` — ТОЖЕ БЕЗ bypassArmor** (правка в тот же день,
  по отдельному прямому запросу автора: "enter_aoe — не магический урон", в отличие от
  остальной AOE-семьи) — `case 'aoe':` в `abilities.js`, единственный реальный потребитель
  которого — `enter_aoe` (`triggerAbilities(card,'on_enter')` из `doCreature()`;
  `triggerAbilities(card,'active')` нигде не вызывается — активная AOE-кнопка обслуживается
  отдельным кодом в `doUmbAsir()`/`doVardan()`, не через этот диспетчер). Обновляется
  до полного N в начале хода ВЛАДЕЛЬЦА (`endTurn()`, тот же блок, что снимает exhausted
  владельцу), не хода соперника. Инициализация при входе на поле — `doCreature()`; сброс в 0
  при возврате карты в колоду/руку — `resetC()` (state.js). Тестово повешена на NABUNAGI
  (`t_nab`) и ABYSSWALKER (`j_mal`), `armor:2` — 2026-07-10, по прямому запросу автора (обе и
  так unique/tanky по роли — provoke/bushido и rage/AOE — Броня им подходит по духу).
  Видимость — 3 слоя без нового UI: текст в `ab` карты (уже рендерится как обычно), лог
  (enter/absorb/refill — 3 разных момента), и снапшот в экспортируемом battle log (JSON).
  **Визуальный рендер добавлен 2026-07-10** (см. отдельную запись в журнале сессии ниже) —
  `.card-armor-box`/`.card-small-armor-box`, автор предоставил `armor_bg.png`/`armor.png`.
- [x] Механика «Неукротимость» (`untamed`, working name, Anime pink Mood — см. Trait mapping) —
  реализовано 2026-07-10. Существо с этим тегом снимает `exhausted` уже в момент, когда
  заканчивается его СОБСТВЕННЫЙ ход (т.е. весь ход соперника оно уже НЕ уставшее — может дать
  ответку), а не как обычно — только к своему следующему ходу. Осознанный override только для
  этой карты, не меняет общее правило "уставшее существо не даёт ответку" для всех остальных
  (`endTurn()`, блок для ВЫХОДЯЩЕГО игрока). Тестово повешена на FAERON (`t_faeron`) и
  TUBORG (`t_tuborg`) — 2026-07-10, по прямому запросу автора. Иконка `ico_untamed.png`
  (автор нарисовал в тот же день) подключена тем же способом, что и fear/burn/etc — через
  `TAG_ICONS`/`TAG_TOOLTIPS` (render.js/ui.js), рендерится и на мини-, и на зумленной карте,
  с тултипом по наведению; текст способности в `ab` карт для этого убран — как у всех
  остальных иконок-тегов, дублировать не нужно. **Изначально не рендерилась в Каталоге** —
  у `TAG_ICONS`/`DB_TAG_ICONS` оказалось ЕЩЁ 3 независимые копии этой же карты тег→иконка,
  которые я забыл про в первом заходе: `catalog.js` (2 блока — обычный просмотр + модалка
  сравнения) и `deckbuilder.js` (пул Rush-дековыбора) — везде своя копия списка вместо общего
  источника (см. `render.js` — та же дублирующаяся структура была и там, отсюда и баг).
  Добавлен `untamed` во все 5 копий сразу. **Дальше — тестовая привязка ещё на 7 обычных
  (не unique) travelers**, 2026-07-10, по прямому запросу автора: `t_trvl25_w` (#25, Szarg),
  `t_trvl398_w` (#398, Orb), `t_trvl2_w` (#2, Umb), `t_trvl187_w` (#187, Xui), `j_trvl36_w`
  (#36, Dreegan), `j_trvl20_w` (#20, Umb), `j_trvl22_w` (#22, Merchird) — по одному
  представителю почти каждого Gate, чисто для теста механики на массовых картах, не
  финальное лорное решение (никакой Mood-привязки под капотом — просто добавлен тег).
  Заодно **у `t_trvl26_w` (#26) убран `aoe:1`** (и упоминание "Active: AOE 1 dmg." из
  `ab`) — тоже по прямому запросу автора, карта остаётся чисто `regen:1`/Squad Regen 2 без
  экстра-тега.
- [x] Потолок эссенции — ограничено 10 (`ESS_CAP` в `game.js`, капает во всех 3 местах роста
  essMax: сжигание карты, обычный прирост за ход, эффект `ess_max`).
- [x] Макс HP базы — поднято до 30 (`state.js`, `initP()`; `hpTier()` пересчитана
  пропорционально под новый масштаб — тиры на 24/18/12/6 вместо 20/15/10/5).
- [x] Протестить механику: если существо уставшее, то не должно давать “ответку” (встречный урон себе-в-атакующего),
  и карта подействовашая в свой ход, не перестает быть уставшей в течение хода противника.
- [x] Лимит поля — максимум 6 существ (2026-07-16, по прямому запросу автора) — см. "Итог
  сессии 2026-07-16" за полный список затронутых мест (revive-спеллы, PHLEGMOR raise,
  Инкарнация, UI, AI).
- [x] Контрудар возвращён на смертельные удары (второй пересмотр боевой механики,
  2026-07-16) — см. "Итог сессии 2026-07-16".
- [x] Капитальный ребаланс статов рядовых и уников по архетипам Врат (2026-07-16) — см.
  переписанный раздел "Essence pricing shop" выше целиком.

### Открытые дела с Клод:

- [x] Посмотреть принцип работу Erase абилки, один раз вроде чинили, но походу баг.
Когда атаковал своим Сзаргом со стиранием другую карту, цель была убита, но при этом нанесла
смертельную контратаку Сзаргу, хотя по замыслу после смертельной контратаки, Стирание должно было
полностью излечить Сзарга. Пересмотреть это;
- [x] с обновлением версии до 1.02, нужно пересмотреть Правила и свериться с механиками и обновить
то что нестыкуется;
- [x] узнать, почему даже с учетом наших файлов в предзагрузке, после одной или двух партий не закрывая страницу,
ассеты потом почему то начинают пропадать и подгружаться на ходу опять;
- [x] глянуть, почему правила на вьетнамском частично обрезаются снизу иногда (горизонтальный режим на айпаде,
в вертикальном такого нет, другие девайсы еще не тестил);
- [x] Окно правил для вертикальной версии айпада сделать чтоб показывались в одну страницу за раз;
- [x] сделать слабже крт эффект в баттл логе и мулиган окне;
- [x] В вертикальной айпад версии - в баттл логе крестик наезжает на заголовок;
- [x] добавить фон для надписей Недостаточно эссенции и Баттлграунд фул (а то не читаемо бывает когда много карт сзади);
- [x] добавить больше заклинаний для вариативности (брать идеи с конца этого файла) и начать балансировать Стартер,
сейчас как будто много существ приходит в руку и не хватает больше спеллов. А также уточнить чем там играет ИИ
во время Раш режима. В идеале собрать 4 готовые деки из того что есть, в случае не хватки колодообразующих тегов,
придумать с новыми 1/1, артефактами и Мирами. — **2026-07-17 (частично)**: 6 новых заклинаний добавлены и вкручены
в колоду (см. "Итог сессии 2026-07-17") — RECKONING/SWARM CULL (`spell_aoe_count`), FORGET-ME-NOT/MINDROT (`lose:2`),
EXPOSE/UNMASK (`spell_provoke_break_target`), BREACH/RUPTURE (`spell_dmg_trample_target:5`), STILLNESS/NIGHTMARE
(`spell_fear_all`). Балансировка Стартера и разбор Раш-режима — всё ещё не сделаны, чекбокс остаётся открытым.
- [x] после того как починили бургер кнопку (сделали по сути больше хидер), теперь хидер собственно слишком большой хах.
подумать, можно сделать скрывающийся и выезжающий хидер или что то такое. после того как добавили выезжающий хидер, надо кнопку скрывающую его подвинет правее под бурег кнопку и сделать такой же шириной как бургер кнопка — **2026-07-17**: сворачивающийся хидер (`toggleHeaderCollapsed()`, `.header.collapsed`) уже был закодирован ранее в этой же сессии; хендл (`.header-collapse-handle`) стоял по центру — подвинут под бургер-кнопку (`right:5px` = паддинг `.header` + margin бургер-кнопки, `width` — та же calc-формула, что у `.hamburger-btn`). Проверено скриншотами headless-браузера на мобильной ширине (390px), обычное и свёрнутое состояние.
- [x] карты в руке игрока, в горизонтальном режиме наезжают слегка на статусбар, хотя у нас вроде есть место в зоне руки чуть выше
чтобы поднять их.
- [x] Плегмор, возраждаясь от своего инкарнации, встает на поле и тут же поднимает за собой существо с
кладбища за счет своей абилки. по идеи в начале этого хода он только реснулся, значить на начала хода
его еще не было на поле чтобы применить абилку, такого не должно случаться
- [x] когда на поле у противника в один момент стояло только 3 инвизных существа - никого из них нельзя
было бить, кроме базы противника. подумать, это фича или баг, так как по идеи, правила то что союзники
стояли на поле было, но раз уж каждый из них инвизный, то в такой момент наверное можно бить любого.
также переосмыслить момент, что инвиз нам дает трейт Net, а такой трейт есть еще в невведенных дриганах
и кситрах, как это вообще может логично стыковаться с их провокацией хах. наверное за этот трейт надо
давать другой тег. например при входе в карты в игру - противник теряет карту.
- [x] в правилах на вьетнамском языке, нет английской расшифровке в скобках, как я давал для примера на русском языке. есть еще ньансы по исправлению правил, кое какие неточности по общим тексам всем языков — **2026-07-17**: добавлено на PT и VI (63 правки, все 72 заголовка глоссария сверены построчно по позиции с EN/RU — см. "Итог сессии 2026-07-17"). Заодно поправлены 2 несостыковки в самом RU (эталоне): опечатка "Taunt breake"→"Taunt Break", "(Vampirism)"→"(Vampiric)" — расходились с реальным именем тега в `ui.js`/`TAG_TOOLTIPS`.

### Список от 2026-07-17 (вечер): 

- [x] 398 — Орбитон с 7 HP и 1 бронёй, "чот дохуя HP", пересмотреть баланс статов Орбитонов
и Умбассиров. Карты слишком жирные относительно идеи, что они класс поддержки
  (возможно не только у #398 — сверить всю линейку архетипа по Essence pricing shop таблице).
  — **2026-07-18**: сделано, см. новый под-раздел "Orbiton/Umbasir — правило симметрии с
  Merchird" в Essence pricing shop выше — закреплена формула (ATK всегда 1, HP=cost/cost-1
  +1 за доп.тег, armor только Orbiton'у), пересчитаны все 7 карт-нарушителей.
- [x] Для артефактов, ожидающих действие (активный, но ещё не использован) — сменить
  фиолетовое свечение на белое.
- [ ] Пересмотреть баланс цен ВСЕХ заклинаний (не только новых за эту сессию — весь пул),
  их названия, и подумать над концептами для артов.
- [x] Добавить паддинги в текстовый бокс существ — текст сейчас наезжает на рамку карты.
- [x] Иконка Intercept (`ico_intercept.png`) нигде не рендерится на самой карте (тултип/
  правила уже есть текстом — см. "Итог сессии 2026-07-17 (продолжение)" — но самого значка
  на карте не видно).
- [x] TRAVELER #1015 (Dreegan, Jeet) — куда пропал Авангард? Был ли он вообще? Пересчитать
  стоимость/статы — это путешественник с трейтом Песков (Sands), сверить с Essence pricing
  shop таблицей на предмет соответствия текущей формуле по Вратам.
- [x] Когда существо теряет Броню — добавить всплывающую циферку "-X Armor" (`showFloat()`),
  сейчас такого фидбека нет вообще (только когда броня добавляется/восполняется).
- [x] Добавить иконки + тултипы для `stealth` ("Скрытность") и `thorns` ("Огненный Щит") —
  тексты в `TAG_TOOLTIPS` (ui.js) уже есть (см. "Итог сессии 2026-07-17 (продолжение)"), но
  своих `.png`-иконок ещё нет (`TAG_ICONS`), и в `index.html` (Rules Book, все 4 языка) эти
  два тега пока не добавлены вообще — Provoke/Intercept уже добавлены в том же заходе, эти
  два — ещё нет.
- [x] Solana Shield (`shield` тег) — сейчас единственный тег, у которого нет иконки-на-карте/
  тултипа по общей системе `TAG_ICONS`/`TAG_TOOLTIPS` (см. описание в таблице тегов выше —
  "hand/catalog/deckbuilder show no icon swap — just the ab text mentions Solana Shield").
  Убрать текстовое упоминание из `ab:` карт, сделать полноценный рендер как у всех
  остальных тегов (иконка + тултип), вместо текущего кастомного HP-box-swap-only подхода.
- [x] Новый спелл — "поджечь все карты" (аналог `spell_fear_all`, но burn вместо fear),
  сделать ТОЛЬКО для Tea (продолжает тему "Tea = burn-фракция, Jeet = fear-фракция" из
  первой половины этой же сессии). Взамен — забрать у Tea `spell_fear_all` (STILLNESS)
  — по факту односторонний свап, не симметричная пара: у Jeet останется NIGHTMARE
  (`spell_fear_all`), у Tea появится новый burn-аналог вместо STILLNESS. Уточнить у автора
  конкретное значение горения (сколько ходов/сколько урона) и имя карты перед кодом. (прим.
  автора: просто как обычный дебаф горения повешать на все карты, будут гореть тик 1 каждый ход
  до смерти, имя пока придумай сам)
- [ ] Решить что с Фонтаном как антипод Алтаря
- [x] для скрытности и невидимости, помимо тегов делать еще карты полупрозрачными (у скрытности
  убирать этот эффект после 1й атаки)
- [ ] в правилах для Return дописать что это обновляет все способности (проверить также чтобы
   инкарнация тоже после второго выхода смогла как бы второй раз отработать, учитывая что существо
не умерло второй раз, а вернулось в руку и значить обновило все свои способности. а то у меня был
уже случай когда карта после реса была на поле, потом вернулась в руку и потом выйдя опять уже
умерла без обновленной инкарнациии)
- [ ] да и в целом отредактировать правильно кардинально
- [x] обьяснить ИИ, что нет смысла бить его картой 1/1 существо с броней 1, чтобы тупо получить ответку и умереть, если только у него нет других карт на поле, чтобы было резонно снять эту броню или идея зачем то умереть для тиггера on death
- [x] обьяснить ИИ, что умбасиром лучше использовать болт для нанесения 1 урона, чем бить своей атакой 1 (если она не больше, там еще будет логично), чтобы не получать ответку
- [x] Проверить Кситра -уставшего, он должен перенаправлять атаку на себя, но не давать контратаку
- [x] в текстах карт уменьшить расстояние между слов
- [ ] Окончательно сбалансировать деки и подготовить два стартера для обеих фракций, раскидав заклинания
так чтобы подходило под архетипы колод, а также рядовых Путешественников с их тегами (Поджоги Чаю, Фиры Джит.
может даже распределить теги по фракциям также, чтоб Бамбук был у Чая, а Net был только у Джит например).
Если кого то не будет хватать для баланса, подвести новых путешественников. А также сбалансировать общие теги,
типа Солана Щита и добавить тех у кого трейты еще не использованы (Свеча, Солана муд)
- [ ] поднять версию до 1.03 когда закончим список и еще раз перепроверить все ли умеет и понимает ИИ

-----

### Version 2.0 — большие блоки, не возвращаться пока

- [ ] Тренировочная игра (демо) — заскриптованная обучающая партия с комментариями и
  анимациями для новичков. Скриптовый движок поверх game.js + контент сценария.
- [ ] Онлайн-мультиплеер
- [ ] Web3 / NFT-интеграция (проверка владения NFT)
- [ ] Расширение состава существ на поле (кроме Путешественников и 1/1) — БЛОКИРОВАНО лором:
  сначала обоснование из Архива (см. Lore-раздел выше), потом дизайн, потом код.
- [ ] концепт Шен (маскот) — добавлено 2026-07-07. Идея с самим маскотом и
всплывающими подсказками.

-----

## Backlog — Art assets (systematized 2026-07-06)


**Дизайнерские решения:*
- надо бы отображать счетчик деки и кладбища противника, но где?
- появление Мира и Артефакта достаточно ли заметно или надо как то привлекать внимание лучше?
- подсказки по типу как при наведение курсора, но на телефоне, как сделать, чтоб не через нажатие пальцем?
- нужен ли таймер?
- когда кончаются карты в колоде, нужен ли штраф за это и возможность проигрыша через Х ходов?
- может добавить Правила когда открываешь бургер меню, но чтоб потом возвращало в игру. либо сделать походную
версию (типа книга но без фона стола)
- подумать о дизайне кнопка: ударить всеми разом базу
  
**База Tea:** 
- обновить dat4ik.gif;
- еще 2-3 плейсхолдера в боттом бар;
- перерисовать кнопки боттом бара;
- больше плейсхолдеров в статусбар;
- 5 фонов статус бара обновить;
- 5 степеней повреждения для базы.

**База Jeet:**
- весь декор для статусбара и боттом бара;
- перерисовать кнопки боттом бара;
- модалка кладбища своя;
- 5 фонов статус бара обновить;
- 5 степеней повреждения базы;
- обновить pcard ассет;
- обновить фон для руки и будучи противников + столбы;
- свой баттл лог?
- своя модалка?
- свои игровые кнопки для карты?

**Лендинг:** 
- Кнопка-книга для Правил;
- Кнопки для Музыки и Эффектов;
- Все остальные плейсхолдеры вокруг;
- Решить с ссылками и возможно окно аля Кредитс.

**Карты:**
- перерисовать еще 7 1/1;
- перерисовать спеллы;
- перерисовать артефакты;
- для рядовых знакончить фон Облака, Оптик доп и коллаб трейты;
- каждое Врата (Gate) визуально на карте придумать как обозначить.

**Анимации:** 
- Отряд;
- Наложение страха;
- Обновить иконку Поджог на гиф;
- Болт/Шард;
- Жертва;
- Очищение;
- Таунт-брейк?
- Пробуждение спелл?

**Декбилдер окно:** 
- декор плейсхолдеры;
- подумать над дизайном хидера и особенно сортировки еще.

**Доп. Интерфейс:** 
- Пикселизировать кнопку свернуть/развернуть и бургер кнопку
- фонарь Low-HP;
- Интерактивный декор по игре раскидать, чтоб звуки от муры использовать.

**Обновить ассеты:**
- иконка-книга Архив;
- плейсхолдер книги;
- больше уникальных страниц для Правил;
- в Каталоге больше деталей в хидере;
- текстура на фон у Лора и Каталога.

-----

## Sound checklist — от Муры, файлы на руках (записано 2026-07-06, обновлено 2026-07-09)

*Файлы уже у автора. Вся пачка из этого чеклиста подключена (последнее — 2026-07-08, автор
подтвердил 2026-07-09 “вчера уже все подключили”). Заодно обновлены на более свежие версии от
Муры: `card_navigation_cursor` (вместо старого `Navigation_Cursor`), `card_burn` (вместо
`Burn_Card`), `yellow_buttom` (вместо `yellow_buttom_play_endturn_menu_gravyard_loop`),
`card_select_traveler` (вместо `Click_Cursor` на превью карты в руке), и фоновая музыка
`main_theme.mp3` (вместо `Main_theme.mp3` — Мура что-то подкрутил в свежей версии).*

- [x] Кнопка кладбища — `graveyard.wav`, `openGraveModal()` в game.js
- [x] Кнопка лога (скрин монитор) — `screen_monitor.wav`, только при ОТКРЫТИИ
  (`toggleLog()` в ui.js теперь сам решает open/close звук)
- [x] Воскрешение — `rest.wav`, повешен на `revive` (полное воскрешение) И на `raise`
  (подъём из кладбища скиллом Плегмора) в abilities.js
- [x] Хил — `heal.wav`, повешен на: реген (`hp_add self`), активный хил существа/спелла
  (`hp_add ctx.target` + healTarget-клик в game.js), фонтан-тип (`hp_add target:'all'`
  и ранее беззвучная fallback-ветка), и хил базы (`hp_base`)
- [x] Баф (сделать громче) — файл `baf.wav` не менялся, громкость не трогал — отдельная
  правка `SFX_VOLUME`/индивидуальной громкости, скажи если нужно сделать сейчас
- [x] Дебаф (погромче) — аналогично, громкость не трогал
- [x] Звук «тык» (чуть-чуть громче) — не трогал громкость
- [x] Новая карта из колоды в руку — `new_card.wav`, играет на КАЖДУЮ карту в
  `_flyCardFromDeck()` (render.js), уже стаггерится вместе с анимацией вылета карт
  (по 90мс на карту), так что 2-3 карты подряд дадут 2-3 отдельных звука
- [x] Сдувание карты с поля обратно в руку (bounce) — `wind_card.wav`, повешен на эффект
  `bounce` в abilities.js, синхронизирован с моментом фактического появления карт в руке
  (после 400мс fade)
- [x] Спец-звук удара по базе — `base_atack.wav`, только в `tryAttackBase()`, обычные
  атаки существ по существам остались на `card_atack`
- [x] ~Победа — фанфары при появлении win-модалки~ — закрыто как отдельный пункт, см.
  ниже: автор просит его пересобрать в составе новой тройки, файла по-прежнему нет.
- [x] Превью карты в руке (клик чтобы увидеть крупную версию) — `card_select_traveler.wav`
  вместо `Click_Cursor.wav`
- [ ] 3-4 запасных SFX — сознательно не трогал (`sfx_buttom*.wav`), по просьбе автора это
  на потом, под будущий арт-интерактив

**Новый заход (записано 2026-07-09) — ждём от Муры 3 новых файла, ещё не подключены:**

- [ ] Победа — фанфары/стинг при появлении win-модалки (`showWin()` в ui.js)
- [ ] Начало боя — звук на старте самого сражения (естественная точка подключения —
  туда же, где сейчас крутится новая анимация `playArenaRevealAnimation()`/"Battle begins!"
  в `readyFromMulligan()`, ui.js)
- [ ] Урон по базе Джит конкретно (не обобщённый `base_atack.wav`, который уже играет на
  ЛЮБой удар по любой базе, — отдельный акцентный звук именно для урона по базе Jeet;
  куда именно вешать по факту зависит от того, должен ли он звучать вместо `base_atack`
  для этого случая или поверх него — уточнить у автора при подключении)

-----
Mechanic ideas backlog (brainstorm 2026-07-10, НИЧЕГО не закреплено)

Контекст: дек-билдер уже снял ограничение "стартер = весь пул карт" — можно думать архетипами (механика ↔ пачка карт под неё ↔ отдельный играбельный стиль), а не разрозненными одиночными абилками. В резерве 35 ещё не использованных 1/1 — большой потенциал под именно колодообразующие механики. Подход по словам автора: НЕ переделывать существующие 35 1/1 разом (большая задача) — постепенно вносить новые механики, смотреть на баланс уже существующих карт по стоимости/параметрам, потихоньку нерфить/бафать, и каждый раз прокачивать AI вслед за патчами (как уже делается — см. AI_VERSION дисциплина выше).

reflect:N — при получении удара атакующий получает N урона в ответ, НЕЗАВИСИМО от обычной контратаки (та завязана на "не уставший", reflect — всегда). Танк-архетип, компаньон Брони.

overkill — избыточный урон при убийстве уходит соседнему врагу (cleave).

double_strike — атакует дважды за ход. Мощная, дорогая редкость.

scry:N — посмотреть верхние N карт своей колоды, одну оставить сверху, остальные вниз. Мягкий контроль над топдеком.

prophecy:N (из ККИ Берсерк, «Пророчество X») — вариант scry, но проще: посмотреть верхние N карт колоды, применить эффект (например добор/урон по одной из них), ВСЕ показанные карты уходят вниз колоды (без выбора порядка/оставить сверху, в отличие от scry выше) — более простой в реализации родственник, не факт что нужны оба сразу.

----

Идеи из Astral Masters (Владыки Астрала) — в отличие от Берсерка, у этой игры нет формализованных именованных ключевых слов, способности просто текстом на карте — ниже уже переведено в наш тег-формат по паттернам, которые повторяются на многих картах:

atk_eq_ess — ATK существа = текущая Эссенция владельца (динамический скейлер от ресурса, а не от статичного числа). Пример-первоисточник: Elf Mystic.

sweep — обычная атака (не активка!) бьёт ВСЕХ вражеских существ сразу, в отличие от нашего aoe, который требует кнопки/хода. Обычно на статах послабее в компенсацию. Пример: Forest Sprite ("Attacks all enemies").

fragile:N — получает +N к ЛЮБОМУ входящему урону (из любого источника). Балансировочный рычаг-даунсайд для дешёвых/сильных карт — не бафф, а осознанная уязвимость. Пример: Storm Drake ("All damage done to it is increased by 2").

on_spell_cast:N — при каждом сыгранном СВОЁМ заклинании наносит N урона сопернику (не бафф ATK, а прямой урон) — альтернативная реализация уже записанной у нас идеи "+X ATK за каждое заклинание" (Version 1.01, п. про новый тег) — можно держать обе версии рядом до финального решения, какая лучше ляжет. Пример: Goblin Shaman.

on_draw:N — триггерится на сам факт добора карты владельцем (не только "у карты есть draw", а реакция на чужой/свой добор вообще) — draw-matters пейофф. Пример: Faerie Peacekeeper.

on_play_gtype:N — при розыгрыше ЕЩЁ ОДНОЙ карты своего архетипа (gtype) наносит N урона сопернику. Естественно ложится на уже существующую систему архетипов (gtype:szg/ orb/drg/umb/mch/xui) и Squad — ещё один тип пейоффа архетипной колоды, отдельный от порога Squad. Пример: Dwarven Crossbowmen ("whenever owner summons a dwarf..."). (при автора - подумать о добавлении этой фичи для Сзаргов как их фишку архетип врат. типа когда новый Сзарг входит в игру, Сзарги на поле пробивают случайной карте или базе урон)

backlash:N — активка наносит урон врагу, но и N урона себе (риск/награда, платится HP, а не эссенцией). Пример: Merfolk Hunter ("Deals 10 dmg to target + 6 dmg to self").

Мультиудар от порога эссенции (вариант double_strike из бэклога выше, но условный: "если эссенции ≥ N — атакует несколько раз за ход", а не безусловно) — ближе к "экономическому" архетипу, которого пока не хватает Jeet (см. ess_steal выше).

Позиционные механики Astral Masters (проверки "что стоит в слоте напротив") сознательно НЕ переносим — у нас нет позиционирования существ на поле вообще, как и с сеткой Берсерка.

-----
Идеи из Hearthstone — золотая середина между Берсерком (чистые именованные кейворды) и Astral Masters (вообще без кейвордов), многое уже близко к тому, что у нас есть:

deathrattle:effect:val (Deathrattle) — генерализация того, что у нас уже есть кусками (on_own_death на мире, on_any_death_base, on_kill_base — все точечные, завязаны на конкретные карты). Deathrattle — универсальная инфраструктура "когда УМИРАЕТ ИМЕННО ЭТА карта — сделай X (урон/добор/бафф союзнику)", на самой карте, не на постороннем триггере.

enrage:atk:N (Enrage) — существо получает бонус, ПОКА оно повреждено (не на полном HP), теряет бонус при лечении до полного. Риск/награда от собственного текущего HP.

overload:N (Overload) — карта сильнее, но следующий ход essMax владельца на N меньше. Тот же принцип риск/награда, что и backlash:N из Astral Masters, но платится темпом (эссенцией), а не HP — вторая "валюта расплаты" рядом с первой.

reborn (Reborn) — воскрешает СЕБЯ МГНОВЕННО в момент первой смерти (на 1 HP), без задержки по ходам, один раз. Быстрый родственник нашей incarnation (та воскрешает через X ходов) — разные ниши, не дублирует.

spell_silence (Silence) — обобщение уже записанного выше taunt_break (который снимает только Provoke/Bushido): снимает С ЦЕЛИ ВООБЩЕ ВСЕ теги/ауры/дебаффы. Можно держать оба — taunt_break как узкий дешёвый контрплей, spell_silence как дорогой универсальный ластик.

----
Идеи из Magic: The Gathering — самая большая база (194 кейворда в игре), берём не всё, а то, что реально ново и не дублирует уже отложенное. Дублирующее НЕ повторяем отдельным пунктом — уже покрыто: Deathtouch≈poisonous, Lifelink≈vampiric, Vigilance≈untamed. Flying/Reach/Menace не переносятся вообще — завязаны на систему блокеров, которой у нас нет (Provoke — единственное, что заставляет отвечать на удар, но это не то же самое, что выбор блокера). ВАЖНО: у MTG есть свой кейворд "Ward" — это СОВСЕМ другое (контрит спелл оппонента, если тот не доплатит X, налог на таргетинг) — не путать с уже занятым у нас тегом ward (магический иммунитет, ближе к их Hexproof/Protection). Ниже используем другое имя, чтобы не столкнуться.

defender — не может атаковать вообще. Даунсайд-рычаг для дешёвых жирных стен.

indestructible — не умирает от урона (HP не может дойти до летального от дамага), но всё ещё уязвим к bounce/sacrifice/войду. Другая ниша, чем Броня/Ward/Shield — те про снижение урона, это про полный иммунитет именно к "смерти от дамага".

exalted — бонус ATK/HP существу, если в этот ход атаковало ТОЛЬКО оно одно. Тактический выбор "бить всем скопом или придержать ради бонуса одному".

annihilator:N — если существо пробивает атаку НАПРЯМУЮ по базе (не по существу), противник жертвует N своих существ. Мощный финишер для дорогих легендарок.

convoke — часть стоимости карты можно оплатить не эссенцией, а истощением (exhausted) своих существ вместо траты ресурса.

kicker:N:эффект — необязательная доплата к спеллу за усиленный эффект — не отдельная механика, а модульный паттерн для будущих спеллов.
Идеи по сжиганию карт (burn-as-resource) — сейчас сжигание жёстко ограничено 1 картой за ход (cur.burned, см. doBurnCard() в game.js). Две карты-компаньона под эту тему:

unlimited_burn (мир или артефакт) — карта на поле снимает лимит "1 раз за ход": пока она в игре, cur.burned не выставляется/не проверяется — можно сжигать сколько угодно карт за один ход. Чисто про снятие текущего ограничения, without new burn effects.

on_burn:N (скорее всего под 1/1) — при каждом сжигании ВЛАДЕЛЬЦЕМ карты (любой, не только этой) владелец добирает N карт. Вместе с 
unlimited_burn — потенциальный комбо-движок: сожги всю руку → пересобери её через добор, попутно получив кучу эссенции (сжигание уже даётess+1 за карту). Совсем незащищённый от абьюза комбо, если N=1 и сжигание безлимитно — сознательно нужно будет посмотреть на баланс отдельно, когда дойдём до реализации (не на брейншторм-этапе).

grave_scale:atk:N — +N ATK за каждую карту в СВОЁМ кладбище. Скейлящийся статтик, тема "чем дольше игра — тем я сильнее". Углубляет кладбищенскую тему (сейчас там только raise/revive:full/on_own_death). Уже было записано (автор спрашивал 2026-07-10, писали ли мы это — да, эта же строчка, с прошлой сессии; повторно подтверждено как желаемое автором в этой сессии — приоритет вырос, хочется воплотить).

evolve:N — после N выживших ходов на поле необратимо апгрейдится (+ATK/+HP или новый тег). Хорошая тема для 1/1 с уникальным артом под "финальную форму".

spell_dispel — повесить наконец на реальную карту. Тег уже полностью закодирован (doSpellDispelTarget, см. Targeted Spell System) но НЕ используется ни одной картой в игре — готовый неиспользуемый крючок. Снятие баффов/дебаффов точечным ударом — хороший контрплей против rage/aura-стекинга.
