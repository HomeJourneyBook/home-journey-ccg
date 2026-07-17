// ═══════════════════════════════════════════════════════════════════════
// RULES BOOK — обложка + постраничный разворот (без скролла).
// ---------------------------------------------------------------------
// Текст правил лежит в скрытых .rules-source блоках (rulesENG/RUS/POR/VN,
// см. index.html) — они больше не показываются напрямую. rulesPaginate()
// клонирует их h2/h3/p и раскладывает по "физическим" страницам, меряя
// реальную высоту через скрытый #rulesMeasure (та же разметка/шрифты, что
// у настоящей страницы). Каждая h2-глава всегда начинается с новой
// страницы; если глава не влезает целиком — переносится на следующую(ие).
// Стр.0 — плейсхолдер под цитату, стр.1 — оглавление (клик → нужная стр.),
// стр.2+ — сами главы.
// ═══════════════════════════════════════════════════════════════════════

const RULES_LANGS = ['ENG', 'RUS', 'POR', 'VN'];
const RULES_TOC_TITLE = { ENG: 'Contents', RUS: 'Оглавление', POR: 'Índice', VN: 'Mục Lục' };
const RULES_QUOTE_PLACEHOLDER = { ENG: 'Candles in Space', RUS: 'Свечи в космосе', POR: 'Velas no Espaço', VN: 'Nến Trong Không Gian' };
// Языки с нестандартным (не 'MEK') шрифтом — RUS: пиксельный шрифт не поддерживает
// кириллицу нормально → Press Start 2P. VN: у вьетнамского почти нет пиксельных
// шрифтов с полной поддержкой диакритики → обычный Be Vietnam Pro, чтобы буквы
// не "разъезжались" наполовину пиксельные/наполовину нет (см. чат 2026-07-15).
const RULES_LANG_CLASS = { ENG: 'eng-lang', RUS: 'rus-lang', POR: 'por-lang', VN: 'vn-lang' };
const RULES_LANG_TITLE_CLASS = { RUS: 'rus-title', VN: 'vn-title' };

const RB = { lang: 'ENG', open: false, index: 0, pages: [], builtKey: null, _resizeT: null };

// ── Открытие экрана (вызывается вместе со showScreen('rules', this)) ───
function rulesOnScreenOpened() {
  RB.open = false;
  RB.index = 0;
  const book = document.getElementById('rulesBook');
  if (book) book.classList.remove('open');
  rulesUpdateCoverTitle();
  rulesUpdateCoverLangBtns();
  rulesUpdateNavButtons();
}

function rulesSetLang(lang) {
  if (!RULES_LANGS.includes(lang) || lang === RB.lang) { rulesUpdateCoverLangBtns(); return; }
  RB.lang = lang;
  RB.index = 0;
  rulesUpdateCoverTitle();
  rulesUpdateCoverLangBtns();
  if (RB.open) {
    rulesEnsureBuilt(true);
    rulesRender();
  }
}

function rulesUpdateCoverTitle() {
  const src = document.getElementById('rules' + RB.lang);
  const el = document.getElementById('rulesCoverTitle');
  if (!src || !el) return;
  el.textContent = src.dataset.title || 'RULES';
  el.classList.remove('rus-title', 'vn-title');
  const cls = RULES_LANG_TITLE_CLASS[RB.lang];
  if (cls) el.classList.add(cls);
}

function rulesUpdateCoverLangBtns() {
  document.querySelectorAll('.rules-cover-lang').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === RB.lang);
  });
}

// ── Навигация ───────────────────────────────────────────────────────
function rulesStep() {
  return window.matchMedia('(min-width:601px)').matches ? 2 : 1;
}

function rulesGoForward() {
  if (!RB.open) {
    rulesEnsureBuilt(false);
    RB.open = true;
    RB.index = 0;
    document.getElementById('rulesBook').classList.add('open');
    rulesRender();
    return;
  }
  const step = rulesStep();
  const next = RB.index + step;
  if (next < RB.pages.length) {
    RB.index = next;
    rulesRender();
  }
}

function rulesGoBack() {
  if (!RB.open) return; // задизейблена на обложке
  const step = rulesStep();
  if (RB.index - step < 0) {
    // закрываем книгу обратно на обложку
    RB.open = false;
    RB.index = 0;
    document.getElementById('rulesBook').classList.remove('open');
  } else {
    RB.index -= step;
  }
  rulesRender();
}

function rulesGoHome() {
  // Первые 3 "страницы" (обложка → плейсхолдер → оглавление, т.е. index<2)
  // — кнопка закрывает книгу целиком. Начиная с контента глав (index>=2)
  // — та же кнопка возвращает к оглавлению, а не закрывает экран.
  if (RB.open && RB.index >= 2) {
    rulesGoto(1);
  } else {
    hideScreen('rules');
  }
}

// Переход по клику из оглавления — pageIndex абсолютный индекс в RB.pages
function rulesGoto(pageIndex) {
  if (!RB.open) return;
  const step = rulesStep();
  RB.index = step === 2 ? (pageIndex - (pageIndex % 2)) : pageIndex;
  rulesRender();
}

// ── Разбор источника на главы (каждая h2 = новая глава) ────────────
function rulesParseChapters(lang) {
  const src = document.getElementById('rules' + lang);
  const chapters = [];
  let current = null;
  src.childNodes.forEach(node => {
    if (node.nodeType !== 1) return; // пропускаем текстовые узлы/переносы строк
    const tag = node.tagName;
    if (tag === 'HR') return; // разделители не нужны — главы и так на новых страницах
    if (tag === 'H2') {
      current = { title: node.textContent.trim(), nodes: [node] };
      chapters.push(current);
    } else if (current) {
      current.nodes.push(node);
    }
  });
  return chapters;
}

// ── Токенизация параграфа для постраничной резки ────────────────────
// Разбивает <p> на последовательность токенов: {type:'text', text} для
// каждого отдельного слова текстовых узлов, {type:'el', el} для целого
// инлайн-элемента (<img>-иконка, <a>-ссылка — САМА ссылка не режется по
// словам, едет одним куском). Порядок исходный, поэтому пересборка через
// rulesRenderTokens() восстанавливает абзац 1-в-1, просто с возможностью
// остановиться в любой точке между токенами.
function rulesTokenizeP(node) {
  const tokens = [];
  node.childNodes.forEach(child => {
    if (child.nodeType === 3) { // текстовый узел
      (child.textContent || '').split(/\s+/).filter(Boolean).forEach(w => tokens.push({ type: 'text', text: w }));
    } else if (child.nodeType === 1) { // <img>, <a> и т.п.
      tokens.push({ type: 'el', el: child });
    }
  });
  return tokens;
}

// Рендерит первые n токенов в переданный <p> (перезаписывая его содержимое).
// Пробел между токенами не ставится ПЕРЕД чистой пунктуацией (,.;:!?)) —
// иначе "Горение , Страх" вместо "Горение, Страх" (см. чат 2026-07-15,
// абзац Лечения с 3 подряд идущими ссылками через запятую).
const RULES_NO_SPACE_BEFORE = /^[,.;:!?)]/;
function rulesRenderTokens(p, tokens, n) {
  p.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const t = tokens[i];
    const needsSpace = i > 0 && !(t.type === 'text' && RULES_NO_SPACE_BEFORE.test(t.text));
    if (needsSpace) p.appendChild(document.createTextNode(' '));
    if (t.type === 'text') p.appendChild(document.createTextNode(t.text));
    else p.appendChild(t.el.cloneNode(true));
  }
}

// ── Пагинация: возвращает массив страниц, каждая — массив DOM-узлов ─
function rulesPaginate(lang) {
  const chapters = rulesParseChapters(lang);
  const measure = document.getElementById('rulesMeasureInner');
  measure.className = 'rules-page-inner' + (RULES_LANG_CLASS[lang] ? ' ' + RULES_LANG_CLASS[lang] : '');

  function fits() {
    return measure.scrollHeight <= measure.clientHeight + 1;
  }

  const chapterPages = [];       // массив страниц (массив массивов клонов)
  const chapterStartIdx = {};    // title -> индекс в chapterPages, где начинается глава
  const termPageMap = {};        // data-gl ключ -> АБСОЛЮТНЫЙ индекс в итоговом pages[]

  chapters.forEach(chapter => {
    let currentNodes = [];
    let recorded = false;
    measure.innerHTML = '';

    function finalizePage() {
      chapterPages.push(currentNodes);
      currentNodes = [];
      measure.innerHTML = '';
    }
    function markRecorded() {
      if (!recorded) { chapterStartIdx[chapter.title] = chapterPages.length; recorded = true; }
    }
    // Любой h2/h3/rich-<p> с data-gl (см. rulesGotoTerm) регистрируется тут,
    // независимо от того, стал ли он поводом для markRecorded() выше —
    // это ДРУГАЯ карта (термин→страница, не глава→страница).
    function markGlTarget(node) {
      const key = node.getAttribute && node.getAttribute('data-gl');
      if (key && !(key in termPageMap)) termPageMap[key] = 2 + chapterPages.length;
    }

    // Пробует "заглянуть" на 1 токен вперёд после только что размещённого h3 —
    // см. вызов ниже, orphan-заголовок.
    function nextParaHasRoom(nextNode) {
      if (!nextNode || nextNode.tagName !== 'P') return true; // не абзац следом — правило не касается
      const tokens = rulesTokenizeP(nextNode);
      if (!tokens.length) return true; // пустой абзац — нечему сиротеть
      const testP = document.createElement('p');
      measure.appendChild(testP);
      rulesRenderTokens(testP, tokens, 1);
      const ok = fits();
      measure.removeChild(testP);
      return ok;
    }

    chapter.nodes.forEach((node, i, arr) => {
      if (node.tagName === 'P') {
        // ── Параграфы режем по "токенам" — слово ИЛИ целый инлайн-элемент
        // (<img>-иконка, <a>-ссылка целиком, не разрывая её саму) — так и
        // обычный текст, и абзацы с иконками/ссылками внутри одинаково
        // переносятся по месту, без потери разметки (в отличие от старой
        // версии, которая работала через node.textContent и уничтожала
        // вложенные теги — багфикс 2026-07-15, см. чат: абзац "Болт" с
        // иконкой не влезал целиком и уезжал ВЕСЬ на следующую страницу,
        // хотя явно оставалось видимое место под заголовком). ──────────
        let tokens = rulesTokenizeP(node);
        while (tokens.length) {
          const p = document.createElement('p');
          measure.appendChild(p);
          let lo = 0, hi = tokens.length;
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            rulesRenderTokens(p, tokens, mid);
            if (fits()) lo = mid; else hi = mid - 1;
          }
          if (lo === 0) {
            measure.removeChild(p);
            if (currentNodes.length === 0) {
              // страница пуста, но даже один токен не влезает — форсируем
              // (не даём алгоритму зациклиться на пустых страницах)
              rulesRenderTokens(p, tokens, 1);
              measure.appendChild(p);
              currentNodes.push(p.cloneNode(true));
              markRecorded();
              tokens = tokens.slice(1);
              continue;
            }
            finalizePage();
            continue; // те же токены пробуем уже на чистой странице
          }
          rulesRenderTokens(p, tokens, lo);
          currentNodes.push(p.cloneNode(true));
          markRecorded();
          tokens = tokens.slice(lo);
          if (tokens.length) finalizePage(); // страница заполнена — остаток идёт дальше
        }
      } else {
        // h2/h3/rich-<p> — атомарные, не режутся; целиком переезжают на
        // новую страницу, если не влезают на текущую с уже имеющимся
        // контентом.
        const clone = node.cloneNode(true);
        measure.appendChild(clone);
        if (!fits() && currentNodes.length > 0) {
          finalizePage();
          measure.appendChild(clone);
        }
        // ── Orphan-заголовок (просьба автора 2026-07-16): h3 сам по себе
        // влезает внизу страницы, но следом сразу идёт <p> — его "тело" —
        // и под этим h3 не остаётся места ДАЖЕ на один токен (слово/иконку/
        // ссылку) абзаца. Получался огрызок вида "Spells" без единой
        // строки текста, а весь абзац целиком уезжал на след. страницу.
        // Если это тот случай (и на странице уже что-то есть — иначе
        // переносить некуда, тот же принцип, что у "форс" ниже для P) —
        // сдёргиваем и сам h3 на чистую страницу, вместе с его текстом.
        // currentNodes.length>0 тут проверяется ДО push этого h3 (см. ниже) —
        // т.е. "есть ли на странице что-то, кроме самого этого заголовка".
        if (node.tagName === 'H3' && currentNodes.length > 0 && !nextParaHasRoom(arr[i + 1])) {
          measure.removeChild(clone);
          finalizePage();
          measure.appendChild(clone);
        }
        currentNodes.push(clone);
        markRecorded();
        markGlTarget(node);
        // .rules-full-art (см. styles.css) — это flex:1 картинка, которая
        // ВСЕГДА растягивается/сжимается ровно под остаток страницы и
        // поэтому никогда не переполнит measure — fits() тут всегда
        // вернёт true, даже если следом идёт ещё контент (h3/p), который
        // должен уйти на новую страницу. Поэтому вместо того чтобы
        // полагаться на fits(), сразу принудительно закрываем страницу
        // после такой картинки — весь остаток главы начинается с чистого
        // листа (баг найден и пофикшен в предыдущей сессии, см. чат
        // 2026-07-16).
        if (node.tagName === 'IMG' && node.classList.contains('rules-full-art')) {
          finalizePage();
        }
      }
    });
    if (currentNodes.length) chapterPages.push(currentNodes);
  });
  measure.innerHTML = '';

  // Стр.0 — пустая, плейсхолдер под цитату
  const quoteWrap = document.createElement('div');
  quoteWrap.className = 'rules-quote-page';
  const quoteInner = document.createElement('div');
  quoteInner.className = 'rules-quote-placeholder';
  quoteInner.textContent = RULES_QUOTE_PLACEHOLDER[lang] || RULES_QUOTE_PLACEHOLDER.ENG;
  quoteWrap.appendChild(quoteInner);

  // Стр.1 — оглавление. Клик оформлен через атрибут onclick (не
  // addEventListener!), т.к. страницы клонируются в rulesRender() —
  // addEventListener-обработчики cloneNode НЕ копирует, а атрибут копирует.
  const tocWrap = document.createElement('div');
  const tocH = document.createElement('h2');
  tocH.className = 'rules-toc-title';
  tocH.textContent = RULES_TOC_TITLE[lang] || RULES_TOC_TITLE.ENG;
  tocWrap.appendChild(tocH);
  const list = document.createElement('div');
  list.className = 'rules-toc-list';
  chapters.forEach(chapter => {
    const targetPage = 2 + chapterStartIdx[chapter.title];
    const entry = document.createElement('div');
    entry.className = 'rules-toc-entry';
    entry.setAttribute('onclick', "playSfx('yellow_buttom');rulesGoto(" + targetPage + ")");
    const titleSpan = document.createElement('span');
    titleSpan.textContent = chapter.title;
    const numSpan = document.createElement('span');
    numSpan.className = 'rules-toc-num';
    numSpan.textContent = String(targetPage + 1);
    entry.appendChild(titleSpan);
    entry.appendChild(numSpan);
    list.appendChild(entry);
  });
  tocWrap.appendChild(list);

  const pages = [[quoteWrap], [tocWrap]];
  chapterPages.forEach(nodes => pages.push(nodes));
  // Случайный вариант фона (0-3, см. .rules-page.variant-N в styles.css) —
  // назначается ОДИН РАЗ на страницу здесь, при пагинации, и переживает
  // пролистывание туда-сюда без изменений (пересчитывается заново только
  // при перестройке книги целиком — смена языка/ресайз).
  const pageVariants = pages.map(() => Math.floor(Math.random() * 4));
  return { pages, termPageMap, pageVariants };
}

function rulesEnsureBuilt(force) {
  const key = RB.lang + '|' + window.innerWidth + '|' + window.innerHeight;
  if (!force && RB.builtKey === key) return;
  const result = rulesPaginate(RB.lang);
  RB.pages = result.pages;
  RB.termPageMap = result.termPageMap;
  RB.pageVariants = result.pageVariants;
  RB.builtKey = key;
  if (RB.index >= RB.pages.length) RB.index = 0;
}

// Переход по внутритекстовой ссылке (например "[Эссенции]" внутри абзаца) —
// key соответствует data-gl="..." на целевом h2/h3 в источнике. Целевая
// страница уже посчитана при пагинации (см. markGlTarget в rulesPaginate).
function rulesGotoTerm(key) {
  if (!RB.open || !RB.termPageMap) return;
  const pageIndex = RB.termPageMap[key];
  if (pageIndex === undefined) { console.warn('rulesGotoTerm: unknown key', key); return; }
  rulesGoto(pageIndex);
}

// ── Рендер текущего разворота ──────────────────────────────────────
function rulesRender() {
  const leftOuter = document.getElementById('rulesPageLeft');
  const rightOuter = document.getElementById('rulesPageRight');
  const leftInner = document.getElementById('rulesPageLeftInner');
  const rightInner = document.getElementById('rulesPageRightInner');
  if (!leftInner || !rightInner) return;
  const langCls = RULES_LANG_CLASS[RB.lang];
  [leftInner, rightInner].forEach(el => {
    el.className = 'rules-page-inner' + (langCls ? ' ' + langCls : '');
    el.innerHTML = '';
  });
  const step = rulesStep();
  const rightIdx = step === 2 ? RB.index + 1 : RB.index;
  const leftIdx = step === 2 ? RB.index : -1;
  rulesApplyPageVariant(leftOuter, leftIdx);
  rulesApplyPageVariant(rightOuter, rightIdx);
  if (leftIdx >= 0 && RB.pages[leftIdx]) {
    RB.pages[leftIdx].forEach(n => leftInner.appendChild(n.cloneNode(true)));
  }
  if (RB.pages[rightIdx]) {
    RB.pages[rightIdx].forEach(n => rightInner.appendChild(n.cloneNode(true)));
  }
  rulesUpdateNavButtons();
}

// Ставит/снимает .variant-N (1-3, 0 = дефолтный rules_pages.png без класса)
// на внешний .rules-page элемент — см. RB.pageVariants в rulesPaginate().
function rulesApplyPageVariant(el, pageIndex) {
  if (!el) return;
  el.classList.remove('variant-1', 'variant-2', 'variant-3');
  const v = RB.pageVariants && RB.pageVariants[pageIndex];
  if (v) el.classList.add('variant-' + v);
}

function rulesUpdateNavButtons() {
  const backBtn = document.getElementById('rulesBtnBack');
  const fwdBtn = document.getElementById('rulesBtnFwd');
  const homeBtn = document.getElementById('rulesBtnHome');
  if (!backBtn || !fwdBtn || !homeBtn) return;
  backBtn.disabled = !RB.open;
  if (!RB.open) {
    fwdBtn.disabled = false;
  } else {
    fwdBtn.disabled = (RB.index + rulesStep()) >= RB.pages.length;
  }
  const tocMode = RB.open && RB.index >= 2;
  homeBtn.title = tocMode ? 'Contents' : 'Home';
  homeBtn.classList.toggle('rules-navbtn-home-toc', tocMode);
}

// ── Пересчёт при ресайзе/повороте экрана (дебаунс) ─────────────────
window.addEventListener('resize', () => {
  clearTimeout(RB._resizeT);
  RB._resizeT = setTimeout(() => {
    const screen = document.getElementById('rulesScreen');
    if (!screen || !screen.classList.contains('active') || !RB.open) return;
    rulesEnsureBuilt(true);
    rulesRender();
  }, 250);
});

// ── Гонка с загрузкой веб-шрифтов (2026-07-17, баг: вьетнамские правила
// иногда обрезаются снизу, чаще замечено на iPad в горизонтальном режиме) ──
// RUS (Press Start 2P) и VN (Be Vietnam Pro) — оба веб-шрифты, грузятся через
// @import с display=swap (styles.css) — то есть браузер СНАЧАЛА рисует
// текст фолбэк-шрифтом и только потом подменяет на настоящий, когда тот
// догрузится (классический FOUT). rulesPaginate() меряет реальную высоту
// текста ЧЕРЕЗ ТЕКУЩИЙ рендер скрытого клона — если книгу открыли/
// переключили на язык с веб-шрифтом ДО того, как он реально догрузился,
// разметка по страницам посчитана по метрикам чужого (фолбэк) шрифта — у
// него другие ширина символов/высота строки, особенно с вьетнамской
// диакритикой. Когда шрифт наконец подгружается и браузер меняет отрисовку
// текста, разметка уже зафиксирована, а страница — фиксированной высоты
// (overflow:hidden), так что лишнее просто обрезается снизу. Симптом
// "иногда, не на всех устройствах" — это и есть гонка по скорости
// соединения/кэша шрифта, не детерминированный баг: если к моменту
// открытия книги шрифт уже был в кэше — паджинация в любом случае верна,
// если нет — первая пересборка после этого блока её поправит.
// Фикс: как только document.fonts.ready реально зарезолвится (все шрифты,
// использованные на странице, догружены и применены), если книга уже была
// построена хотя бы раз — пересобираем её заново с уже правильными
// метриками и, если она сейчас открыта, перерисовываем текущий разворот.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    if (RB.builtKey) {
      rulesEnsureBuilt(true);
      if (RB.open) rulesRender();
    }
  });
}
