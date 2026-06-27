/**
 * CardCarousel — мобильная карусель для руки активного игрока.
 * Работает с #teaHand и #jeetHand (горячий стул).
 * Активен только на мобильном (max-width: 600px).
 */

(function () {
  const MOBILE_BREAKPOINT = 600;
  const FRICTION           = 0.88;   // инерция
  const SNAP_DURATION      = 280;    // мс snap-анимации
  const SCALE_CENTER       = 1.0;
  const SCALE_NEAR         = 0.93;   // ближайшие соседи
  const SCALE_FAR          = 0.86;   // дальние
  const OPACITY_CENTER     = 1.0;
  const OPACITY_NEAR       = 0.75;   // мягкая прозрачность соседей
  const OPACITY_FAR        = 0.5;
  const GAP                = 10;     // px между картами

  let hand        = null;   // текущий активный DOM-элемент руки
  let cards       = [];
  let offset      = 0;      // px, 0 = карта[0] по центру экрана
  let velocity    = 0;
  let isDragging  = false;
  let dragStartX  = 0;
  let dragStartOff = 0;
  let lastDragX   = 0;
  let lastDragTime = 0;
  let rafId       = null;
  let snapRafId   = null;
  let centerIndex = 0;
  let active      = false;
  let cardW       = 0;
  // сохраняем обработчики чтобы снять при смене руки
  let boundTouchStart, boundTouchMove, boundTouchEnd;
  let boundMouseDown, boundMouseMove, boundMouseUp;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  // Определяем какой #*Hand сейчас в #playerHandZone
  function getActiveHand() {
    const zone = document.getElementById('playerHandZone');
    if (!zone) return null;
    const h = zone.querySelector('#teaHand, #jeetHand');
    return h || null;
  }

  function measureCard() {
    if (cards.length === 0) return;
    const r = cards[0].getBoundingClientRect();
    if (r.width > 0) cardW = r.width;
  }

  function getStep()      { return cardW + GAP; }
  function getMaxOffset() { return Math.max(0, (cards.length - 1) * getStep()); }

  // translateX контейнера: при offset=0 карта[0] стоит по центру экрана
  function getTranslateX() {
    const base = window.innerWidth / 2 - cardW / 2;
    return base - offset;
  }

  function updateTransforms() {
    if (!hand || cards.length === 0) return;

    const screenCenter = window.innerWidth / 2;
    const base = window.innerWidth / 2 - cardW / 2;
    const step = getStep();

    cards.forEach((card, i) => {
      const cardCenter = base - offset + i * step + cardW / 2;
      const dist = Math.abs(cardCenter - screenCenter) / step;

      let scale, opacity;
      if (dist < 0.5) {
        scale   = SCALE_CENTER - (SCALE_CENTER - SCALE_NEAR) * dist * 2;
        opacity = OPACITY_CENTER - (OPACITY_CENTER - OPACITY_NEAR) * dist * 2;
      } else if (dist < 1.5) {
        scale   = SCALE_NEAR - (SCALE_NEAR - SCALE_FAR) * (dist - 0.5);
        opacity = OPACITY_NEAR - (OPACITY_NEAR - OPACITY_FAR) * (dist - 0.5);
      } else {
        scale   = SCALE_FAR;
        opacity = OPACITY_FAR;
      }

      scale   = Math.max(SCALE_FAR,   Math.min(SCALE_CENTER,   scale));
      opacity = Math.max(OPACITY_FAR, Math.min(OPACITY_CENTER, opacity));

      if (!card.classList.contains('previewed')) {
        card.style.transform = `scale(${scale.toFixed(3)})`;
        card.style.opacity   = opacity.toFixed(3);
      }
      // центральная карта всегда поверх соседей
      card.style.zIndex = String(Math.round(20 - dist * 5));
    });

    hand.style.transform = `translateX(${getTranslateX().toFixed(2)}px)`;
  }

  function getNearestIndex() {
    if (cards.length === 0) return 0;
    const idx = Math.round(offset / getStep());
    return Math.max(0, Math.min(cards.length - 1, idx));
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function snapTo(idx, callback) {
    cancelAnimationFrame(snapRafId);
    cancelAnimationFrame(rafId);

    const from  = offset;
    const to    = idx * getStep();
    const diff  = to - from;
    const start = performance.now();
    centerIndex = idx;

    function animate(now) {
      const t = Math.min((now - start) / SNAP_DURATION, 1);
      offset = from + diff * easeOutQuart(t);
      updateTransforms();
      if (t < 1) {
        snapRafId = requestAnimationFrame(animate);
      } else {
        offset = to;
        updateTransforms();
        if (callback) callback();
      }
    }
    snapRafId = requestAnimationFrame(animate);
  }

  function runMomentum() {
    cancelAnimationFrame(rafId);
    function step() {
      if (Math.abs(velocity) < 0.5) {
        snapTo(getNearestIndex());
        return;
      }
      offset += velocity;
      // жёсткий лимит — не уезжаем за крайние карты
      offset = Math.max(0, Math.min(getMaxOffset(), offset));
      velocity *= FRICTION;
      updateTransforms();
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  // ── Touch ────────────────────────────────────────────────────────

  function onTouchStart(e) {
    if (!active) return;
    const touch = e.touches[0];
    isDragging   = true;
    dragStartX   = touch.clientX;
    dragStartOff = offset;
    lastDragX    = touch.clientX;
    lastDragTime = performance.now();
    velocity     = 0;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(snapRafId);
  }

  function onTouchMove(e) {
    if (!active || !isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx    = touch.clientX - dragStartX;
    const now   = performance.now();
    const dt    = now - lastDragTime;
    if (dt > 0) velocity = (lastDragX - touch.clientX) / dt * 16;
    lastDragX    = touch.clientX;
    lastDragTime = now;
    offset = dragStartOff - dx;
    // жёсткий лимит при драге
    offset = Math.max(0, Math.min(getMaxOffset(), offset));
    updateTransforms();
  }

  function onTouchEnd(e) {
    if (!active || !isDragging) return;
    isDragging = false;

    // Если это был тап (почти без движения) — проверяем тапнули ли не по центральной
    const dx = Math.abs((e.changedTouches[0]?.clientX || dragStartX) - dragStartX);
    if (dx < 8) {
      handleTap(e.changedTouches[0]?.clientX || dragStartX);
      return;
    }
    runMomentum();
  }

  // Тап по карте — если не центральная, сначала snap, потом клик
  function handleTap(tapX) {
    if (!hand || cards.length === 0) return;

    const base = window.innerWidth / 2 - cardW / 2;
    const step = getStep();

    // Найдём карту под пальцем
    let tappedIdx = -1;
    cards.forEach((card, i) => {
      const cardLeft  = base - offset + i * step;
      const cardRight = cardLeft + cardW;
      if (tapX >= cardLeft && tapX <= cardRight) {
        tappedIdx = i;
      }
    });

    if (tappedIdx < 0) return;

    if (tappedIdx === centerIndex) {
      // Центральная — пускаем клик как обычно
      cards[tappedIdx].click();
    } else {
      // Не центральная — snap к ней, потом клик
      snapTo(tappedIdx, () => {
        cards[tappedIdx].click();
      });
    }
  }

  // ── Mouse (тест на десктопе) ─────────────────────────────────────

  function onMouseDown(e) {
    if (!active) return;
    isDragging   = true;
    dragStartX   = e.clientX;
    dragStartOff = offset;
    lastDragX    = e.clientX;
    lastDragTime = performance.now();
    velocity     = 0;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(snapRafId);
  }

  function onMouseMove(e) {
    if (!active || !isDragging) return;
    const dx  = e.clientX - dragStartX;
    const now = performance.now();
    const dt  = now - lastDragTime;
    if (dt > 0) velocity = (lastDragX - e.clientX) / dt * 16;
    lastDragX    = e.clientX;
    lastDragTime = now;
    offset = dragStartOff - dx;
    offset = Math.max(0, Math.min(getMaxOffset(), offset));
    updateTransforms();
  }

  function onMouseUp() {
    if (!active || !isDragging) return;
    isDragging = false;
    runMomentum();
  }

  // ── Управление обработчиками ─────────────────────────────────────

  function attachHandlers(el) {
    boundTouchStart = onTouchStart;
    boundTouchMove  = onTouchMove;
    boundTouchEnd   = onTouchEnd;
    boundMouseDown  = onMouseDown;

    el.addEventListener('touchstart', boundTouchStart, { passive: true });
    el.addEventListener('touchmove',  boundTouchMove,  { passive: false });
    el.addEventListener('touchend',   boundTouchEnd);
    el.addEventListener('mousedown',  boundMouseDown);
  }

  function detachHandlers(el) {
    if (!el) return;
    el.removeEventListener('touchstart', boundTouchStart);
    el.removeEventListener('touchmove',  boundTouchMove);
    el.removeEventListener('touchend',   boundTouchEnd);
    el.removeEventListener('mousedown',  boundMouseDown);
  }

  // ── CSS ──────────────────────────────────────────────────────────

  function applyCarouselCSS() {
    if (document.getElementById('carousel-style')) return;
    const style = document.createElement('style');
    style.id = 'carousel-style';
    style.textContent = `
      @media (max-width: 600px) {
        .player-hand-zone {
          height: auto !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        #teaHand, #jeetHand {
          display: flex !important;
          flex-wrap: nowrap !important;
          justify-content: flex-start !important;
          align-items: flex-end !important;
          overflow: visible !important;
          gap: ${GAP}px !important;
          padding: 10px 0 16px !important;
          min-height: var(--card-h) !important;
          will-change: transform !important;
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        #teaHand .card, #jeetHand .card {
          flex-shrink: 0 !important;
          transition: opacity 0.15s !important;
        }
        #teaHand .card.previewed, #jeetHand .card.previewed {
          transform: translateY(calc(var(--card-h) * -0.34)) scale(1.05) !important;
          z-index: 2000 !important;
          opacity: 1 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function removeCarouselCSS() {
    const el = document.getElementById('carousel-style');
    if (el) el.remove();
  }

  // ── Refresh — вызывается после каждого render() ──────────────────

  function refresh() {
    if (!isMobile()) {
      if (active) deactivate();
      return;
    }
    if (!active) {
      activate();
      return;
    }

    const newHand = getActiveHand();
    if (!newHand) return;

    // Если рука сменилась (переход хода) — переключаемся
    if (newHand !== hand) {
      if (hand) {
        detachHandlers(hand);
        hand.style.transform   = '';
        hand.style.touchAction = '';
        hand.style.willChange  = '';
      }
      hand = newHand;
      hand.style.willChange  = 'transform';
      hand.style.touchAction = 'none';
      attachHandlers(hand);
      // сброс позиции при смене игрока
      offset      = 0;
      centerIndex = 0;
    }

    const newCards    = Array.from(hand.querySelectorAll('.card'));
    const countChanged = newCards.length !== cards.length;
    cards = newCards;
    measureCard();

    if (countChanged) {
      const nearest = Math.max(0, Math.min(cards.length - 1, centerIndex));
      offset      = nearest * getStep();
      centerIndex = nearest;
    }

    updateTransforms();
  }

  function activate() {
    active = true;
    applyCarouselCSS();

    if (!boundMouseMove) {
      boundMouseMove = onMouseMove;
      boundMouseUp   = onMouseUp;
      document.addEventListener('mousemove', boundMouseMove);
      document.addEventListener('mouseup',   boundMouseUp);
    }

    refresh();
  }

  function deactivate() {
    active = false;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(snapRafId);
    if (hand) {
      detachHandlers(hand);
      hand.style.transform   = '';
      hand.style.touchAction = '';
      hand.style.willChange  = '';
      cards.forEach(card => {
        card.style.transform = '';
        card.style.opacity   = '';
        card.style.zIndex    = '';
      });
      hand = null;
    }
    cards = [];
    removeCarouselCSS();
    document.removeEventListener('mousemove', boundMouseMove);
    document.removeEventListener('mouseup',   boundMouseUp);
    boundMouseMove = null;
    boundMouseUp   = null;
  }

  // ── Хук на render ────────────────────────────────────────────────

  function hookRender() {
    if (typeof render === 'function') {
      const orig = render;
      window.render = function () {
        orig.apply(this, arguments);
        requestAnimationFrame(refresh);
      };
    }
  }

  // ── Запуск ───────────────────────────────────────────────────────

  window.addEventListener('resize', () => {
    if (isMobile()) { if (!active) activate(); else refresh(); }
    else            { if (active)  deactivate(); }
  });

  window.addEventListener('load', () => {
    hookRender();
    if (isMobile()) activate();
  });

})();
