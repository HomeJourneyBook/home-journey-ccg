// ГЛАВНАЯ функция перерисовки экрана игры. Вызывается после каждого действия (ход, атака, игра карты и т.д.)
// Обновляет: счётчики хода/HP/Essence/колоды/кладбища, поля боя, руки обоих игроков (своя — открыта, чужая — рубашками),
// персистентную зону (Worlds/Artifacts), z-index рук, подсветку "можно бить по базе", текст подсказки текущей фазы.
function render(){
  const cur=G[G.turn];
  document.getElementById('turnNum').textContent=G.turnNum;
  document.getElementById('turnPlayer').textContent=G.turn.toUpperCase();
  ['tea','jeet'].forEach(f=>{
    const p=G[f];
    document.getElementById(f+'Hp').textContent=p.hp;
    document.getElementById(f+'Ess').textContent=p.ess;
    document.getElementById(f+'EssMax').textContent=p.essMax;
    const hc=document.getElementById(f+'HandCount');
    if(hc)hc.textContent=p.hand.length;
    // Stats bar counters
    const dc=document.getElementById(f+'DeckCountStat');
    if(dc)dc.textContent=p.deck.length;
    const gc=document.getElementById(f+'GraveCountStat');
    if(gc)gc.textContent=p.grave.length;
    // Bottom bar badges
    const graveBadge=document.getElementById(f+'GraveBadge');
    if(graveBadge)graveBadge.textContent=p.grave.length;
    const deckBadge=document.getElementById(f+'DeckBadge');
    if(deckBadge)deckBadge.textContent=p.deck.length;
  });
  rZone('teaField',G.tea.field,'field');
  rZone('jeetField',G.jeet.field,'field');
  if(G.mode==='vsai'){
    const hf=G.humanFaction,af=G.aiFaction;
    const hEl=document.getElementById(hf+'Hand');
    if(hEl) hEl.className='hand';
    rZone(hf+'Hand',G[hf].hand,'hand');
    rHiddenHand(af+'Hand',G[af].hand,af);
  } else if(G.turn==='tea'){
    const th=document.getElementById('teaHand');
    if(th) th.className='hand';
    rZone('teaHand',G.tea.hand,'hand');
    rHiddenHand('jeetHand',G.jeet.hand,'jeet');
  } else {
    const jh=document.getElementById('jeetHand');
    if(jh) jh.className='hand';
    rZone('jeetHand',G.jeet.hand,'hand');
    rHiddenHand('teaHand',G.tea.hand,'tea');
  }
  rPersist('teaPersist',G.tea);
  reorderZones();
  rPersist('jeetPersist',G.jeet);
  ['teaHand','jeetHand'].forEach(hid=>{
    const hel=document.getElementById(hid);
    if(hel)hel.style.zIndex=G.previewCard?'500':'50';
  });
  requestAnimationFrame(()=>{ adjustHandOverlap(); requestAnimationFrame(adjustHandOverlap); });

  const sfx=G.turn==='tea'?'T':'J';
  updateMulliganBtn(G.turn);

  const inactSB=document.getElementById((G.turn==='tea'?'jeet':'tea')+'SidebarBtns');
  if(inactSB)inactSB.style.display='none';
  const actSB=document.getElementById(G.turn+'SidebarBtns');
  if(actSB)actSB.style.display='flex';

  if(G.mode==='vsai'){
    const humanBB=document.getElementById(G.humanFaction+'BottomBar');
    const aiBB=document.getElementById(G.aiFaction+'BottomBar');
    if(aiBB)aiBB.style.display='none';
    // Панель человека теперь видна ВСЕГДА в vsai, даже во время хода ИИ —
    // на время хода ИИ у нее просто подменяется кнопка End Turn (см. updateEndTurnBtn ниже).
    if(humanBB)humanBB.style.display='flex';
  } else {
    const inactBB=document.getElementById((G.turn==='tea'?'jeet':'tea')+'BottomBar');
    if(inactBB)inactBB.style.display='none';
    const actBB=document.getElementById(G.turn+'BottomBar');
    if(actBB)actBB.style.display='flex';
  }

  const oppKey=G.mode==='vsai'?G.aiFaction:(G.turn==='tea'?'jeet':'tea');
  const oppZoneEl=document.getElementById('oppStats');
  if(oppZoneEl){
    const canHitBase=(G.phase==='selectTarget'||G.phase==='healTarget')&&G.sel&&canAttackBase();
    const oppNameBox=oppZoneEl.querySelector('.player-name-box');
    if(oppNameBox) oppNameBox.classList.toggle('base-targetable', canHitBase);
  }
  const playerStatsEl=document.getElementById('playerStats');
  if(playerStatsEl){
    const playerNameBox=playerStatsEl.querySelector('.player-name-box');
    if(playerNameBox) playerNameBox.classList.remove('base-targetable');
  }

  const hitEl=document.getElementById('hitBase'+sfx);if(hitEl)hitEl.style.display='none';

  updateEndTurnBtn();

  const hints={
    action:'',
    selectTarget:'Select enemy or tap their base.',
    burn:'Select card to burn.',
    healTarget:'Select ally to heal or enemy to attack.',
  };
  const hintEl2=document.getElementById('hint'+sfx+'2');
  if(hintEl2)hintEl2.textContent=hints[G.phase]||'';
  if(typeof _applyPendingFlash==='function') _applyPendingFlash();
  if(typeof _applyPendingEssGlitch==='function') _applyPendingEssGlitch();
}

// Возвращает путь к картинке типа карты (мир/уникальный/артефакт/заклинание/существо) —
// именно эта картинка ставится фоном в .card-type-dot (значок в правом верхнем углу карты).
function getTypeDotImg(card){
  if(card.world) return 'img/type_world.png';
  if(card.unique) return 'img/type_unique.png';
  if(card.artifact) return 'img/type_artifact.png';
  if(card.spell) return 'img/type_spell.png';
  return 'img/type_creature.png';
}

// ── Общий механизм "увеличенного превью" карты по центру экрана: рисуется НЕ поверх
// оригинального элемента, а отдельным клоном (mkEl(...,'preview')) поверх всего экрана —
// поэтому не зависит от того, что происходит с оригиналом (перерисовки поля/руки,
// анимации карусели и т.п. ему не мешают).
// Используется в двух местах с разными триггерами открытия/закрытия:
//   1) mkSmallEl (карты поля боя) — открывается долгим нажатием, закрывается отпусканием кнопки/пальца.
//   2) mkEl (кнопка Zoom в руке) — открывается кликом по кнопке, закрывается тапом в любом месте экрана.
//
// РЕГУЛИРОВКА РАЗМЕРА: конечный масштаб карты — последний аргумент scale в вызове
// showFieldCardPreview(...) ниже по коду (два места: mkSmallEl для поля и zoomHandCardFly
// для руки), а также константы FIELD_PREVIEW_SCALE/HAND_ZOOM_SCALE прямо под этим комментарием —
// меняй любую из них независимо, вторую не затронет.
const FIELD_PREVIEW_SCALE = 1.6; // во сколько раз увеличивается карта поля при долгом нажатии
const HAND_ZOOM_SCALE     = 1.6; // во сколько раз увеличивается карта руки по кнопке Zoom

let fieldPreviewEl=null;

function showFieldCardPreview(card, originEl, scale=FIELD_PREVIEW_SCALE){
  closeFieldCardPreview();
  const originRect=originEl.getBoundingClientRect();
  // "Чистая" копия карты для превью: сбрасываем игровые состояния (устала/спит/страх/горит/выбрана),
  // чтобы в увеличенном виде была видна сама карта, а не её текущий статус на поле.
  // Реальный объект в G не трогаем — копия одноразовая, только для рендера превью.
  const cleanCard=Object.assign({}, card, {exhausted:false, sleeping:false, feared:false, burning:false});
  const el=mkEl(cleanCard,'preview'); // zone!=='hand' → без кнопок Play/Burn/Zoom, чистая карта для чтения
  el.classList.remove('selected','burning','sleeping','exhausted','feared'); // на случай если G.sel===card.id
  el.classList.add('field-preview-card');
  el.style.position='fixed';
  el.style.margin='0';
  el.style.zIndex='6000';
  el.style.pointerEvents='none';
  document.body.appendChild(el);

  // Сама карта остаётся pointer-events:none (клик по ней должен "проваливаться" сквозь неё —
  // см. zoomHandCardFly/backdrop), но иконки способностей включаем точечно, чтобы наведение
  // на них ловилось тултипом (см. TAG_TOOLTIPS/mousemove в ui.js).
  el.querySelectorAll('.card-tag-icon').forEach(icon=>{ icon.style.pointerEvents='auto'; });

  const targetRect=el.getBoundingClientRect(); // естественный размер .card из CSS (--card-w/--card-h)
  const scaleX=originRect.width/targetRect.width;
  const scaleY=originRect.height/targetRect.height;
  const cx=originRect.left+originRect.width/2;
  const cy=originRect.top+originRect.height/2;

  el.style.left=cx+'px';
  el.style.top=cy+'px';
  el.style.transform=`translate(-50%,-50%) scale(${scaleX},${scaleY})`;
  el.style.transition='none';
  void el.offsetWidth; // форсируем reflow — иначе старт и финиш анимации "склеятся" в один кадр
  el.style.transition='left .25s cubic-bezier(.22,.9,.32,1), top .25s cubic-bezier(.22,.9,.32,1), transform .25s cubic-bezier(.22,.9,.32,1)';
  el.style.left='50%';
  el.style.top='46%';
  el.style.transform=`translate(-50%,-50%) scale(${scale})`;

  fieldPreviewEl=el;
}

function closeFieldCardPreview(){
  if(!fieldPreviewEl) return;
  const el=fieldPreviewEl;
  fieldPreviewEl=null;
  el.style.transition='opacity .15s ease-out, transform .15s ease-out';
  el.style.opacity='0';
  el.style.transform+=' scale(0.85)';
  setTimeout(()=>{ if(el.parentElement) el.remove(); },160);
}

// Рисует МАЛЕНЬКУЮ карту (.card-small) — это ВСЕ существа на боевом поле (battlefield), и только они.
// Сюда же навешиваются игровые состояния: selected (выбрана), sleeping (спит), exhausted (устала),
// feared (в страхе), burning (горит), targetable (можно выбрать целью в текущей фазе), healable (можно вылечить).
// Это единственный рендерер поля боя — .card (mkEl) сюда никогда не попадает.
function mkSmallEl(card){
  const d=document.createElement('div');
  d.className=`card-small ${card.f}-card`;
  d.dataset.id=card.id;
  if(card.id===G.sel)d.classList.add('selected');
  if(card.sleeping)d.classList.add('sleeping');
  if(card.exhausted)d.classList.add('exhausted');
  if(hasTag(card,'invisible')){
    const inv=document.createElement('span');
    inv.className='tag-label';
    inv.textContent='Invis';
    d.appendChild(inv);
  }
  if(card.feared)d.classList.add('feared');
  if(card.burning)d.classList.add('burning');
  if(G.phase==='sacrificeTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable');
  if(G.phase==='selectTarget'&&card.f!==G.turn){
    const oppField=G[card.f].field;
    const attS=G.sel?findC(G.sel):null;
    const targetableS=getTargetableCards(oppField,attS);
    if(targetableS.includes(card.id))d.classList.add('targetable');
  }
  if(G.phase==='shardTarget'&&card.f!==G.turn&&!card.spell&&!card.world&&!card.artifact) d.classList.add('targetable');
  if(G.phase==='healTarget'&&card.f===G.turn&&!card.spell&&!card.world&&!card.artifact&&card.hp<card.maxHp)d.classList.add('healable');
  if(G.phase==='healTarget'&&card.f!==G.turn){
    const oppField2=G[card.f].field;
    const attH=G.sel?findC(G.sel):null;
    const targetableH=getTargetableCards(oppField2,attH);
    if(targetableH.includes(card.id))d.classList.add('targetable');
  }
  if(G.phase==='vardanPick'&&card.f!==G.turn&&!card.sleeping&&!card.exhausted&&!card.feared)d.classList.add('targetable');
  if(G.phase==='vardanAttack'&&card.f===G.turn)d.classList.add('targetable');
  const isSW=card.spell||card.world||card.artifact;
  const TAG_ICONS = {
  'fear':    '<img src="img/ico_fear.png" style="width:60%;height:60%;">',
  'pierce':  '<img src="img/ico_pierce.png" style="width:60%;height:60%;">',
  'regen':   '<img src="img/ico_regen.png" style="width:60%;height:60%;">',
  'burn':    '<img src="img/ico_burn.png" style="width:60%;height:60%;">',
  'rage':    '<img src="img/ico_rage.png" style="width:60%;height:60%;">',
  'provoke': '<img src="img/ico_provoke.png" style="width:60%;height:60%;">',
  'vanguard':'<img src="img/ico_vanguard.png" style="width:60%;height:60%;">',
};
const tagIcons=(card.tags||[])
  .map(t=>t.split(':')[0])
  .filter(t=>TAG_ICONS[t])
  .map(t=>`<div class="card-tag-icon" data-tag="${t}">${TAG_ICONS[t]}</div>`)
  .join('');
  d.innerHTML=`
    <div class="card-small-cost">${card.cost}</div>
    <div class="card-type-dot" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
    ${card.burning?'<div class="card-small-burning"><img src="img/ef_burn.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    ${card.feared?'<div class="card-small-feared"><img src="img/ico_fear.png" style="width:100%;height:100%;object-fit:contain;"></div>':''}
    <div class="card-small-art">${card.img?`<img src="img/cards/${card.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:card.art}</div>
    <div class="card-small-name-box"><div class="card-small-name">${card.name}</div></div>
${!isSW?`<div class="card-small-stats">
  <div class="card-small-hp-box"><span class="card-small-hp">${card.hp}</span></div>
<img src="img/chel.png" class="card-stats-icon">
  <div class="card-small-atk-box"><span class="card-small-atk">${card.atk+(card.atkBonus||0)+(card.rageBonus||0)+(card.squadAtkBonus||0)}</span></div>
</div>`
:`<div class="card-small-stats" style="justify-content:center;"><img src="img/chel.png" class="card-stats-icon"></div></div>`}`;
  if(card.id===G.sel&&card.f===G.turn&&!card.exhausted&&!card.sleeping&&!card.feared){
    const isUmb=hasTag(card,'aoe')&&!card.unique;
    const isVard=hasTag(card,'aoe')&&card.unique;
    if(isUmb||isVard){
      const pop=document.createElement('div');
      pop.className='field-ability-popup';
      if(isUmb){
        const btn=document.createElement('button');
        btn.className='fab-btn umbasir';
        btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;doUmbAsir();};
        pop.appendChild(btn);
      }
      if(isVard){
        const btn=document.createElement('button');
        btn.className='fab-btn vardan';
        btn.onclick=(e)=>{e.stopPropagation();G.sel=card.id;doVardan();};
        pop.appendChild(btn);
      }
      d.appendChild(pop);
    }
  }
  // Долгое нажатие (мышь/палец) — показать превью большой картой по центру, пока держим.
  // Обычный короткий тап — как раньше, выбор/атака через onClick.
  // ВАЖНО (мышь): раньше закрытие превью висело на 'mouseleave' самой карточки — но у маленьких
  // карт поля это крошечная область, и любое дрожание курсора при удержании кнопки уводило
  // указатель за её пределы, из-за чего превью схлопывалось ещё до отпускания кнопки мыши.
  // Поэтому закрытие по мыши теперь ловим на document через 'mouseup' — превью живёт,
  // пока зажата кнопка, независимо от того, где сейчас курсор, и закрывается ровно в момент отпускания.
  let pressTimer=null, pressStart=null, longPressFired=false;
  const clearPressTimer=()=>{ if(pressTimer){clearTimeout(pressTimer);pressTimer=null;} };
  const endMousePress=()=>{
    clearPressTimer();
    if(longPressFired){ longPressFired=false; closeFieldCardPreview(); }
  };
  d.addEventListener('mousedown',(e)=>{
    if(e.button!==0) return;
    pressStart={x:e.clientX,y:e.clientY}; longPressFired=false; clearPressTimer();
    pressTimer=setTimeout(()=>{longPressFired=true;showFieldCardPreview(card,d);},380);
    document.addEventListener('mouseup', endMousePress, {once:true});
  });
  d.addEventListener('touchstart',(e)=>{
    const t=e.touches[0];
    pressStart={x:t.clientX,y:t.clientY}; longPressFired=false; clearPressTimer();
    pressTimer=setTimeout(()=>{longPressFired=true;showFieldCardPreview(card,d);},380);
  },{passive:true});
  d.addEventListener('touchmove',(e)=>{
    if(!pressTimer) return;
    const t=e.touches[0];
    if(Math.abs(t.clientX-pressStart.x)>10||Math.abs(t.clientY-pressStart.y)>10) clearPressTimer();
  },{passive:true});
  ['touchend','touchcancel'].forEach(evt=>{
    d.addEventListener(evt,()=>{ clearPressTimer(); if(longPressFired){longPressFired=false;closeFieldCardPreview();} });
  });
  d.addEventListener('click',(e)=>{
    if(longPressFired){ e.stopPropagation(); longPressFired=false; return; }
    onClick(card,'field');
  });
  d.addEventListener('mouseenter',()=>playSfx('Navigation_Cursor'));
  return d;
}

// ── Зум карты в руке (кнопка Zoom): используем ТОТ ЖЕ клон-механизм, что и у превью поля
// (showFieldCardPreview/closeFieldCardPreview) — рисуем отдельную увеличенную копию по центру
// экрана, а не двигаем сам элемент руки. Раньше карта "летела" через position:fixed на оригинале,
// но на мобиле карта в момент клика по Zoom ещё имеет класс .previewed, а для него carousel.js
// держит свой @media-стиль с !important (свой transform/opacity/transition) — это перебивало
// анимацию, из-за чего карта не долетала до центра и рендерилась смещённой. Клон не имеет
// класса .previewed и не зависит от того, что происходит с оригиналом в руке (в т.ч. от
// пересборки DOM руки при следующем render()), поэтому центрируется одинаково на любом устройстве.
//
// Пока карта зумлена — поверх игры лежит полупрозрачный бэкдроп (.card-preview-backdrop,
// z-index чуть ниже клона карты, но выше всего остального), который блокирует клики по картам/
// кнопкам "за" увеличенной картой. Сама карта внутри клона pointer-events:none (см.
// showFieldCardPreview), поэтому клик по ней проваливается сквозь неё прямо на бэкдроп —
// а клик по бэкдропу, как и по чему угодно ещё на экране, всплывает до document и закрывает зум
// (единственное исключение — иконки способностей, у них pointer-events:auto ради тултипов,
// но клик по ним тоже долетает до document и тоже закрывает зум).
let previewBackdropEl=null;

function zoomHandCardFly(card, originEl){
  if(previewBackdropEl){ previewBackdropEl.remove(); previewBackdropEl=null; } // на всякий случай
  const backdrop=document.createElement('div');
  backdrop.className='card-preview-backdrop';
  document.body.appendChild(backdrop);
  previewBackdropEl=backdrop;

  showFieldCardPreview(card, originEl, HAND_ZOOM_SCALE);
  setTimeout(()=>{
    document.addEventListener('click', closeZoomHandCard, {once:true});
  }, 0);
}

function closeZoomHandCard(){
  closeFieldCardPreview();
  if(previewBackdropEl){
    const bd=previewBackdropEl;
    previewBackdropEl=null;
    bd.style.opacity='0';
    setTimeout(()=>{ if(bd.parentElement) bd.remove(); },160);
  }
}

// Рисует БОЛЬШУЮ карту (.card) — используется для руки (zone='hand') и кладбища (zone='grave').
// На боевое поле НЕ попадает (поле всегда рисует mkSmallEl, см. rZone). Внутри есть отдельная
// ранняя ветка для card.world (Миры выглядят иначе: без арта/статов, с особым фоном текстового блока) —
// она строит свой innerHTML и сразу делает return; всё что ниже (строка с обычным innerHTML) —
// для всех остальных типов карт: существ, заклинаний, артефактов.
function mkEl(card,zone){
  const d=document.createElement('div');
  d.className=`card ${card.f}-card`;
  d.style.flexShrink='0';
  d.dataset.id=card.id;
  if(card.id===G.sel)d.classList.add('selected');
  if(card.burning)d.classList.add('burning');
  if(card.sleeping)d.classList.add('sleeping');
  if(card.exhausted)d.classList.add('exhausted');
  if(hasTag(card,'invisible')){
    const inv=document.createElement('span');
    inv.className='tag-label';
    inv.textContent='👻 Invis';
    d.appendChild(inv);
  }
  if(card.feared)d.classList.add('feared');
  // ВНИМАНИЕ: блоки про targetable/healable с проверкой zone==='field' раньше были тут,
  // но удалены — mkEl() никогда не вызывается с zone='field' (см. rZone ниже: поле всегда рисует mkSmallEl).
  // Если в будущем захочешь дать персистентным/ручным картам подсветку targetable — добавляй проверки сюда заново,
  // но без условия zone==='field', а под актуальную зону (например zone==='hand' или отдельный 'persist').

  const isSW=card.spell||card.world||card.artifact;
  const TAG_ICONS = {
  'fear':    '<img src="img/ico_fear.png" style="width:60%;height:60%;">',
  'pierce':  '<img src="img/ico_pierce.png" style="width:60%;height:60%;">',
  'regen':   '<img src="img/ico_regen.png" style="width:60%;height:60%;">',
  'burn':    '<img src="img/ico_burn.png" style="width:60%;height:60%;">',
  'rage':    '<img src="img/ico_rage.png" style="width:60%;height:60%;">',
  'provoke': '<img src="img/ico_provoke.png" style="width:60%;height:60%;">',
  'vanguard':'<img src="img/ico_vanguard.png" style="width:60%;height:60%;">',
};
const tagIcons = (card.tags||[])
  .map(t=>t.split(':')[0])
  .filter(t=>TAG_ICONS[t])
  .map(t=>`<div class="card-tag-icon" data-tag="${t}">${TAG_ICONS[t]}</div>`)
  .join('');
  // ── Ветка для карт-Миров: своя разметка (без card-art и card-stats), свой фон ──
  if(card.world){
  d.classList.add('world-card');
  if(card.img){
    d.style.cssText += ';background-image:url(\'img/cards/'+card.img+'\')!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;';
  }
  d.innerHTML=`
    <div class="card-cost">${card.cost}</div>
    <div class="card-type-dot" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    <div class="card-name-box"><div class="card-name">${card.name}</div></div>
    <div class="card-ability-box"><div class="card-ability">${card.ab}</div></div>`;
  if(card.id===G.previewCard&&zone==='hand'){
    d.classList.add('previewed');
    d.style.zIndex='';
    const cur=G[G.turn];
    // Play — попап по центру сверху карты (как было)
    if(cur.ess>=card.cost){
      const popup=document.createElement('div');
      popup.className='card-actions-popup';
      const playBtn=document.createElement('button');
      playBtn.className='cap-btn play';
      playBtn.onclick=(e)=>{e.stopPropagation();playSfx('Click_Cursor');G.previewCard=null;doPlay(card);};
      popup.appendChild(playBtn);
      d.appendChild(popup);
    } else {
      const popup=document.createElement('div');
      popup.className='card-actions-popup';
      const noEss=document.createElement('div');
      noEss.className='cap-no-ess';
      noEss.innerHTML='Not enough <img src="img/ess.png" class="cap-no-ess-icon">';
      popup.appendChild(noEss);
      d.appendChild(popup);
    }
    // Burn — отдельный попап СПРАВА от карты
    if(!cur.burned){
      const burnPopup=document.createElement('div');
      burnPopup.className='card-actions-popup-right';
      const burnBtn=document.createElement('button');
      burnBtn.className='cap-btn burn';
      burnBtn.onclick=(e)=>{e.stopPropagation();playSfx('Burn_Card');G.previewCard=null;doBurnCard(card);};
      burnPopup.appendChild(burnBtn);
      d.appendChild(burnPopup);
    }
    // Zoom — отдельный попап СЛЕВА от карты: клик показывает увеличенный клон карты по центру
    // экрана (zoomHandCardFly), повторный тап/клик в любом месте экрана убирает клон обратно
    const zoomPopup=document.createElement('div');
    zoomPopup.className='card-actions-popup-left';
    const zoomBtn=document.createElement('button');
    zoomBtn.className='cap-btn zoom';
    zoomBtn.onclick=(e)=>{e.stopPropagation();playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');zoomHandCardFly(card,d);};
    zoomPopup.appendChild(zoomBtn);
    d.appendChild(zoomPopup);
  }
  d.addEventListener('click',(e)=>{e.stopPropagation();onClick(card,zone);});
  d.addEventListener('mouseenter',()=>{ if(zone==='hand') playSfx('Navigation_Cursor'); });
  return d;
}
  // ── Обычная разметка (существа/заклинания/артефакты): арт, статы, способность ──
  d.innerHTML=`
    <div class="card-cost">${card.cost}</div>
    <div class="card-type-dot" style="background-image:url('${getTypeDotImg(card)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    ${card.burning?'<div class="burning-icon"></div>':''}
    <div class="card-art">${card.img?`<img src="img/cards/${card.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:card.art}</div>
    ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
    <div class="card-name-box"><div class="card-name">${card.name}</div></div>
    ${!isSW?`<div class="card-stats">
      <div class="card-hp-box"><span class="card-hp"><img src="./img/heart.png" class="stat-icon">${card.maxHp}</span></div>
<img src="img/chel.png" class="card-stats-icon">
      <div class="card-atk-box"><span class="card-atk"><img src="./img/attack.png" class="stat-icon">${card.atk+(card.atkBonus||0)+(card.rageBonus||0)+(card.squadAtkBonus||0)}</span></div>
    </div>`
      :`<div class="card-stats" style="justify-content:center;"><img src="img/chel.png" class="card-stats-icon"></div>`}
    <div class="card-ability-box"><div class="card-ability">${card.ab}</div></div>`;
  if(card.id===G.previewCard&&zone==='hand'){
    d.classList.add('previewed');
    d.style.zIndex='';
    const cur=G[G.turn];
    // Play — попап по центру сверху карты (как было)
    if(cur.ess>=card.cost){
      const popup=document.createElement('div');
      popup.className='card-actions-popup';
      const playBtn=document.createElement('button');
      playBtn.className='cap-btn play';
      playBtn.onclick=(e)=>{e.stopPropagation();playSfx('Click_Cursor');G.previewCard=null;doPlay(card);};
      popup.appendChild(playBtn);
      d.appendChild(popup);
    } else {
      const popup=document.createElement('div');
      popup.className='card-actions-popup';
      const noEss=document.createElement('div');
      noEss.className='cap-no-ess';
      noEss.innerHTML='Not enough <img src="img/ess.png" class="cap-no-ess-icon">';
      popup.appendChild(noEss);
      d.appendChild(popup);
    }
    // Burn — отдельный попап СПРАВА от карты
    if(!cur.burned){
      const burnPopup=document.createElement('div');
      burnPopup.className='card-actions-popup-right';
      const burnBtn=document.createElement('button');
      burnBtn.className='cap-btn burn';
      burnBtn.onclick=(e)=>{e.stopPropagation();playSfx('Burn_Card');G.previewCard=null;doBurnCard(card);};
      burnPopup.appendChild(burnBtn);
      d.appendChild(burnPopup);
    }
    // Zoom — отдельный попап СЛЕВА от карты: клик показывает увеличенный клон карты по центру
    // экрана (zoomHandCardFly), повторный тап/клик в любом месте экрана убирает клон обратно
    const zoomPopup=document.createElement('div');
    zoomPopup.className='card-actions-popup-left';
    const zoomBtn=document.createElement('button');
    zoomBtn.className='cap-btn zoom';
    zoomBtn.onclick=(e)=>{e.stopPropagation();playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');zoomHandCardFly(card,d);};
    zoomPopup.appendChild(zoomBtn);
    d.appendChild(zoomPopup);
  }
  d.addEventListener('click',(e)=>{e.stopPropagation();onClick(card,zone);});
  d.addEventListener('mouseenter',()=>{ if(zone==='hand') playSfx('Navigation_Cursor'); });
  return d;
}


// Перерисовывает целую зону (поле боя ИЛИ руку) по списку карт.
// Для zone='field': умеет анимировать "умирание" карт (класс dying + удаление через 400мс)
// и обновлять уже существующие элементы на месте (чтобы не сбрасывалась подсветка targetable),
// новые карты получают класс entering для анимации появления. Рисует через mkSmallEl.
// Для остальных зон (zone='hand' и т.п.) — просто очищает контейнер и рисует заново через mkEl.
function rZone(id,cards,zone){
  const el=document.getElementById(id);
  if(zone==='field'){
    const dying=[];
    el.querySelectorAll('.card-small').forEach(cardEl=>{
      const stillExists=cards.find(c=>String(c.id)===cardEl.dataset.id);
      if(!stillExists) dying.push(cardEl);
    });
    dying.forEach(cardEl=>{
      cardEl.classList.add('dying');
      cardEl.style.pointerEvents='none';
    });
    if(dying.length>0){
      setTimeout(()=>{
        dying.forEach(cardEl=>{if(cardEl.parentElement)cardEl.remove();});
      }, 400);
      // Build map of live (non-dying) existing elements
      const existingMap={};
      el.querySelectorAll('.card-small:not(.dying)').forEach(cardEl=>{
        existingMap[cardEl.dataset.id]=cardEl;
      });
      // Update live cards in-place (fixes targetable staying lit), add new ones with entering
      cards.forEach(c=>{
        if(existingMap[String(c.id)]){
          existingMap[String(c.id)].replaceWith(mkSmallEl(c));
        } else {
          const cardEl=mkSmallEl(c);
          cardEl.classList.add('entering');
          el.appendChild(cardEl);
        }
      });
      return;
    }
  }
  const existingIds=new Set([...el.querySelectorAll('.card-small')].map(e=>e.dataset.id));
  el.innerHTML='';
  cards.forEach(c=>{
    if(zone==='field'){
      const cardEl=mkSmallEl(c);
      if(!existingIds.has(String(c.id))) cardEl.classList.add('entering');
      el.appendChild(cardEl);
    } else {
      el.appendChild(mkEl(c,zone));
    }
  });
}

// Рисует ЧУЖУЮ руку — карты рубашкой вверх (картинка runaha.png), без данных о содержимом.
// Количество "рубашек" = реальное количество карт у оппонента, сами карты не раскрываются.
// ВАЖНО: id контейнера (#teaHand/#jeetHand) переиспользуется и под открытую руку (через rZone/.card),
// и под скрытую (через эту функцию/.card-mini) — в зависимости от того, чей сейчас ход.
// Поэтому сначала проверяем, что внутри уже лежат корректные .card-mini (а не "осиротевшие" .card
// от прошлого хода, когда этот же контейнер был открытой рукой) — если нет, делаем полный ребилд.
// Если тип верный — только дозаполняем/обрезаем по количеству, не трогая лишний раз DOM (анти-дёрганье).
function rHiddenHand(id,cards,faction){
  const el=document.getElementById(id);
  el.className='hand-mini';
  const wrongType = [...el.children].some(c=>!c.classList.contains('card-mini'));
  if(wrongType){
    el.innerHTML='';
  }
  const have=el.children.length;
  const need=cards.length;
  if(have>need){
    for(let i=0;i<have-need;i++) el.lastElementChild.remove();
  } else if(need>have){
    for(let i=0;i<need-have;i++){
      const d=document.createElement('div');
      d.className=`card-mini ${faction}-mini`;
      d.style.backgroundImage="url('img/runaha.png')";
      d.style.backgroundSize='cover';
      d.style.backgroundPosition='bottom';
      el.appendChild(d);
    }
  }
}

// Рисует персистентную зону игрока (.persist) — уже СЫГРАННЫЕ Мир и Артефакты под полем боя.
// ВАЖНО: рендерится НЕ через mkEl/.card, а отдельной упрощённой разметкой .pcard (просто текст
// иконка+название в рамке) — поэтому у Worlds/Artifacts на поле нет арта/статов, как у обычных карт.
// Также здесь живёт игровая логика щитов/кликов для активных артефактов с тегами 'shard' (можно
// активировать раз за ход) и 'sacrifice' (требует жертвы существа для активации).
// rPersist — pcards перенесены в stats bar (_mkPcardHtml).
// Зоны persist на поле оставляем пустыми.
function rPersist(id,player){
  const el=document.getElementById(id);
  if(el) el.innerHTML='';
}


// Генерирует HTML-строку для pcard в стат-баре.
// isPlayer=true — добавляет onclick-обработчики для активных артефактов текущего игрока.
function _mkPcardHtml(card, isPlayer){
  if(!card) return '';
  const faction=card.f;
  const cls=faction==='tea'?'tcp':'jcp';
  const isActivatable=hasTag(card,'shard')||hasTag(card,'sacrifice');
  const sleepCls=(isActivatable&&card.sleeping)?' sleeping':'';
  const readyCls=(isPlayer&&isActivatable&&!card.sleeping&&!card.exhausted)?' pcard-active':'';
  // "Устал"/"спит" — прозрачность вешаем только на текст (.pcard-text ниже), а не на весь .pcard,
  // иначе вместе с текстом гаснет и фон-рамка со спрайтом створок, что выглядит как баг.
  const textExhaustedStyle=(isActivatable&&card.exhausted)?'opacity:0.5;':'';

  let onclick='';
  // pcard-targeting: карта в режиме "выбери цель для активации" (shardTarget/sacrificeTarget).
  // Раньше в этот момент подменялся весь border на плоский 2px solid — рамка со спрайтом створок
  // пропадала и визуально "усаживалась". Теперь рамка не трогается вообще, меняется только текст
  // (см. .pcard-targeting .pcard-text в styles.css — белый цвет + медленное мигание).
  let targetingCls='';
  if(isPlayer&&!card.sleeping&&!card.exhausted){
    if(hasTag(card,'shard')){
      if(G.phase==='shardTarget'){
        targetingCls=' pcard-targeting';
        onclick=`onclick="event.stopPropagation();playSfx('Click_Cursor');doShard(G[G.turn].artifacts[0])"`;
      } else if(G.phase==='action'){
        onclick=`onclick="event.stopPropagation();playSfx('Click_Cursor');doShard(G[G.turn].artifacts[0])"`;
      }
    }
    if(hasTag(card,'sacrifice')){
      if(G.phase==='sacrificeTarget'){
        targetingCls=' pcard-targeting';
        onclick=`onclick="event.stopPropagation();G.phase='action';G.sel=null;render()"`;
      } else if(G.phase==='action'){
        onclick=`onclick="event.stopPropagation();playSfx('Click_Cursor');G.phase='sacrificeTarget';G.sel='${card.id}';lg('Altar: select a creature to sacrifice.','hint');render()"`;
      }
    }
  }
  const safeAb=(card.ab||'').replace(/"/g,"'");
  return `<div class="pcard pcard-inline ${cls}${sleepCls}${readyCls}${targetingCls}" data-pid="${card.id}" title="${safeAb}" ${onclick}><span class="pcard-text" style="${textExhaustedStyle}">${card.art||''} ${card.name}</span></div>`;
}

// Слот Мир/Артефакт в стат-баре: если карта уже сыграна — обычный pcard (см. _mkPcardHtml выше),
// если нет — постоянный плейсхолдер с фоном фракции (pcard_tea_bg.png слева от HP у Tea,
// pcard_jeet_bg.png справа от эссенции у Jeet, и наоборот у оппонента), той же ширины/высоты.
// ВАЖНО: раньше при отсутствии карты слот вообще не рендерился (пустая строка) — из-за этого
// стат-бар при розыгрыше Мира/Артефакта "прыгал" (слот появлялся и всё вокруг сдвигалось),
// а потом ещё раз перевыравнивался при розыгрыше второго слота. Плейсхолдер держит место
// зарезервированным с самого начала партии, поэтому появление реальной карты слот не двигает —
// она просто подставляется на уже занятое место.
function _mkPcardSlotHtml(card, faction, isPlayer){
  if(card) return _mkPcardHtml(card, isPlayer);
  const cls=faction==='tea'?'tcp':'jcp';
  return `<div class="pcard pcard-inline pcard-placeholder ${cls}"></div>`;
}

// ── Долгое нажатие/удержание на pcard (уже сыгранный Мир/Артефакт в стат-баре) — то же превью
// большой картой по центру экрана, что и у карт поля боя (showFieldCardPreview, см. mkSmallEl).
// Реализовано через делегирование на document, а не через addEventListener на самом .pcard —
// потому что стат-бар целиком пересоздаётся (innerHTML) на каждый render(), и вешать/снимать
// листенеры на каждый элемент заново было бы дороже и легко потерять при перерисовке во время
// самого удержания (например, если что-то в игре обновится, пока палец/кнопка ещё зажаты).
function findPersistCardById(id){
  for(const f of ['tea','jeet']){
    const p=G[f];
    if(p.world&&String(p.world.id)===String(id)) return p.world;
    const art=(p.artifacts||[]).find(a=>String(a.id)===String(id));
    if(art) return art;
  }
  return null;
}

let pcardPressTimer=null, pcardPressStart=null, pcardLongPressFired=false, pcardPressEl=null;
let suppressNextPcardClick=false; // гасит клик-активацию (shard/sacrifice) сразу после удержания
const clearPcardPressTimer=()=>{ if(pcardPressTimer){clearTimeout(pcardPressTimer);pcardPressTimer=null;} };
const endPcardPress=()=>{
  clearPcardPressTimer();
  if(pcardLongPressFired){
    pcardLongPressFired=false;
    closeFieldCardPreview();
    suppressNextPcardClick=true;
  }
  pcardPressEl=null;
};

document.addEventListener('mousedown',(e)=>{
  if(e.button!==0) return;
  const pcardEl=e.target.closest('.pcard[data-pid]'); // у плейсхолдера нет data-pid — он не участвует
  if(!pcardEl) return;
  const card=findPersistCardById(pcardEl.dataset.pid);
  if(!card) return;
  pcardPressEl=pcardEl; pcardPressStart={x:e.clientX,y:e.clientY}; pcardLongPressFired=false; clearPcardPressTimer();
  pcardPressTimer=setTimeout(()=>{pcardLongPressFired=true;showFieldCardPreview(card,pcardEl);},380);
  // Закрытие по mouseup на document (не на самом .pcard) — та же причина, что и у карт поля:
  // маленький элемент, курсор легко "убегает" за его пределы при удержании.
  document.addEventListener('mouseup', endPcardPress, {once:true});
});
document.addEventListener('touchstart',(e)=>{
  const pcardEl=e.target.closest('.pcard[data-pid]');
  if(!pcardEl) return;
  const card=findPersistCardById(pcardEl.dataset.pid);
  if(!card) return;
  const t=e.touches[0];
  pcardPressEl=pcardEl; pcardPressStart={x:t.clientX,y:t.clientY}; pcardLongPressFired=false; clearPcardPressTimer();
  pcardPressTimer=setTimeout(()=>{pcardLongPressFired=true;showFieldCardPreview(card,pcardEl);},380);
},{passive:true});
document.addEventListener('touchmove',(e)=>{
  if(!pcardPressTimer||!pcardPressEl) return;
  const t=e.touches[0];
  if(Math.abs(t.clientX-pcardPressStart.x)>10||Math.abs(t.clientY-pcardPressStart.y)>10) clearPcardPressTimer();
},{passive:true});
['touchend','touchcancel'].forEach(evt=>{
  document.addEventListener(evt,()=>{
    if(!pcardPressEl) return;
    clearPcardPressTimer();
    if(pcardLongPressFired){ pcardLongPressFired=false; closeFieldCardPreview(); suppressNextPcardClick=true; }
    pcardPressEl=null;
  });
});
// Фаза capture — успевает перехватить клик ДО того, как сработает inline onclick самого .pcard
// (активация shard/sacrifice артефакта), чтобы отпускание после удержания не активировало карту.
document.addEventListener('click',(e)=>{
  if(!suppressNextPcardClick) return;
  suppressNextPcardClick=false;
  if(e.target.closest('.pcard[data-pid]')){ e.stopPropagation(); e.preventDefault(); }
},true);

// Переставляет DOM-элементы местами в Hot Seat режиме: чужие зоны (поле/рука/статбар) — наверх экрана,
// свои — вниз, в зависимости от того, чей сейчас ход (G.turn). Физически перемещает существующие
// .field/.persist/.hand элементы между контейнерами, а не пересоздаёт их — поэтому быстро и без потери стейта.
//
// _seenPcardPids — pid Мира/Артефакта, для которых анимация входа (pcard-entering) уже была
// проиграна хотя бы раз. ВАЖНО: раньше "уже видели или нет" определялось по содержимому конкретного
// DOM-контейнера (#oppStats/#playerStats) на прошлом рендере — но при смене хода эти контейнеры
// физически меняют, какую фракцию показывают (см. oppK/playerK ниже), поэтому давно сыгранная
// карта каждый ход "внезапно" оказывалась в контейнере, где её раньше не было, и анимация входа
// проигрывалась заново. Глобальный Set не привязан к контейнеру — карта анимируется один раз за игру.
const _seenPcardPids = new Set();

// Подмена кнопки End Turn на плейсхолдер ожидания (btn_wait.gif) во время хода ИИ
// в режиме VS AI. Панель у человека при этом НЕ скрывается (см. render()/reorderZones()) —
// меняется только сама кнопка, клик по ней недоступен на время хода ИИ.
function updateEndTurnBtn(){
  const btn=document.getElementById(G.humanFaction+'EndTurnBtn');
  if(!btn) return;
  const aiTurn = (G.mode==='vsai' && G.turn===G.aiFaction);
  btn.classList.toggle('btn-waiting', aiTurn);
}

function reorderZones(){
  let oppK,playerK;
  if(G.mode==='vsai'){
    playerK=G.humanFaction;
    oppK=G.aiFaction;
  } else {
    oppK=G.turn==='tea'?'jeet':'tea';
    playerK=G.turn;
  }
  const oppP=G[oppK];
  const playerP=G[playerK];

  const oppStats=document.getElementById('oppStats');
  const playerStats=document.getElementById('playerStats');
  if(oppStats){
    oppStats.className='stats-bar '+(oppK==='jeet'?'jeet':'tea');
    oppStats.innerHTML=`
  <span class="statbar-extra"></span>
  ${_mkPcardSlotHtml(oppP.world, oppK, false)}
  <span class="hp-placeholder"></span>
  <span class="stat stat-hp-box ${oppK}-hp-box"><img src="./img/hp_${oppK}.png" class="stat-icon"> <span class="stat-val hp-val" id="${oppK}Hp">${oppP.hp}</span></span>
  <span class="player-name-box ${oppK}-name-box" role="img" aria-label="${oppK==='jeet'?'JEET CORE':'TAVERN'}" onclick="event.stopPropagation();onBaseClick('${oppK}')"></span>
  <span class="stat stat-ess-box ${oppK}-ess-box"><img src="./img/ess.png" class="stat-icon"> <span class="ess-val" id="${oppK}Ess">${oppP.ess}</span>/<span id="${oppK}EssMax">${oppP.essMax}</span></span>
  ${_mkPcardSlotHtml(oppP.artifacts[0]||null, oppK, false)}
  <span class="statbar-extra"></span>
  <span class="statbar-edge-right"></span>`;
    oppStats.querySelectorAll('[data-pid]').forEach(el=>{
      const pid=el.dataset.pid;
      if(!_seenPcardPids.has(pid)){ _seenPcardPids.add(pid); el.classList.add('pcard-entering'); }
    });
  }
  if(playerStats){
    playerStats.className='stats-bar '+(playerK==='jeet'?'jeet':'tea');
    playerStats.innerHTML=`
  <span class="statbar-extra"></span>
  ${_mkPcardSlotHtml(playerP.world, playerK, false)}
  <span class="hp-placeholder"></span>
  <span class="stat stat-hp-box ${playerK}-hp-box"><img src="./img/hp_${playerK}.png" class="stat-icon"> <span class="stat-val hp-val" id="${playerK}Hp">${playerP.hp}</span></span>
  <span class="player-name-box ${playerK}-name-box" role="img" aria-label="${playerK==='jeet'?'JEET CORE':'TAVERN'}" onclick="event.stopPropagation();onBaseClick('${playerK}')"></span>
  <span class="stat stat-ess-box ${playerK}-ess-box"><img src="./img/ess.png" class="stat-icon"> <span class="ess-val" id="${playerK}Ess">${playerP.ess}</span>/<span id="${playerK}EssMax">${playerP.essMax}</span></span>
  ${_mkPcardSlotHtml(playerP.artifacts[0]||null, playerK, true)}
  <span class="statbar-extra"></span>
  <span class="statbar-edge-right"></span>`;
    playerStats.querySelectorAll('[data-pid]').forEach(el=>{
      const pid=el.dataset.pid;
      if(!_seenPcardPids.has(pid)){ _seenPcardPids.add(pid); el.classList.add('pcard-entering'); }
    });
  }

  const oppFieldZone=document.getElementById('oppFieldZone');
  const playerFieldZone=document.getElementById('playerFieldZone');
  const jeetField=document.getElementById('jeetField');
  const jeetPersist=document.getElementById('jeetPersist');
  const teaField=document.getElementById('teaField');
  const teaPersist=document.getElementById('teaPersist');

  if(oppFieldZone&&playerFieldZone){
    if(oppK==='jeet'){
      if(jeetField&&jeetField.parentElement!==oppFieldZone) oppFieldZone.appendChild(jeetField);
      if(jeetPersist&&jeetPersist.parentElement!==oppFieldZone) oppFieldZone.appendChild(jeetPersist);
      if(teaField&&teaField.parentElement!==playerFieldZone) playerFieldZone.appendChild(teaField);
      if(teaPersist&&teaPersist.parentElement!==playerFieldZone) playerFieldZone.appendChild(teaPersist);
    } else {
      if(teaField&&teaField.parentElement!==oppFieldZone) oppFieldZone.appendChild(teaField);
      if(teaPersist&&teaPersist.parentElement!==oppFieldZone) oppFieldZone.appendChild(teaPersist);
      if(jeetField&&jeetField.parentElement!==playerFieldZone) playerFieldZone.appendChild(jeetField);
      if(jeetPersist&&jeetPersist.parentElement!==playerFieldZone) playerFieldZone.appendChild(jeetPersist);
    }
  }

  const oppHandZone=document.getElementById('oppHandZone');
  const playerHandZone=document.getElementById('playerHandZone');
  const jeetHand=document.getElementById('jeetHand');
  const teaHand=document.getElementById('teaHand');
  if(oppHandZone&&playerHandZone){
    if(oppK==='jeet'){
      if(jeetHand&&jeetHand.parentElement!==oppHandZone) oppHandZone.appendChild(jeetHand);
      if(teaHand&&teaHand.parentElement!==playerHandZone) playerHandZone.appendChild(teaHand);
    } else {
      if(teaHand&&teaHand.parentElement!==oppHandZone) oppHandZone.appendChild(teaHand);
      if(jeetHand&&jeetHand.parentElement!==playerHandZone) playerHandZone.appendChild(jeetHand);
    }
  }

  const teaBB=document.getElementById('teaBottomBar');
  const jeetBB=document.getElementById('jeetBottomBar');
  if(G.mode==='vsai'){
    const humanBB=document.getElementById(G.humanFaction+'BottomBar');
    const aiBB=document.getElementById(G.aiFaction+'BottomBar');
    if(aiBB) aiBB.style.display='none';
    if(humanBB) humanBB.style.display='flex';
  } else {
    if(teaBB) teaBB.style.display=G.turn==='tea'?'flex':'none';
    if(jeetBB) jeetBB.style.display=G.turn==='jeet'?'flex':'none';
  }
}

// Динамически считает отрицательный margin между картами в руке, чтобы они "веером" перекрывали друг
// друга и помещались в ширину контейнера, если карт много. Отдельно считает для .card (полноразмерные
// карты в открытой руке) и .card-mini (рубашки в чужой скрытой руке).
// ВАЖНО: ширину меряем у РОДИТЕЛЯ (el.parentElement = .opp-hand-zone/.player-hand-zone), а не у самого el —
// el сам по себе сжимается вместе со своими отрицательными margin (раз элементы переиспользуются между
// рендерами, а не пересоздаются), и измерение его собственной ширины создавало цикл само-сжатия
// ("карты схлопываются к центру" с каждым рендером всё туже). Родительская зона на margin детей не влияет,
// поэтому даёт стабильное число каждый раз.
// ПРИМЕЧАНИЕ: ищет родителя с классом .player-hand-wrap — такого класса сейчас нет в разметке
// (зона руки называется .player-hand-zone), поэтому wrap всегда null и используется запасной вариант —
// ширина el.parentElement. Если когда-нибудь понадобится именно .player-hand-wrap —
// переименуй класс в разметке либо поменяй селектор здесь на актуальный.
function adjustHandOverlap(){
  ['teaHand','jeetHand'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const wrap=el.closest('.player-hand-wrap');
    let containerW=wrap?wrap.getBoundingClientRect().width:el.parentElement.getBoundingClientRect().width;
    containerW=Math.floor(containerW)-12;
    if(containerW<=20) containerW=window.innerWidth-90-24;
    if(containerW<=20)return;

    const cards=el.querySelectorAll('.card');
    if(cards.length>0){
      const cardW=cards[0].getBoundingClientRect().width||parseFloat(getComputedStyle(cards[0]).width)||118;
      const total=cards.length;
      let margin=0;
      if(total>1){
        const totalW=cardW*total + (total-1)*8;
        if(totalW>containerW){
          margin=-Math.ceil((totalW-containerW)/(total-1));
          const minVisible=Math.floor(cardW*0.12);
          margin=Math.max(margin,-(cardW-minVisible));
        }
      }
      cards.forEach((card,i)=>{
        card.style.marginRight=i===total-1?'0px':margin+'px';
        if(!G.previewCard||card.dataset.id!==G.previewCard){
          card.style.zIndex=String(i+1);
        } else {
          card.style.zIndex='';
        }
        card.style.flexShrink='0';
      });
    }

    const mini=el.querySelectorAll('.card-mini');
    if(mini.length>0){
      const cardW=mini[0].getBoundingClientRect().width||parseFloat(getComputedStyle(mini[0]).width)||36;
      const total=mini.length;
      let margin=-8;
      if(total>1){
        const needed=cardW*total;
        if(needed>containerW){
          margin=-Math.floor((needed-containerW)/(total-1))-1;
          const minVisible=Math.floor(cardW*0.12);
          margin=Math.max(margin,-(cardW-minVisible));
        }
      }
      mini.forEach((card,i)=>{
        card.style.marginRight=i===total-1?'0px':margin+'px';
        card.style.zIndex=String(i+1);
      });
    }
  });
}
