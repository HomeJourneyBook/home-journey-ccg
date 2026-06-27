/**
 * CardCarousel — мобильная карусель для руки игрока.
 * Активируется только на телефоне (max-width: 600px).
 * Не трогает игровую логику, клики и рендер — только скролл и визуал.
 */

(function () {
  const MOBILE_BREAKPOINT = 600;
  const FRICTION = 0.92;
  const SNAP_DURATION = 320;
  const SCALE_CENTER = 1.0;
  const SCALE_NEAR = 0.92;
  const SCALE_FAR = 0.82;
  const OPACITY_CENTER = 1.0;
  const OPACITY_NEAR = 0.7;
  const OPACITY_FAR = 0.45;

  let hand = null;
  let cards = [];
  let offset = 0;       // смещение в единицах "шаг карты", 0 = первая карта по центру
  let velocity = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartOffset = 0;
  let lastDragX = 0;
  let lastDragTime = 0;
  let rafId = null;
  let snapRafId = null;
  let centerIndex = 0;
  let active = false;
  let cardW = 0;
  let cardGap = 10;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function measureCard() {
    if (cards.length === 0) return;
    const rect = cards[0].getBoundingClientRect();
    if (rect.width > 0) cardW = rect.width;
    // gap из CSS переменной
    const cs = getComputedStyle(document.documentElement);
    // fallback 10
    cardGap = 10;
  }

  function getStep() {
    return cardW + cardGap;
  }

  // offset=0 → карта[0] по центру экрана
  // offset=step → карта[1] по центру экрана
  // Физический translateX = screenCenter - cardW/2 - index*step - offset_pixels
  // Но мы двигаем весь #teaHand, поэтому:
  // hand.left изначально = 0 (левый край экрана)
  // чтобы карта[0] была по центру: translateX = screenCenter - cardW/2
  // затем вычитаем текущий pixel-offset

  function getBaseTranslate() {
    // позиция при offset=0: первая карта по центру
    return window.innerWidth / 2 - cardW / 2;
  }

  function getPixelOffset() {
    return offset; // offset уже в пикселях
  }

  function getMaxOffset() {
    if (cards.length === 0) return 0;
    return (cards.length - 1) * getStep();
  }

  function updateTransforms() {
    if (!hand || cards.length === 0) return;

    const base = getBaseTranslate();
    const px = getPixelOffset();
    const screenCenter = window.innerWidth / 2;
    const step = getStep();

    cards.forEach((card, i) => {
      // позиция центра этой карты на экране
      const cardScreenCenter = base - px + i * step + cardW / 2;
      const dist = Math.abs(cardScreenCenter - screenCenter) / step;

      let scale, opacity;
      if (dist < 0.5) {
        scale   = SCALE_CENTER   - (SCALE_CENTER   - SCALE_NEAR)   * dist * 2;
        opacity = OPACITY_CENTER - (OPACITY_CENTER - OPACITY_NEAR) * dist * 2;
      } else if (dist < 1.5) {
        scale   = SCALE_NEAR   - (SCALE_NEAR   - SCALE_FAR)   * (dist - 0.5);
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
      card.style.zIndex = String(Math.round(10 - dist * 3));
    });

    hand.style.transform = `translateX(${(base - px).toFixed(2)}px)`;
  }

  function getNearestIndex() {
    if (cards.length === 0) return 0;
    const idx = Math.round(offset / getStep());
    return Math.max(0, Math.min(cards.length - 1, idx));
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function snapTo(idx) {
    cancelAnimationFrame(snapRafId);
    cancelAnimationFrame(rafId);

    const from = offset;
    const to   = idx * getStep();
    const diff = to - from;
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
      offset = Math.max(-cardW * 0.3, Math.min(getMaxOffset() + cardW * 0.3, offset));
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
    isDragging = true;
    dragStartX = touch.clientX;
    dragStartOffset = offset;
    lastDragX = touch.clientX;
    lastDragTime = performance.now();
    velocity = 0;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(snapRafId);
  }

  function onTouchMove(e) {
    if (!active || !isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx  = touch.clientX - dragStartX;
    const now = performance.now();
    const dt  = now - lastDragTime;
    if (dt > 0) velocity = (lastDragX - touch.clientX) / dt * 16;
    lastDragX   = touch.clientX;
    lastDragTime = now;
    offset = dragStartOffset - dx;
    offset = Math.max(-cardW * 0.5, Math.min(getMaxOffset() + cardW * 0.5, offset));
    updateTransforms();
  }

  function onTouchEnd() {
    if (!active || !isDragging) return;
    isDragging = false;
    runMomentum();
  }

  // ── Mouse (тест на десктопе) ─────────────────────────────────────

  function onMouseDown(e) {
    if (!active) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartOffset = offset;
    lastDragX = e.clientX;
    lastDragTime = performance.now();
    velocity = 0;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(snapRafId);
  }

  function onMouseMove(e) {
    if (!active || !isDragging) return;
    const dx  = e.clientX - dragStartX;
    const now = performance.now();
    const dt  = now - lastDragTime;
    if (dt > 0) velocity = (lastDragX - e.clientX) / dt * 16;
    lastDragX   = e.clientX;
    lastDragTime = now;
    offset = dragStartOffset - dx;
    offset = Math.max(-cardW * 0.5, Math.min(getMaxOffset() + cardW * 0.5, offset));
    updateTransforms();
  }

  function onMouseUp() {
    if (!active || !isDragging) return;
    isDragging = false;
    runMomentum();
  }

  // ── Инициализация ────────────────────────────────────────────────

  function setupHand() {
    hand = document.getElementById('teaHand');
    if (!hand) return;
    hand.style.willChange  = 'transform';
    hand.style.touchAction = 'none';

    hand.addEventListener('touchstart', onTouchStart, { passive: true });
    hand.addEventListener('touchmove',  onTouchMove,  { passive: false });
    hand.addEventListener('touchend',   onTouchEnd);
    hand.addEventListener('mousedown',  onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  }

  function refresh() {
    if (!isMobile()) {
      if (active) deactivate();
      return;
    }
    if (!active) activate();

    hand = document.getElementById('teaHand');
    if (!hand) return;

    const newCards = Array.from(hand.querySelectorAll('.card'));
    const countChanged = newCards.length !== cards.length;
    cards = newCards;

    // Измеряем карту после рендера — размер известен только тут
    measureCard();

    if (countChanged) {
      const nearest = Math.max(0, Math.min(cards.length - 1, centerIndex));
      offset = nearest * getStep();
      centerIndex = nearest;
    }

    updateTransforms();
  }

  function activate() {
    active = true;
    setupHand();
    applyCarouselCSS();
  }

  function deactivate() {
    active = false;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(snapRafId);
    if (hand) {
      hand.style.transform   = '';
      hand.style.touchAction = '';
      hand.style.willChange  = '';
      cards.forEach(card => {
        card.style.transform = '';
        card.style.opacity   = '';
        card.style.zIndex    = '';
      });
    }
    removeCarouselCSS();
  }

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
        #teaHand {
          display: flex !important;
          flex-wrap: nowrap !important;
          justify-content: flex-start !important;
          align-items: flex-end !important;
          overflow: visible !important;
          gap: 10px !important;
          padding: 10px 0 16px !important;
          min-height: var(--card-h) !important;
          position: relative !important;
          left: 0 !important;
          will-change: transform !important;
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        #teaHand .card {
          flex-shrink: 0 !important;
          transition: opacity 0.12s !important;
        }
        #teaHand .card.previewed {
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

  function hookRender() {
    if (typeof render === 'function') {
      const orig = render;
      window.render = function () {
        orig.apply(this, arguments);
        requestAnimationFrame(refresh);
      };
    }
  }

  window.addEventListener('resize', () => {
    if (isMobile()) { if (!active) activate(); refresh(); }
    else { if (active) deactivate(); }
  });

  window.addEventListener('load', () => {
    hookRender();
    if (isMobile()) { activate(); refresh(); }
  });

})();
