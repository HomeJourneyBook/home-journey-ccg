/**
 * CardCarousel — мобильная карусель для руки игрока.
 * Активируется только на телефоне (max-width: 600px).
 * Не трогает игровую логику, клики и рендер — только скролл и визуал.
 */

(function () {
  const MOBILE_BREAKPOINT = 600;
  const FRICTION = 0.92;        // замедление инерции (0–1)
  const SNAP_DURATION = 320;    // мс анимации snap
  const SCALE_CENTER = 1.0;
  const SCALE_NEAR = 0.92;
  const SCALE_FAR = 0.82;
  const OPACITY_CENTER = 1.0;
  const OPACITY_NEAR = 0.7;
  const OPACITY_FAR = 0.45;

  let hand = null;          // DOM элемент #teaHand
  let cards = [];           // текущие карточки в руке
  let offset = 0;           // текущий сдвиг в пикселях
  let targetOffset = 0;     // куда едем при snap
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

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function getCardWidth() {
    if (cards.length === 0) return 0;
    return cards[0].getBoundingClientRect().width;
  }

  function getGap() {
    // gap между картами — берём из стилей или дефолт
    const style = window.getComputedStyle(hand);
    const gap = parseFloat(style.gap || style.columnGap) || 10;
    return gap;
  }

  function getCardStep() {
    return getCardWidth() + getGap();
  }

  function getMaxOffset() {
    if (cards.length === 0) return 0;
    return (cards.length - 1) * getCardStep();
  }

  // Применяем трансформы ко всем картам исходя из offset
  function updateTransforms() {
    if (!hand || cards.length === 0) return;

    const step = getCardStep();
    const handRect = hand.getBoundingClientRect();
    const viewCenter = handRect.left + handRect.width / 2;

    cards.forEach((card, i) => {
      const cardCenter = handRect.left + (i * step) - offset + getCardWidth() / 2;
      const dist = Math.abs(cardCenter - viewCenter) / step;

      let scale, opacity;
      if (dist < 0.5) {
        // почти центр
        scale = SCALE_CENTER - (SCALE_CENTER - SCALE_NEAR) * dist * 2;
        opacity = OPACITY_CENTER - (OPACITY_CENTER - OPACITY_NEAR) * dist * 2;
      } else if (dist < 1.5) {
        scale = SCALE_NEAR - (SCALE_NEAR - SCALE_FAR) * (dist - 0.5);
        opacity = OPACITY_NEAR - (OPACITY_NEAR - OPACITY_FAR) * (dist - 0.5);
      } else {
        scale = SCALE_FAR;
        opacity = OPACITY_FAR;
      }

      scale = Math.max(SCALE_FAR, Math.min(SCALE_CENTER, scale));
      opacity = Math.max(OPACITY_FAR, Math.min(OPACITY_CENTER, opacity));

      // Не трогаем карту в состоянии previewed — у неё своя трансформация
      if (!card.classList.contains('previewed')) {
        card.style.transform = `scale(${scale.toFixed(3)})`;
        card.style.opacity = opacity.toFixed(3);
      }

      // z-index: центральная выше
      card.style.zIndex = String(Math.round(10 - dist * 3));
    });

    // Двигаем весь контейнер
    hand.style.transform = `translateX(${-offset}px)`;
  }

  // Найти индекс ближайшей к центру карты
  function getNearestIndex() {
    if (cards.length === 0) return 0;
    const step = getCardStep();
    const idx = Math.round(offset / step);
    return Math.max(0, Math.min(cards.length - 1, idx));
  }

  // Easing — iOS-style ease out
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  // Анимированный snap к индексу
  function snapTo(idx) {
    cancelAnimationFrame(snapRafId);
    cancelAnimationFrame(rafId);

    const step = getCardStep();
    const from = offset;
    const to = idx * step;
    const diff = to - from;
    const start = performance.now();
    centerIndex = idx;

    function animate(now) {
      const elapsed = now - start;
      const t = Math.min(elapsed / SNAP_DURATION, 1);
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

  // Инерция после отпускания
  function runMomentum() {
    cancelAnimationFrame(rafId);

    function step() {
      if (Math.abs(velocity) < 0.5) {
        // Скорость упала — snap к ближайшей карте
        snapTo(getNearestIndex());
        return;
      }
      offset += velocity;
      offset = Math.max(0, Math.min(getMaxOffset(), offset));
      velocity *= FRICTION;
      updateTransforms();
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  // ── Touch handlers ──────────────────────────────────────────────

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
    const dx = touch.clientX - dragStartX;
    const now = performance.now();
    const dt = now - lastDragTime;

    if (dt > 0) {
      velocity = (lastDragX - touch.clientX) / dt * 16; // нормализуем к ~60fps
    }
    lastDragX = touch.clientX;
    lastDragTime = now;

    offset = dragStartOffset - dx;
    offset = Math.max(-getCardWidth() * 0.3, Math.min(getMaxOffset() + getCardWidth() * 0.3, offset));
    updateTransforms();
  }

  function onTouchEnd() {
    if (!active || !isDragging) return;
    isDragging = false;
    runMomentum();
  }

  // ── Mouse handlers (для теста на десктопе) ──────────────────────

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
    const dx = e.clientX - dragStartX;
    const now = performance.now();
    const dt = now - lastDragTime;
    if (dt > 0) velocity = (lastDragX - e.clientX) / dt * 16;
    lastDragX = e.clientX;
    lastDragTime = now;
    offset = dragStartOffset - dx;
    offset = Math.max(-getCardWidth() * 0.3, Math.min(getMaxOffset() + getCardWidth() * 0.3, offset));
    updateTransforms();
  }

  function onMouseUp() {
    if (!active || !isDragging) return;
    isDragging = false;
    runMomentum();
  }

  // ── Инициализация и обновление ──────────────────────────────────

  function setupHand() {
    hand = document.getElementById('teaHand');
    if (!hand) return;

    // Переопределяем стили контейнера для карусели
    hand.style.transform = '';
    hand.style.willChange = 'transform';
    hand.style.touchAction = 'none'; // предотвращаем нативный скролл

    hand.addEventListener('touchstart', onTouchStart, { passive: true });
    hand.addEventListener('touchmove', onTouchMove, { passive: false });
    hand.addEventListener('touchend', onTouchEnd);
    hand.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Вызывается после каждого render() — обновляем список карт
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

    if (countChanged) {
      // При изменении количества карт — сброс к ближайшей или 0
      const nearest = Math.max(0, Math.min(cards.length - 1, centerIndex));
      offset = nearest * getCardStep();
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
    if (hand) {
      hand.style.transform = '';
      hand.style.touchAction = '';
      hand.style.willChange = '';
      cards.forEach(card => {
        card.style.transform = '';
        card.style.opacity = '';
        card.style.zIndex = '';
      });
    }
    removeCarouselCSS();
  }

  // Инжектим стили карусели динамически
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
          padding: 10px calc(50vw - var(--card-w) * 0.5) 16px !important;
          min-height: var(--card-h) !important;
          will-change: transform !important;
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        #teaHand .card {
          flex-shrink: 0 !important;
          transition: opacity 0.15s, box-shadow 0.15s !important;
          /* transform управляется JS */
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

  // ── Хук на render ───────────────────────────────────────────────
  // Патчим глобальный render так чтобы carousel.refresh() вызывался после

  function hookRender() {
    // render.js должен уже быть загружен
    if (typeof render === 'function') {
      const origRender = render;
      window.render = function () {
        origRender.apply(this, arguments);
        requestAnimationFrame(refresh);
      };
    }
  }

  // ── Запуск ──────────────────────────────────────────────────────

  window.addEventListener('resize', () => {
    if (isMobile()) {
      if (!active) activate();
      refresh();
    } else {
      if (active) deactivate();
    }
  });

  // Ждём загрузки всего и патчим render
  window.addEventListener('load', () => {
    hookRender();
    if (isMobile()) {
      activate();
      refresh();
    }
  });

})();
