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
const RULES_QUOTE_PLACEHOLDER = { ENG: '— quote —', RUS: '— цитата —', POR: '— citação —', VN: '— trích dẫn —' };
// Языки с нестандартным (не 'MEK') шрифтом — RUS: пиксельный шрифт не поддерживает
// кириллицу нормально → Press Start 2P. VN: у вьетнамского почти нет пиксельных
// шрифтов с полной поддержкой диакритики → обычный Be Vietnam Pro, чтобы буквы
// не "разъезжались" наполовину пиксельные/наполовину нет (см. чат 2026-07-15).
const RULES_LANG_CLASS = { RUS: 'rus-lang', VN: 'vn-lang' };
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

    chapter.nodes.forEach(node => {
      // Параграфы С инлайн-контентом (иконки <img>, ссылки <a data-gl> —
      // см. чат 2026-07-15) НЕЛЬЗЯ резать по словам: word-split ниже
      // работает через node.textContent и пересобирает <p> заново из
      // ЧИСТОГО ТЕКСТА — любая вложенная разметка была бы потеряна.
      // Такие параграфы едут атомарно, как h2/h3, тем же кодом в else.
      const isRichP = node.tagName === 'P' && node.querySelector('img, a');
      if (node.tagName === 'P' && !isRichP) {
        // ── Параграфы режем по словам: на текущую страницу уходит ровно
        // столько слов, сколько влезает, остаток продолжается НОВЫМ <p>
        // на следующей странице — а не весь параграф целиком. ──────────
        let words = (node.textContent || '').split(/\s+/).filter(Boolean);
        while (words.length) {
          const p = document.createElement('p');
          measure.appendChild(p);
          let lo = 0, hi = words.length;
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            p.textContent = words.slice(0, mid).join(' ');
            if (fits()) lo = mid; else hi = mid - 1;
          }
          if (lo === 0) {
            measure.removeChild(p);
            if (currentNodes.length === 0) {
              // страница пуста, но даже одно слово не влезает — форсируем
              // (не даём алгоритму зациклиться на пустых страницах)
              const forced = document.createElement('p');
              forced.textContent = words[0];
              measure.appendChild(forced);
              currentNodes.push(forced.cloneNode(true));
              markRecorded();
              words = words.slice(1);
              continue;
            }
            finalizePage();
            continue; // те же слова пробуем уже на чистой странице
          }
          p.textContent = words.slice(0, lo).join(' ');
          currentNodes.push(p.cloneNode(true));
          markRecorded();
          words = words.slice(lo);
          if (words.length) finalizePage(); // страница заполнена — остаток идёт дальше
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
        currentNodes.push(clone);
        markRecorded();
        markGlTarget(node);
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
  return { pages, termPageMap };
}

function rulesEnsureBuilt(force) {
  const key = RB.lang + '|' + window.innerWidth + '|' + window.innerHeight;
  if (!force && RB.builtKey === key) return;
  const result = rulesPaginate(RB.lang);
  RB.pages = result.pages;
  RB.termPageMap = result.termPageMap;
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
  if (leftIdx >= 0 && RB.pages[leftIdx]) {
    RB.pages[leftIdx].forEach(n => leftInner.appendChild(n.cloneNode(true)));
  }
  if (RB.pages[rightIdx]) {
    RB.pages[rightIdx].forEach(n => rightInner.appendChild(n.cloneNode(true)));
  }
  rulesUpdateNavButtons();
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
