/**
 * CardCarousel — мобильная карусель для руки активного игрока.
 */
(function () {
  const MOBILE_BREAKPOINT = 600;
  const FRICTION          = 0.82;
  const SNAP_DURATION     = 160;
  const GAP               = 6;     // воздух между картами

  const SCALE_CENTER   = 1.00;
  const SCALE_NEAR     = 0.94;
  const SCALE_FAR      = 0.88;
  const OPACITY_CENTER = 1.00;
  const OPACITY_NEAR   = 0.75;   // соседи 75%
  const OPACITY_FAR    = 0.50;   // дальние 50%

  let hand         = null;
  let cards        = [];
  let offset       = 0;
  let velocity     = 0;
  let isDragging   = false;
  let dragStartX   = 0;
  let dragStartY   = 0;
  let dragStartOff = 0;
  let lastDragX    = 0;
  let lastDragTime = 0;
  let rafId        = null;
  let snapRafId    = null;
  let centerIndex  = 0;
  let active       = false;

  // Фиксированная геометрия — пересчитывается только при recalcLayout()
  let CARD_W  = 0;
  let STEP    = 0;
  let BASE_TX = 0;
  let layoutReady = false;

  let boundTouchStart, boundTouchMove, boundTouchEnd;
  let boundMouseMove, boundMouseUp;

  // Оригинальная функция adjustHandOverlap из render.js
  let origAdjustHandOverlap = null;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function getActiveHand() {
    const zone = document.getElementById('playerHandZone');
    if (!zone) return null;
    return zone.querySelector('#teaHand, #jeetHand') || null;
  }

  // Патч adjustHandOverlap: на мобиле не ставим отрицательные marginRight на .card
  function patchAdjustHandOverlap() {
    if (typeof adjustHandOverlap !== 'function') return;
    if (origAdjustHandOverlap) return; // уже пропатчено
    origAdjustHandOverlap = adjustHandOverlap;
    window.adjustHandOverlap = function () {
      if (active && isMobile()) {
        // Только обрабатываем .card-mini (рука оппонента), .card не трогаем
        ['teaHand','jeetHand'].forEach(id => {
          const el = document.getElementById(id);
          if (!el) return;
          // Сбрасываем отрицательные margin которые могли выставить раньше
          el.querySelectorAll('.card').forEach((card, i, arr) => {
            card.style.marginRight = i === arr.length - 1 ? '0px' : '0px';
            card.style.flexShrink  = '0';
          });
          // mini обрабатываем стандартно
          const mini = el.querySelectorAll('.card-mini');
          if (mini.length > 0) {
            const wrap = el.closest('.player-hand-wrap');
            let containerW = wrap
              ? wrap.getBoundingClientRect().width
              : el.getBoundingClientRect().width;
            containerW = Math.floor(containerW) - 12;
            if (containerW <= 20) containerW = window.innerWidth - 90 - 24;
            const cardW = mini[0].getBoundingClientRect().width || 36;
            const total = mini.length;
            let margin  = -8;
            if (total > 1) {
              const needed = cardW * total;
              if (needed > containerW) {
                margin = -Math.floor((needed - containerW) / (total - 1)) - 1;
                const minVisible = Math.floor(cardW * 0.12);
                margin = Math.max(margin, -(cardW - minVisible));
              }
            }
            mini.forEach((card, i) => {
              card.style.marginRight = i === total - 1 ? '0px' : margin + 'px';
              card.style.zIndex = String(i + 1);
            });
          }
        });
        return;
      }
      origAdjustHandOverlap.apply(this, arguments);
    };
  }

  function unpatchAdjustHandOverlap() {
    if (origAdjustHandOverlap) {
      window.adjustHandOverlap = origAdjustHandOverlap;
      origAdjustHandOverlap = null;
    }
  }

  // Считаем геометрию — только когда карты реально отрисованы
  function recalcLayout() {
    if (!hand || cards.length === 0) { layoutReady = false; return false; }
    const r = cards[0].getBoundingClientRect();
    if (r.width < 10) { layoutReady = false; return false; }
    const wasReady = layoutReady;
    CARD_W   = r.width;
    STEP     = CARD_W + GAP;
    BASE_TX  = window.innerWidth / 2 - CARD_W / 2;
    layoutReady = true;
    // При первой инициализации — ставим центральную карту по центру
    if (!wasReady) {
      centerIndex = Math.floor(cards.length / 2);
      offset      = centerIndex * STEP;
    }
    return true;
  }

  function getMaxOffset() {
    return Math.max(0, (cards.length - 1) * STEP);
  }

  function updateTransforms() {
    if (!hand || !layoutReady || cards.length === 0) return;

    const screenCenter = window.innerWidth / 2;

    cards.forEach((card, i) => {
      const cardCenter = BASE_TX - offset + i * STEP + CARD_W / 2;
      const dist = Math.abs(cardCenter - screenCenter) / STEP;

      let scale, opacity;
      if (dist < 0.5) {
        const t = dist * 2;
        scale   = SCALE_CENTER   - (SCALE_CENTER   - SCALE_NEAR)   * t;
        opacity = OPACITY_CENTER - (OPACITY_CENTER - OPACITY_NEAR) * t;
      } else if (dist < 1.5) {
        const t = dist - 0.5;
        scale   = SCALE_NEAR   - (SCALE_NEAR   - SCALE_FAR)   * t;
        opacity = OPACITY_NEAR - (OPACITY_NEAR - OPACITY_FAR) * t;
      } else {
        scale   = SCALE_FAR;
        opacity = OPACITY_FAR;
      }

      if (!card.classList.contains('previewed')) {
        card.style.transform = `scale(${scale.toFixed(3)})`;
        card.style.opacity   = opacity.toFixed(3);
      }
      card.style.zIndex      = String(Math.round(20 - dist * 6));
      card.style.marginRight = '0px'; // страховка от adjustHandOverlap
    });

    hand.style.transform = `translateX(${(BASE_TX - offset).toFixed(1)}px)`;
  }

  function getNearestIndex() {
    if (!layoutReady || STEP === 0) return 0;
    const idx = Math.round(offset / STEP);
    return Math.max(0, Math.min(cards.length - 1, idx));
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function snapTo(idx, callback) {
    cancelAnimationFrame(snapRafId);
    cancelAnimationFrame(rafId);
    velocity    = 0;
    centerIndex = idx;
    const from  = offset;
    const to    = idx * STEP;
    const diff  = to - from;
    if (Math.abs(diff) < 0.5) {
      offset = to; updateTransforms();
      if (callback) callback();
      return;
    }
    const start = performance.now();
    function animate(now) {
      const t = Math.min((now - start) / SNAP_DURATION, 1);
      offset = from + diff * easeOutCubic(t);
      updateTransforms();
      if (t < 1) {
        snapRafId = requestAnimationFrame(animate);
      } else {
        offset = to; updateTransforms();
        if (callback) callback();
      }
    }
    snapRafId = requestAnimationFrame(animate);
  }

  function runMomentum() {
    cancelAnimationFrame(rafId);
    function step() {
      if (Math.abs(velocity) < 0.5) { snapTo(getNearestIndex()); return; }
      offset   += velocity;
      offset    = Math.max(0, Math.min(getMaxOffset(), offset));
      velocity *= FRICTION;
      updateTransforms();
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  // ── Touch ────────────────────────────────────────────────────────

  function onTouchStart(e) {
    if (!active) return;

    // Если тап по попапу или его кнопкам — не перехватываем вообще
    if (e.target.closest('.card-actions-popup')) return;

    const touch  = e.touches[0];
    isDragging   = true;
    dragStartX   = touch.clientX;
    dragStartY   = touch.clientY;
    dragStartOff = offset;
    lastDragX    = touch.clientX;
    lastDragTime = performance.now();
    velocity     = 0;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(snapRafId);
  }

  function onTouchMove(e) {
    if (!active || !isDragging) return;

    // Блокируем только если движение преимущественно горизонтальное
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - dragStartX);
    const dy = Math.abs(touch.clientY - dragStartY);
    if (dy > dx && dy > 10) {
      // Вертикальный свайп — отпускаем контроль
      isDragging = false;
      snapTo(getNearestIndex());
      return;
    }

    e.preventDefault();
    const now = performance.now();
    const dt  = now - lastDragTime;
    if (dt > 0) velocity = (lastDragX - touch.clientX) / dt * 16;
    lastDragX    = touch.clientX;
    lastDragTime = now;
    offset = dragStartOff - (touch.clientX - dragStartX);
    offset = Math.max(0, Math.min(getMaxOffset(), offset));
    updateTransforms();
  }

  function onTouchEnd(e) {
    if (!active || !isDragging) return;
    isDragging = false;
    const endX = e.changedTouches[0]?.clientX ?? dragStartX;
    const dx   = Math.abs(endX - dragStartX);

    if (dx < 8) {
      // Тап — найти карту или попап под пальцем
      const tapX = endX;
      const tapY = e.changedTouches[0]?.clientY ?? 0;

      // Проверяем попал ли тап в попап (он выше карты)
      const popup = hand.querySelector('.card-actions-popup');
      if (popup) {
        const pr = popup.getBoundingClientRect();
        if (tapX >= pr.left && tapX <= pr.right && tapY >= pr.top && tapY <= pr.bottom) {
          // Тап по попапу — найти кнопку и кликнуть
          const btn = document.elementFromPoint(tapX, tapY);
          if (btn) btn.click();
          return;
        }
      }

      // Найти карту под пальцем
      let tappedIdx = -1;
      cards.forEach((card, i) => {
        const left  = BASE_TX - offset + i * STEP;
        const right = left + CARD_W;
        if (tapX >= left && tapX <= right) tappedIdx = i;
      });
      if (tappedIdx < 0) return;

      if (tappedIdx === centerIndex) {
        cards[tappedIdx].click();
      } else {
        // Snap к карте — карта поднимется только после завершения snap
        snapTo(tappedIdx, () => {
          setTimeout(() => cards[tappedIdx]?.click(), 20);
        });
      }
      return;
    }
    runMomentum();
  }

  // ── Mouse ────────────────────────────────────────────────────────

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

  // ── Handlers ─────────────────────────────────────────────────────

  function attachHandlers(el) {
    boundTouchStart = onTouchStart;
    boundTouchMove  = onTouchMove;
    boundTouchEnd   = onTouchEnd;
    el.addEventListener('touchstart', boundTouchStart, { passive: true });
    el.addEventListener('touchmove',  boundTouchMove,  { passive: false });
    el.addEventListener('touchend',   boundTouchEnd);
    el.addEventListener('mousedown',  onMouseDown);
  }

  function detachHandlers(el) {
    if (!el) return;
    el.removeEventListener('touchstart', boundTouchStart);
    el.removeEventListener('touchmove',  boundTouchMove);
    el.removeEventListener('touchend',   boundTouchEnd);
    el.removeEventListener('mousedown',  onMouseDown);
  }

  function resetState() {
    offset = 0; centerIndex = 0; velocity = 0;
    CARD_W = 0; STEP = 0; BASE_TX = 0; layoutReady = false;
  }

  // ── Refresh ──────────────────────────────────────────────────────

  function refresh() {
    if (!isMobile()) { if (active) deactivate(); return; }
    if (!active) { activate(); return; }

    const newHand = getActiveHand();
    if (!newHand) return;

    if (newHand !== hand) {
      if (hand) {
        detachHandlers(hand);
        hand.style.transform   = '';
        hand.style.touchAction = '';
        cards.forEach(c => { c.style.transform=''; c.style.opacity=''; c.style.zIndex=''; c.style.marginRight=''; });
      }
      hand = newHand;
      hand.style.touchAction = 'none';
      attachHandlers(hand);
      resetState();
    }

    const newCards     = Array.from(hand.querySelectorAll('.card'));
    const countChanged = newCards.length !== cards.length;
    cards = newCards;

    // Пробуем получить реальный размер карт
    if (!recalcLayout()) {
      // Карты ещё не отрисованы — пробуем ещё раз через два кадра
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (recalcLayout()) {
          if (countChanged) {
            const nearest = Math.max(0, Math.min(cards.length - 1, centerIndex));
            offset = nearest * STEP; centerIndex = nearest;
          }
          updateTransforms();
        }
      }));
      return;
    }

    if (countChanged) {
      const nearest = Math.max(0, Math.min(cards.length - 1, centerIndex));
      offset = nearest * STEP; centerIndex = nearest;
    }

    updateTransforms();
  }

  // ── CSS ──────────────────────────────────────────────────────────

  function applyCSS() {
    if (document.getElementById('carousel-style')) return;
    const s = document.createElement('style');
    s.id = 'carousel-style';
    s.textContent = `
      @media (max-width: ${MOBILE_BREAKPOINT}px) {
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
          margin-right: 0 !important;
          transition: none !important;
        }
        #teaHand .card.previewed, #jeetHand .card.previewed {
          transition: transform 0.15s, opacity 0.15s !important;
        }
        #teaHand .card.previewed, #jeetHand .card.previewed {
          transform: translateY(calc(var(--card-h) * -0.34)) scale(1.05) !important;
          z-index: 2000 !important;
          opacity: 1 !important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  function removeCSS() { document.getElementById('carousel-style')?.remove(); }

  // ── Activate / Deactivate ────────────────────────────────────────

  function activate() {
    active = true;
    applyCSS();
    patchAdjustHandOverlap();
    boundMouseMove = onMouseMove;
    boundMouseUp   = onMouseUp;
    document.addEventListener('mousemove', boundMouseMove);
    document.addEventListener('mouseup',   boundMouseUp);
    refresh();
  }

  function deactivate() {
    active = false;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(snapRafId);
    unpatchAdjustHandOverlap();
    if (hand) {
      detachHandlers(hand);
      hand.style.transform   = '';
      hand.style.touchAction = '';
      cards.forEach(c => { c.style.transform=''; c.style.opacity=''; c.style.zIndex=''; c.style.marginRight=''; });
      hand = null;
    }
    cards = [];
    removeCSS();
    document.removeEventListener('mousemove', boundMouseMove);
    document.removeEventListener('mouseup',   boundMouseUp);
  }

  // ── Hook render ──────────────────────────────────────────────────

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
    if (isMobile()) { if (recalcLayout()) updateTransforms(); }
    else            { if (active) deactivate(); }
  });

  window.addEventListener('load', () => {
    hookRender();
    if (isMobile()) activate();
  });

})();
