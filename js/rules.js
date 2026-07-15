// ═══════════════════════════════════════════════════════════════════════
// RULES BOOK — paginated reader engine (прототип механики, без визуала)
// ═══════════════════════════════════════════════════════════════════════
// Контент по-прежнему живёт в #rulesENG/#rulesRUS/#rulesPOR/#rulesVN
// (обычные h2/h3/p/hr, см. #rulesSource в index.html) — переводчики
// продолжают редактировать их точно так же, как раньше. Этот файл сам
// нарезает содержимое каждого языка на "страницы" по РЕАЛЬНОЙ высоте
// рендера (не руками расставленные разрывы), поэтому разная длина
// перевода никогда не ломает разбивку — просто получится больше/меньше
// страниц.
//
// Зачем именно так, а не руками: 26 секций × 4 языка × правки текста,
// которые точно будут продолжаться — ручные разрывы страниц пришлось бы
// перебивать при каждой правке в любом из языков. Авто-раскладка решает
// это один раз.
//
// Разворот (2 страницы, лаптоп) vs один лист (телефон) — это НЕ вторая
// разбивка контента, а просто другой способ ПОКАЗА одного и того же
// списка страниц (по одной или парами). Единый источник правды.
//
// TODO (визуал, отдельным заходом):
//   - "Пружинка" книги, доп. полировка кромки/застёжки — сам 9-слайс
//     обложки/страниц и закладки-языки уже на месте (border-image на
//     img/rules_cover.png / img/rules_pages.png, см. styles.css).
//   - Лёгкий наклон на разворот (rulesSpreadRotation) — сейчас просто
//     назначает CSS-переменную --r, сам rotate() и transition навесить
//     вместе с артом (та же идея, что уже работает на страницах лора).
//   - Звук перелистывания — сейчас переиспользую 'card_navigation_cursor'
//     (что-то шелестящее из существующих sfx), подставь то, что реально
//     подходит по звуку.
// ═══════════════════════════════════════════════════════════════════════

const RULES_LANGS = ['ENG', 'RUS', 'POR', 'VN'];
const RULES_TITLES = { ENG: 'RULES', RUS: 'Правила', POR: 'REGRAS', VN: 'Luật Chơi' };

// ── Реальная область текста страницы, СЧИТАННАЯ, а не захардкоженная.
//    Раньше тут была заглушка {width:320,height:380}, из-за которой
//    пагинация меряла текст против размера, никак не связанного с тем,
//    что реально показывается — отсюда обрезанный текст на страницах.
//    Формулы здесь ДУБЛИРУЮТ CSS (.rules-book/.rules-page-content в
//    styles.css) вместо живого замера DOM — потому что во время самой
//    пагинации #rulesPages зачастую ещё display:none (например, первый
//    заход сразу на обложку), а у display:none элементов
//    getBoundingClientRect всегда 0×0, измерить нечем. Чисто
//    математический пересчёт работает независимо от того, что сейчас
//    видно на экране.
//    ВАЖНО: если поменяешь константы в .rules-book (ratio/--rules-frame-b/
//    точку перелома 900px) в styles.css — продублируй изменение и сюда,
//    иначе пагинация снова разъедется с реальной вёрсткой. */
function rulesPageContentBoxPx() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isDesktop = vw >= 900; // == rulesMediaQuery()
  const bookH = isDesktop ? Math.min(0.82 * vh, 0.46 * vw) : (0.92 * vw) / 0.948;
  const pageW = bookH * 0.948;
  const frameB = bookH * 0.06; // == --rules-frame-b
  return {
    width: Math.max(0, pageW - 2 * frameB),
    height: Math.max(0, bookH - 2 * frameB),
  };
}

const rulesState = {
  lang: 'ENG',
  pageIndex: -1,      // -1 = обложка, 0..N-1 = индекс страницы контента
  pagesPerView: 1,     // 1 (телефон) или 2 (разворот, лаптоп)
  pages: {},           // {ENG: ['<h2>...</h2><p>...</p>', ...], ...} — по языку
  toc: {},             // {ENG: [{title, pageIndex}], ...} — по языку
  initialized: false,
};

function rulesMediaQuery() {
  return window.matchMedia('(min-width: 900px)');
}

function rulesUpdatePagesPerView() {
  rulesState.pagesPerView = rulesMediaQuery().matches ? 2 : 1;
}

// ── Общий "упаковщик" блоков в страницы по замеренной высоте — общий для
//    контента (с принудительным разрывом перед каждой главой) и для
//    оглавления (без разрывов, просто жадная упаковка). ─────────────────
function rulesPackNodes(nodes, probe, forceBreakBeforeH2, boxHeight) {
  const pages = [];
  let current = [];

  function fits() {
    probe.innerHTML = '';
    current.forEach(n => probe.appendChild(n.cloneNode(true)));
    return probe.scrollHeight <= boxHeight;
  }

  nodes.forEach(node => {
    if (forceBreakBeforeH2 && node.tagName === 'H2' && current.length) {
      // Новая глава — всегда с чистой страницы. Хвост предыдущей главы
      // (то, что не влезло) так и остаётся хвостом — это дальше решается
      // вёрсткой/артом, не пагинацией.
      pages.push(current);
      current = [];
    }
    current.push(node);
    if (!fits()) {
      const overflowing = current.pop();
      if (current.length === 0) {
        // Один блок сам по себе выше страницы — известное ограничение v1,
        // не разбиваем текст ВНУТРИ блока, странице даём переполниться.
        current.push(overflowing);
      } else {
        pages.push(current);
        current = [overflowing];
      }
    }
  });
  if (current.length) pages.push(current);
  return pages;
}

// ── Пагинация: меряем реальную высоту в скрытом проб-контейнере ─────────
// Итоговый порядок страниц по языку: [цитата-плейсхолдер, ...оглавление
// (может быть больше 1 страницы, если глав много), ...контент(с разрывом
// перед каждой главой)]. Обложка (pageIndex===-1) сюда не входит — она не
// часть этого списка, а отдельное состояние.
function paginateRulesLang(lang) {
  if (rulesState.pages[lang]) return; // уже посчитано — кэш

  const source = document.getElementById('rules' + lang);
  if (!source) { rulesState.pages[lang] = []; rulesState.toc[lang] = []; return; }

  const box = rulesPageContentBoxPx();
  const probe = document.createElement('div');
  probe.className = 'rules-page-text rules-page-probe';
  probe.style.width = box.width + 'px';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.left = '-9999px';
  probe.style.top = '0';
  probe.style.height = 'auto';
  document.body.appendChild(probe);

  const blocks = Array.from(source.children);
  const contentPages = rulesPackNodes(blocks, probe, true, box.height);

  // {title, contentPageIndex} — contentPageIndex пока ОТНОСИТЕЛЬНО начала
  // contentPages, финальный сквозной номер посчитаем ниже, когда узнаем,
  // сколько страниц займёт само оглавление.
  const tocRaw = [];
  contentPages.forEach((page, i) => {
    page.forEach(node => {
      if (node.tagName === 'H2') tocRaw.push({ title: node.textContent.trim(), contentPageIndex: i });
    });
  });

  // Оглавление меряем и режем той же функцией (без принудительных
  // разрывов) — если глав много, само оглавление становится 2+ страниц.
  const tocNodes = tocRaw.map(entry => {
    const div = document.createElement('div');
    div.className = 'rules-toc-entry';
    div.textContent = entry.title;
    return div;
  });
  const tocPageGroups = rulesPackNodes(tocNodes, probe, false, box.height);
  probe.remove();

  const frontMatterCount = 1 /* страница-цитата */ + tocPageGroups.length;
  const toc = tocRaw.map(entry => ({
    title: entry.title,
    pageIndex: frontMatterCount + entry.contentPageIndex,
  }));

  const quotePageHtml = '<div class="rules-quote-placeholder">— quote / art placeholder —</div>';

  let consumed = 0;
  const tocPagesHtml = tocPageGroups.map(group => {
    const entriesHtml = group.map((div, j) => {
      const entry = toc[consumed + j];
      return `<div class="rules-toc-entry" onclick="rulesGoTo(${entry.pageIndex})">${entry.title}</div>`;
    }).join('');
    consumed += group.length;
    return `<div class="rules-toc">${entriesHtml}</div>`;
  });

  const contentPagesHtml = contentPages.map(page => page.map(n => n.outerHTML).join(''));

  rulesState.pages[lang] = [quotePageHtml, ...tocPagesHtml, ...contentPagesHtml];
  rulesState.toc[lang] = toc;
}

// ── Наклон — ФИКСИРОВАН НА РАЗВОРОТ (пару страниц), не на отдельную
//    страницу: раскрытая книга не может иметь левую и правую половину,
//    наклонённые в разные стороны. На телефоне (по одной странице) угол
//    из-за этого меняется не каждую страницу, а каждые две — тот же
//    список пар, что и на десктопе, просто показывается по одной. ──────
function rulesSpreadRotation(pageNum) {
  const seq = [-1.4, 0.9, -0.6, 1.6, -1.1, 0.5];
  const spreadIndex = Math.floor(pageNum / 2);
  return seq[((spreadIndex % seq.length) + seq.length) % seq.length];
}

// ── Рендер ────────────────────────────────────────────────────────────
function rulesRenderCover() {
  const lang = rulesState.lang;
  paginateRulesLang(lang);

  document.getElementById('rulesCover').style.display = '';
  document.getElementById('rulesPages').style.display = 'none';
  const langBtnsCover = document.getElementById('rulesLangBtns');
  if (langBtnsCover) langBtnsCover.style.display = '';
  // Обложка — всегда одна "страница" по ширине, даже если до этого
  // читали разворот (2 страницы) на лаптопе.
  document.getElementById('rulesBook').classList.remove('spread');

  document.querySelectorAll('.rules-lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  const title = document.getElementById('rulesCoverTitle');
  if (title) {
    title.textContent = RULES_TITLES[lang] || 'Rules';
    title.classList.toggle('rus-title', lang === 'RUS');
    title.classList.toggle('vn-title', lang === 'VN');
  }

  rulesRenderEdgeButtons();
}

function rulesRenderPages() {
  const lang = rulesState.lang;
  paginateRulesLang(lang);
  const pages = rulesState.pages[lang] || [];
  const idx = rulesState.pageIndex;
  const perView = rulesState.pagesPerView;

  document.getElementById('rulesCover').style.display = 'none';
  document.getElementById('rulesPages').style.display = '';
  const langBtnsPages = document.getElementById('rulesLangBtns');
  if (langBtnsPages) langBtnsPages.style.display = 'none';
  // Разворот (2 страницы) — книга РАСШИРЯЕТСЯ до 2×--rules-page-w (см.
  // .rules-book.spread в styles.css) — без этого класса кромка с
  // кнопками оставалась прижатой к старой узкой ширине и наезжала на
  // правую страницу вместо того, чтобы висеть за её краем.
  document.getElementById('rulesBook').classList.toggle('spread', perView === 2);
  document.getElementById('rulesPageSingle').style.display = perView === 2 ? 'none' : '';
  document.getElementById('rulesSpread').style.display = perView === 2 ? 'flex' : 'none';

  const slotIds = perView === 2 ? ['rulesPageLeft', 'rulesPageRight'] : ['rulesPageSingle'];
  slotIds.forEach((id, i) => {
    const el = document.getElementById(id);
    const content = document.getElementById(id + 'Content');
    if (!el || !content) return;
    const pageNum = idx + i;
    if (pageNum < pages.length) {
      content.innerHTML = pages[pageNum];
      content.dataset.rulesLang = lang; // хук для языковых шрифтов (RUS/VN) — переживает innerHTML, в отличие от id-обёртки источника
      el.style.visibility = 'visible';
      el.style.setProperty('--r', rulesSpreadRotation(pageNum) + 'deg');
    } else {
      content.innerHTML = '';
      el.style.visibility = 'hidden';
    }
  });

  rulesRenderEdgeButtons();
}

function rulesRenderEdgeButtons() {
  const onCover = rulesState.pageIndex === -1;
  const pages = rulesState.pages[rulesState.lang] || [];

  // 2026-07-14 (дизайн-референс): Back теперь ВСЕГДА виден в кромке —
  // на обложке просто неактивен (disabled + серый), а не display:none
  // как раньше. Next по-прежнему прячется целиком в конце книги — для
  // него в референсе отдельного "неактивного" состояния не заложено.
  const backBtn = document.getElementById('rulesBackBtn');
  if (backBtn) backBtn.disabled = onCover;

  const nextBtn = document.getElementById('rulesNextBtn');
  if (nextBtn) {
    const atEnd = !onCover && (rulesState.pageIndex + rulesState.pagesPerView) >= pages.length;
    nextBtn.style.display = atEnd ? 'none' : '';
  }
}

// ── Навигация ─────────────────────────────────────────────────────────
function rulesGoHome() {
  playSfx('yellow_buttom');
  hideScreen('rules');
}

function rulesGoToCover() {
  rulesState.pageIndex = -1;
  rulesRenderCover();
}

function rulesNext() {
  playSfx('card_navigation_cursor'); // TODO: заменить на реальный sfx перелистывания
  const pages = rulesState.pages[rulesState.lang] || [];
  if (rulesState.pageIndex === -1) {
    rulesState.pageIndex = 0;
  } else {
    const maxStart = Math.max(0, pages.length - rulesState.pagesPerView);
    rulesState.pageIndex = Math.min(rulesState.pageIndex + rulesState.pagesPerView, maxStart);
  }
  rulesRenderPages();
}

function rulesBack() {
  playSfx('card_navigation_cursor'); // TODO: заменить на реальный sfx перелистывания
  if (rulesState.pageIndex <= 0) {
    rulesGoToCover();
    return;
  }
  rulesState.pageIndex = Math.max(0, rulesState.pageIndex - rulesState.pagesPerView);
  rulesRenderPages();
}

function rulesGoTo(pageIndex) {
  playSfx('card_navigation_cursor'); // TODO: заменить на реальный sfx перелистывания
  rulesState.pageIndex = pageIndex;
  rulesRenderPages();
}

function setRulesLang(lang) {
  rulesState.lang = lang;
  // Сброс на обложку при смене языка — страницы разной длины у разных
  // языков не совпадают 1-в-1 по номеру, так что "продолжить с того же
  // места" тут не имеет однозначного смысла. Если захочется умнее —
  // можно переходить на страницу той же ГЛАВЫ (искать в toc[lang] секцию
  // с тем же порядковым номером и её pageIndex), но это отдельная фича.
  rulesState.pageIndex = -1;
  rulesRenderCover();
}

// ── Точка входа — вызывается из кнопки RULES на лендинге ────────────────
function rulesOpen() {
  rulesUpdatePagesPerView();
  if (!rulesState.initialized) {
    rulesState.initialized = true;
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      // Дебаунс — во время растягивания окна resize стреляет десятками
      // раз в секунду, а полная перепагинация (клонирование узлов в
      // probe) не бесплатна. 150мс — не заметно на глаз, но не молотит
      // на каждый пиксель.
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        rulesUpdatePagesPerView();
        // Реальная область текста (rulesPageContentBoxPx) зависит от
        // vw/vh непрерывно, не только от точки перелома 900px — так что
        // кэш страниц сбрасываем на КАЖДЫЙ ресайз, не только когда
        // поменялся pagesPerView, иначе после изменения размера окна
        // текст остаётся нарезан под старый размер и обрезается/остаётся
        // с лишним пустым местом.
        rulesState.pages = {};
        rulesState.toc = {};
        if (rulesState.pageIndex !== -1) {
          rulesRenderPages();
        } else {
          rulesRenderCover();
        }
      }, 150);
    });
  }
  // Каждое открытие с лендинга — на обложку (язык остаётся тем, что выбрали
  // в прошлый раз, это просто приятнее чем сбрасывать на ENG каждый раз).
  rulesState.pageIndex = -1;
  rulesRenderCover();
}
