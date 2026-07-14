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
//   - 9-слайс фон обложки/страниц, "пружинка", закладки-языки как таб на
//     верхней кромке, "застёжка" как оформление кромки с кнопками.
//   - RULES_PAGE_BOX сейчас условные px-плейсхолдеры — как только будет
//     готов реальный арт страницы, эти размеры (и сам механизм измерения
//     — сейчас px, скорее всего захочется на vh/vw) надо будет пересчитать
//     под реальную текстовую область рамки.
//   - Лёгкий наклон каждой страницы (rulesPageRotation) — сейчас просто
//     назначает CSS-переменную --r, сам rotate() и transition навесить
//     вместе с артом (та же идея, что уже работает на страницах лора).
//   - Звук перелистывания — сейчас переиспользую 'card_navigation_cursor'
//     (что-то шелестящее из существующих sfx), подставь то, что реально
//     подходит по звуку.
// ═══════════════════════════════════════════════════════════════════════

const RULES_LANGS = ['ENG', 'RUS', 'POR', 'VN'];
const RULES_TITLES = { ENG: 'RULES', RUS: 'Правила', POR: 'REGRAS', VN: 'Luật Chơi' };

// ПЛЕЙСХОЛДЕР — реальная текстовая область придёт из арта страницы.
const RULES_PAGE_BOX = { width: 320, height: 380 }; // px

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

// ── Пагинация: меряем реальную высоту в скрытом проб-контейнере ─────────
function paginateRulesLang(lang) {
  if (rulesState.pages[lang]) return; // уже посчитано — кэш

  const source = document.getElementById('rules' + lang);
  if (!source) { rulesState.pages[lang] = []; rulesState.toc[lang] = []; return; }

  const probe = document.createElement('div');
  probe.className = 'rules-page-text rules-page-probe';
  probe.style.width = RULES_PAGE_BOX.width + 'px';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.left = '-9999px';
  probe.style.top = '0';
  probe.style.height = 'auto';
  document.body.appendChild(probe);

  const blocks = Array.from(source.children);
  const pages = [];
  let current = [];

  function fits() {
    probe.innerHTML = '';
    current.forEach(n => probe.appendChild(n.cloneNode(true)));
    return probe.scrollHeight <= RULES_PAGE_BOX.height;
  }

  blocks.forEach(node => {
    current.push(node);
    if (!fits()) {
      const overflowing = current.pop();
      if (current.length === 0) {
        // Один блок сам по себе выше страницы (длинный абзац) — известное
        // ограничение v1: не разбиваем текст ВНУТРИ блока, просто даём
        // странице переполниться в одиночку. Если реально встретится —
        // надо будет резать текст абзаца по словам, а не по блокам.
        current.push(overflowing);
      } else {
        pages.push(current);
        current = [overflowing];
      }
    }
  });
  if (current.length) pages.push(current);

  const toc = [];
  pages.forEach((page, i) => {
    page.forEach(node => {
      if (node.tagName === 'H2') toc.push({ title: node.textContent.trim(), pageIndex: i });
    });
  });

  probe.remove();
  rulesState.pages[lang] = pages.map(page => page.map(n => n.outerHTML).join(''));
  rulesState.toc[lang] = toc;
}

// ── Небольшой фикс-наклон на страницу (детерминированный, не random —
//    чтобы при повторном заходе на ту же страницу угол не прыгал) ───────
function rulesPageRotation(pageNum) {
  const seq = [-1.4, 0.9, -0.6, 1.6, -1.1, 0.5];
  return seq[((pageNum % seq.length) + seq.length) % seq.length];
}

// ── Рендер ────────────────────────────────────────────────────────────
function rulesRenderCover() {
  const lang = rulesState.lang;
  paginateRulesLang(lang);
  const toc = rulesState.toc[lang] || [];

  document.getElementById('rulesCover').style.display = '';
  document.getElementById('rulesPages').style.display = 'none';

  const tocEl = document.getElementById('rulesToc');
  tocEl.innerHTML = toc.map(entry =>
    `<div class="rules-toc-entry" onclick="rulesGoTo(${entry.pageIndex})">${entry.title}</div>`
  ).join('');

  document.querySelectorAll('.rules-lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  const title = document.getElementById('rulesTitleLabel');
  if (title) {
    title.textContent = RULES_TITLES[lang] || 'Rules';
    title.classList.toggle('rus-title', lang === 'RUS');
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
  document.getElementById('rulesPageSingle').style.display = perView === 2 ? 'none' : '';
  document.getElementById('rulesSpread').style.display = perView === 2 ? 'flex' : 'none';

  const slotIds = perView === 2 ? ['rulesPageLeft', 'rulesPageRight'] : ['rulesPageSingle'];
  slotIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const pageNum = idx + i;
    if (pageNum < pages.length) {
      el.innerHTML = pages[pageNum];
      el.style.visibility = 'visible';
      el.style.setProperty('--r', rulesPageRotation(pageNum) + 'deg');
    } else {
      el.innerHTML = '';
      el.style.visibility = 'hidden';
    }
  });

  rulesRenderEdgeButtons();
}

function rulesRenderEdgeButtons() {
  const onCover = rulesState.pageIndex === -1;
  const pages = rulesState.pages[rulesState.lang] || [];

  const backBtn = document.getElementById('rulesBackBtn');
  if (backBtn) backBtn.style.display = onCover ? 'none' : '';

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
    window.addEventListener('resize', () => {
      const prev = rulesState.pagesPerView;
      rulesUpdatePagesPerView();
      if (prev !== rulesState.pagesPerView && rulesState.pageIndex !== -1) rulesRenderPages();
    });
  }
  // Каждое открытие с лендинга — на обложку (язык остаётся тем, что выбрали
  // в прошлый раз, это просто приятнее чем сбрасывать на ENG каждый раз).
  rulesState.pageIndex = -1;
  rulesRenderCover();
}
