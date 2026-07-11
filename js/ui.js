// ── Background music ─────────────────────────────────────────────
const MUSIC_TARGET_VOLUME = 0.4;
const FADE_MS = 900; // длительность плавного появления/затухания музыки

// ── Modal pop-in/pop-out (frame + button-plate move as ONE rigid body) ────
// ПЕРЕДЕЛАНО 2026-07-07: раньше анимировали .modal и .modal-footer-plate
// отдельно, синхронно по классу/таймингу — тайминги совпадали, но визуально
// всё равно читалось как два разных объекта (разный размер → разная
// абсолютная скорость роста при одном и том же scale-диапазоне). Теперь
// анимируется .modal-stack ЦЕЛИКОМ, одним классом — .modal-stack по размеру
// равен .modal (плита вне потока), так что pivot не изменился, а плита,
// будучи ребёнком .modal-stack, скейлится вместе с рамкой как одна жёсткая
// деталь, сохраняя свой собственный статичный translate(-50%,50%) (см.
// комментарий у .modal-stack в styles.css — трансформы по дереву
// композируются, а не перезаписывают друг друга).
function _modalPopIn(overlayEl){
  const stack=overlayEl.querySelector('.modal-stack');
  if(!stack) return;
  stack.classList.remove('modal-pop-in','modal-pop-out');
  void stack.offsetWidth;
  stack.classList.add('modal-pop-in');
}
// Общий лок на время перехода — БЕЗ него повторный клик по кнопке модалки посреди
// pop-out анимации (~250-315мс) планирует ВТОРОЙ setTimeout(onDone,...), и оба onDone
// срабатывают по очереди (репорт автора: два клика по "Ready" после муллигана — и
// анимация "Battle begins!"/раскрытия арены играется дважды подряд). Пока лок взведён,
// _modalPopOut() ничего не делает — визуально ровно то же "тыканье в никуда", что и у
// ворот на лендинге (см. openGates()/_gateOpening). Снимается сам, в момент срабатывания
// onDone — к этому моменту следующий экран/модалка уже показывается, и клики по НЕЙ
// (не по той, что уже закрылась) снова работают нормально.
let _modalTransitioning=false;
function _modalPopOut(overlayEl, onDone, delay){
  if(_modalTransitioning) return;
  _modalTransitioning=true;
  const stack=overlayEl.querySelector('.modal-stack');
  if(stack){
    stack.classList.remove('modal-pop-in','modal-pop-out');
    void stack.offsetWidth;
    stack.classList.add('modal-pop-out');
  }
  setTimeout(()=>{
    _modalTransitioning=false;
    if(onDone) onDone();
  }, delay!=null?delay:250);
}

let musicEnabled = localStorage.getItem('hj_music') !== 'off';
let _fadeRAF = null;

function _getMusicEl(){ return document.getElementById('bgMusic'); }

// Плавно меняет volume аудио-элемента от текущего значения к target за duration мс.
// onDone вызывается по завершении (например, чтобы поставить .pause()).
function _fadeVolume(audio, target, duration, onDone){
  if(!audio) return;
  if(_fadeRAF) cancelAnimationFrame(_fadeRAF);
  const start = audio.volume;
  const startTime = performance.now();
  function step(now){
    const t = Math.min(1, (now - startTime) / duration);
    audio.volume = start + (target - start) * t;
    if(t < 1){
      _fadeRAF = requestAnimationFrame(step);
    } else {
      _fadeRAF = null;
      if(onDone) onDone();
    }
  }
  _fadeRAF = requestAnimationFrame(step);
}

function _refreshMusicBtn(){
  const btn = document.getElementById('musicToggleBtn');
  if(btn){
    btn.classList.toggle('music-on', musicEnabled);
    btn.classList.toggle('music-off', !musicEnabled);
  }
  const hamBtn = document.getElementById('hamMusicBtn');
  if(hamBtn) hamBtn.textContent = musicEnabled ? 'Music: On' : 'Music: Off';
}

function toggleMusic(){
  musicEnabled = !musicEnabled;
  localStorage.setItem('hj_music', musicEnabled ? 'on' : 'off');
  _refreshMusicBtn();
  if(musicEnabled) playSfx('yellow_buttom'); // звук только при включении
  const audio = _getMusicEl();
  if(!audio) return;
  if(musicEnabled){
    audio.volume = 0;
    audio.play().catch(()=>{});
    _fadeVolume(audio, MUSIC_TARGET_VOLUME, FADE_MS);
  } else {
    _fadeVolume(audio, 0, FADE_MS, ()=>audio.pause());
  }
}

// Браузеры блокируют автоплей со звуком до первого жеста пользователя —
// пытаемся запустить музыку при первом клике/тапе по странице, с плавным fade-in.
// Заодно resume AudioContext для Web Audio SFX (он может быть suspended до первого жеста).
function _tryStartMusicOnGesture(){
  _getAudioCtx().resume().catch(()=>{});
  const audio = _getMusicEl();
  if(audio && musicEnabled && audio.paused){
    audio.volume = 0;
    audio.play().then(()=>{
      _fadeVolume(audio, MUSIC_TARGET_VOLUME, FADE_MS);
    }).catch(()=>{});
  }
  document.removeEventListener('pointerdown', _tryStartMusicOnGesture);
}
document.addEventListener('pointerdown', _tryStartMusicOnGesture);
document.addEventListener('DOMContentLoaded', _refreshMusicBtn);

// ── Sound effects (SFX) — Web Audio API ──────────────────────────
// AudioContext + предзагрузка буферов → нулевая задержка при проигрывании.
// new Audio() каждый раз декодирует файл заново и создаёт DOM-элемент — отсюда
// задержка и лаг на hover. BufferSource создаётся за ~0мс из уже декодированного буфера.
let sfxEnabled = localStorage.getItem('hj_sfx') !== 'off';
const SFX_VOLUME = 0.6;

let _audioCtx = null;
const _sfxBuffers = {};   // name → AudioBuffer (декодированный PCM)
const SFX_FILES = [
  'card_navigation_cursor', 'card_burn',
  'card_atack', 'card_fire_atack', 'card_spell_atack',
  'open_door', 'yellow_buttom',
  'baf', 'debaf',
  'graveyard', 'screen_monitor', 'heal', 'new_card', 'base_atack',
  'wind_card', 'card_select_traveler', 'rest'
];

// Минимальный интервал между повторными вызовами одного и того же звука (мс).
// card_navigation_cursor тротлим жёстко — иначе при движении по картам будет шторм вызовов.
const SFX_THROTTLE = { 'card_navigation_cursor': 90 };
const _sfxLastMs   = {};

function _getAudioCtx(){
  if(!_audioCtx) _audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return _audioCtx;
}

async function _loadSfxBuffer(name){
  try{
    const ctx = _getAudioCtx();
    const res = await fetch(`audio/${name}.wav`);
    const raw = await res.arrayBuffer();
    _sfxBuffers[name] = await ctx.decodeAudioData(raw);
  }catch(e){ /* файл ещё не добавлен — тихо пропускаем */ }
}

function _initSfxBuffers(){
  SFX_FILES.forEach(n => _loadSfxBuffer(n));
}

function _refreshSfxBtn(){
  const btn = document.getElementById('sfxToggleBtn');
  if(btn){
    btn.classList.toggle('sfx-on', sfxEnabled);
    btn.classList.toggle('sfx-off', !sfxEnabled);
  }
  const hamBtn = document.getElementById('hamSfxBtn');
  if(hamBtn) hamBtn.textContent = sfxEnabled ? 'Sound: On' : 'Sound: Off';
}

function toggleSfx(){
  sfxEnabled = !sfxEnabled;
  localStorage.setItem('hj_sfx', sfxEnabled ? 'on' : 'off');
  _refreshSfxBtn();
  if(sfxEnabled) playSfx('yellow_buttom');
}

// Мгновенный звук через Web Audio API.
// Если буфер ещё не загружен — тихо пропускаем (не вешаем).
function playSfx(name, volume){
  if(!sfxEnabled) return;
  const throttle = SFX_THROTTLE[name];
  if(throttle){
    const now = Date.now();
    if(now - (_sfxLastMs[name]||0) < throttle) return;
    _sfxLastMs[name] = now;
  }
  try{
    const ctx = _getAudioCtx();
    if(ctx.state === 'suspended') ctx.resume();
    const buffer = _sfxBuffers[name];
    if(!buffer) return; // буфер ещё грузится — пропускаем без ошибки
    const src  = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume != null ? volume : SFX_VOLUME;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
  }catch(e){}
}

document.addEventListener('DOMContentLoaded', _refreshSfxBtn);

function preloadAssets(){
  // Все UI-картинки, которые нужны ДО и ВО ВРЕМЯ игры.
  // Загружаем через new Image() — браузер положит в кэш, повторный запрос будет мгновенным.
  // Порядок важен: сначала лендинг (видны сразу), потом игровые, потом вторичные.
  const criticalImages = [
    // ── Фон и базовые UI ──
    'img/space_bg.png', 'img/brand.png',
    'img/logo_space.png', 'img/logo_window.png',
    'img/boltik.png', 'img/dat4ik.gif', 'img/zabor1.png', 'img/zabor2.png',
    'img/bg_modal.png', 'img/bg_jest.png', 'img/bg_jest2.png', 'img/bg_modal_deck.png', 'img/bg_jest2_border.png',
    'img/log_frame.png', 'img/grav_frame.png',
    'img/bg_jest_log.png', 'img/bg_jest_grav.png',
    'img/bones.png',
    'img/bg_bottom_bar.png',

    // ── Кнопки лендинга ──
    'img/btn_playgame1.png', 'img/btn_playgame2.png',
    'img/btn_playgame_gates_sheet.png', 'img/btn_playgame_frame.png', 'img/btn_playgame_hover.png',
    'img/btn_rules1.png', 'img/btn_rules2.png', 'img/btn_rulesH.png',
    'img/btn_catalog1.png', 'img/btn_catalog2.png', 'img/btn_catalogH.png',
    'img/btn_lore1.png', 'img/btn_lore2.png', 'img/btn_loreH.png',
    'img/btn_hotseat1.png', 'img/btn_hotseat2.png', 'img/btn_hotseatH.png',
    'img/btn_vsai1.png', 'img/btn_vsai2.png', 'img/btn_vsaiH.png', 'img/btn_online1.gif',
    'img/btn_music_on1.png', 'img/btn_music_on2.png',
    'img/btn_music_off1.png', 'img/btn_music_off2.png',

    // ── Кнопки модалок ──
    'img/btn_yes1.png', 'img/btn_yes2.png', 'img/btn_yesH.png',
    'img/btn_cancel1.png', 'img/btn_cancel2.png', 'img/btn_cancelH.png',
    'img/btn_mulligan1.png', 'img/btn_mulliganH.png', 'img/btn_mulligan2.png', 'img/btn_mulliganD.png',
    'img/btn_ready1.png', 'img/btn_readyH.png', 'img/btn_ready2.png',
    'img/btn_tea1.png', 'img/btn_tea2.png', 'img/btn_teaH.png',
    'img/btn_jeet1.png', 'img/btn_jeet2.png', 'img/btn_jeetH.png',
    'img/btn_X.png', 'img/btn_Xh.png', 'img/btn_X2.png',
    'img/btn_wait.gif',
    // ── Кнопки модалок (эта сессия — переделка футеров/bg_jest2) ──
    'img/btn_classic1.png', 'img/btn_classic2.png', 'img/btn_classicH.png',
    'img/btn_rush1.png', 'img/btn_rush2.png', 'img/btn_rushH.png',
    'img/btn_home1.png', 'img/btn_home2.png', 'img/btn_homeH.png',
    'img/btn_save1.png', 'img/btn_save2.png', 'img/btn_saveH.png',
    'img/btn_repeat1.png', 'img/btn_repeat2.png', 'img/btn_repeatH.png',
    'img/btn_back_corner1.png', 'img/btn_back_corner2.png', 'img/btn_back_cornerH.png',
    // ── Кнопки футера деккбилдера (Back/Clear/Import/Export/OK) — арт подключен 2026-07-09 ──
    'img/btn_back1.png', 'img/btn_back2.png', 'img/btn_backH.png',
    'img/btn_clean1.png', 'img/btn_clean2.png', 'img/btn_cleanH.png',
    'img/btn_imp1.png', 'img/btn_imp2.png', 'img/btn_impH.png',
    'img/btn_exp1.png', 'img/btn_exp2.png', 'img/btn_expH.png',
    'img/btn_ok1_1.png', 'img/btn_ok1.png', 'img/btn_ok2.png', 'img/btn_okH.png',
    'img/sort_all1.png', 'img/sort_all2.png', 'img/sort_allH.png',
    'img/sort_traveler1.png', 'img/sort_traveler2.png', 'img/sort_travelerH.png',
    'img/sort_unique1.png', 'img/sort_unique2.png', 'img/sort_uniqueH.png',
    'img/sort_spell1.png', 'img/sort_spell2.png', 'img/sort_spellH.png',
    'img/sort_world1.png', 'img/sort_world2.png', 'img/sort_worldH.png',
    'img/sort_artifact1.png', 'img/sort_artifact2.png', 'img/sort_artifactH.png',

    // ── Бортики зоны рук + лор-страницы + новая иконка тега (эта сессия) ──
    'img/hands_border.png', 'img/hands_border2.png',
    'img/lore_pages.png',
    'img/ico_invis.png',
    'img/ico_untamed.png',
    'img/trubi1.png',

    // ── Дайс-модалка (order-roll, выбор первого хода) — арт граней ──
    'img/dice_1.png', 'img/dice_2.png', 'img/dice_3.png',
    'img/dice_4.png', 'img/dice_5.png', 'img/dice_6.png',

    // ── Броня (armor) — фон бокса + иконка ──
    'img/armor_bg.png', 'img/armor.png',

    // ── Карты — базовые фреймы ──
    'img/card_tea.png', 'img/card_jeet.png',
    'img/card_name_bg.png', 'img/card_name_world_bg.png', 'img/card_text_bg.png',
    'img/card_stat_bg.png', 'img/card_text_world_bg.png',
    'img/pcard_bg.png',
    'img/pcard_tea_shutter_sheet.png', 'img/pcard_jeet_shutter_sheet.png',
    'img/tag_bg.png',

    // ── Стат-бары ──
    'img/bg_statbar_hp.png', 'img/bg_statbar_ess.png',
    'img/bg_statbar_tea.png', 'img/bg_statbar_jeet.png',
    'img/bg_statbar_tea1.png', 'img/bg_statbar_tea2.png', 'img/bg_statbar_tea3.png', 'img/bg_statbar_tea4.png', 'img/bg_statbar_tea5.png',
    'img/bg_statbar_jeet1.png', 'img/bg_statbar_jeet2.png', 'img/bg_statbar_jeet3.png', 'img/bg_statbar_jeet4.png', 'img/bg_statbar_jeet5.png',
    'img/bg_cost_tea.png', 'img/bg_cost_jeet.png',
    'img/bg_handP_bar.png', 'img/bg_handO_bar.png',

    // ── Игровые иконки ──
    'img/heart.png', 'img/attack.png', 'img/chel.png', 'img/chel2.png', 'img/ess.png',
    'img/hp_tea.png', 'img/hp_jeet.png',
    'img/deck.png', 'img/runaha.png', 'img/ef_burn.png',

    // ── Типы карт ──
    'img/type_creature.png', 'img/type_spell.png', 'img/type_world.png',
    'img/type_artifact.png', 'img/type_unique.png',

    // ── Иконки тегов ──
    'img/ico_fear.png', 'img/ico_pierce.png', 'img/ico_regen.png',
    'img/ico_burn.png', 'img/ico_rage.png', 'img/ico_provoke.png', 'img/ico_vanguard.png',

    // ── Кнопки в игре ──
    'img/btn_play.png', 'img/btn_burn.png', 'img/btn_spell.png',
    'img/btn_zoom.png',
    'img/button_1.png', 'img/button_2.png',
    'img/button_grav_1.png', 'img/button_grav_2.png',
  ];
  criticalImages.forEach(src => { const img = new Image(); img.src = src; });

  // Предзагружаем SFX-буферы через Web Audio API — нулевая задержка при первом звуке
  _initSfxBuffers();

  // Арты карт — грузим через 1.5с, чтобы не конкурировать с UI
  setTimeout(() => {
    if(typeof DEFS === 'undefined') return;
    Object.values(DEFS).forEach(def => {
      if(def.img){ const img = new Image(); img.src = `img/cards/${def.img}`; }
    });
  }, 1500);
}

// ── Ворота (Play Game) ────────────────────────────────────────
// Три слоя: [кнопки режима] [ворота-спрайт] [статичная рамка сверху, всегда видна]
// Спрайт-лист из 7 кадров: 1 = idle/закрыто, 7 = полностью открыто (пустой кадр,
// ворота на арте отсутствуют — сквозь него видны кнопки режима).
// Каждый шаг кадр→кадр занимает 150мс (итого 6 шагов = 900мс на полное открытие),
// закрытие — симметрично обратно.
// Таймер автозакрытия сбрасывается при наведении мыши на кнопки режима.
//
// .gate-idle на #playGateWrap — отдельный маркер "ворота реально в покое" (кадр 1,
// ничего не анимируется). Только пока он есть, :hover показывает btn_playgame_hover.png
// вместо кадра 1 (см. .play-gate-wrap.gate-idle:hover в styles.css). Снимается в момент
// клика/начала открытия, возвращается только когда анимация закрытия полностью
// доедет до кадра 1 — иначе ховер мог бы сработать посреди анимации открытия/закрытия.
let _gateTimer=null;
const GATE_AUTO_CLOSE_MS=10000;
const GATE_FRAME_COUNT=7;
const GATE_STEP_MS=150; // время между соседними кадрами
let _gateOpening=false; // true всё время анимации открытия (frame 2..7) — блокирует повторный клик,
                          // который иначе рестартовал бы анимацию с начала (см. openGates() ниже)

let _gateAnimTimers=[];
function _clearGateAnimTimers(){
  _gateAnimTimers.forEach(clearTimeout);
  _gateAnimTimers=[];
}

function _setGateFrame(sprite,frame){
  // frame: 1..7 (1 = idle/закрыто — класс не нужен, дефолтный background-position)
  for(let i=2;i<=GATE_FRAME_COUNT;i++) sprite.classList.remove('gate-frame-'+i);
  if(frame>1) sprite.classList.add('gate-frame-'+frame);
}

function openGates(){
  const wrap=document.getElementById('playGateWrap');
  const sprite=document.getElementById('playGateSprite');
  if(!wrap||!sprite) return;
  if(wrap.classList.contains('gates-open')) return; // уже открыто
  if(_gateOpening) return; // анимация открытия уже идёт — клик "в никуда", не рестартуем с начала
  _gateOpening=true;
  playSfx('open_door');
  _clearGateAnimTimers();
  wrap.classList.remove('gate-idle'); // анимация пошла — ховер больше не показываем
  for(let frame=2; frame<=GATE_FRAME_COUNT; frame++){
    const delay=(frame-1)*GATE_STEP_MS;
    _gateAnimTimers.push(setTimeout(()=>{
      _setGateFrame(sprite,frame);
      if(frame===GATE_FRAME_COUNT){
        _gateOpening=false;
        wrap.classList.add('gates-open');
        _startGateTimer();
      }
    },delay));
  }
}

function closeGates(){
  const wrap=document.getElementById('playGateWrap');
  const sprite=document.getElementById('playGateSprite');
  if(!wrap||!sprite) return;
  _gateOpening=false;
  clearGateTimer();
  _clearGateAnimTimers();
  wrap.classList.remove('gates-open');
  for(let frame=GATE_FRAME_COUNT-1; frame>=1; frame--){
    const delay=(GATE_FRAME_COUNT-frame)*GATE_STEP_MS;
    _gateAnimTimers.push(setTimeout(()=>{
      _setGateFrame(sprite,frame);
      if(frame===1) wrap.classList.add('gate-idle'); // снова в покое — ховер разрешён
    },delay));
  }
}

function _startGateTimer(){
  clearGateTimer();
  _gateTimer=setTimeout(closeGates,GATE_AUTO_CLOSE_MS);
}
function clearGateTimer(){
  if(_gateTimer){clearTimeout(_gateTimer);_gateTimer=null;}
}
// Пока курсор внутри зоны (над одной из 3 кнопок режима или между ними) — таймер
// на паузе (просто остановлен, не тикает). Обратный отсчёт запускается заново
// (полные GATE_AUTO_CLOSE_MS) только когда курсор реально покидает всю зону.
function pauseGateTimer(){
  clearGateTimer();
}
function resumeGateTimer(){
  if(document.getElementById('playGateWrap')?.classList.contains('gates-open')){
    _startGateTimer();
  }
}

// Оставляем для обратной совместимости (вызывается из showLanding)
function collapseStart(){ closeGates(); }
function expandStart(){ openGates(); }

// ── Navigation с анимированными переходами ───────────────────
// Направления: rules→вправо, lore→влево, catalog→вниз
const SCREEN_DIRECTION={
  rules:   {exit:'exit-right', enter:'slide-in-right', back:'slide-out-right', landingBack:'exit-left'},
  lore:    {exit:'exit-left',  enter:'slide-in-left',  back:'slide-out-left',  landingBack:'exit-right'},
  catalog: {exit:'exit-down',  enter:'slide-in-down',  back:'slide-out-down',  landingBack:'exit-up'},
};

function showScreen(name){
  const landing=document.getElementById('landing');
  const screen=document.getElementById(name+'Screen');
  if(!screen) return;
  const dir=SCREEN_DIRECTION[name]||{exit:'exit-right',enter:'slide-in-right',back:'slide-out-right'};
  // Лендинг уезжает
  landing.classList.add(dir.exit);
  // Экран въезжает
  screen.classList.add('active',dir.enter);
  if(name==='catalog') setTimeout(renderCatalog,50);
  if(name==='lore') setTimeout(_armLoreReveal,50);
  // После анимации прячем лендинг полностью
  setTimeout(()=>{
    landing.style.display='none';
    landing.classList.remove(dir.exit);
  },315);
}

// ── Лор: каждая .lore-page "проявляется" глитчем при попадании во вьюпорт
// (тот же приём, что у pcardTextReveal — text-shadow-дрожь вместо плавного fade).
// Срабатывает один раз за показ экрана — при повторном открытии Lore эффект
// проигрывается заново (см. сброс .revealed в hideScreen).
function _armLoreReveal(){
  const root=document.getElementById('loreScreen');
  if(!root) return;
  const pages=root.querySelectorAll('.lore-page');
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  },{root, threshold:0.25});
  pages.forEach(el=>obs.observe(el));
}

function hideScreen(name){
  const landing=document.getElementById('landing');
  const screen=document.getElementById(name+'Screen');
  if(!screen) return;
  const dir=SCREEN_DIRECTION[name]||{exit:'exit-right',enter:'slide-in-right',back:'slide-out-right'};
  // Экран уезжает обратно
  screen.classList.add(dir.back);
  // Лендинг появляется
  landing.style.display='flex';
  landing.classList.add(dir.landingBack||'exit-left');
  // Небольшая задержка чтобы display:flex применился до старта анимации
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      landing.classList.remove(dir.landingBack||'exit-left');
    });
  });
  setTimeout(()=>{
    screen.classList.remove('active',dir.enter,dir.back);
    if(name==='lore') screen.querySelectorAll('.lore-page').forEach(el=>el.classList.remove('revealed'));
  },315);
}
function showLanding(){
  document.getElementById('game').style.display='none';
  document.getElementById('mulliganScreen').classList.add('hidden');
  document.getElementById('passScreen').classList.add('hidden');
  document.getElementById('winModal').classList.add('hidden');
  document.getElementById('confirmModal').classList.add('hidden');
  initState();
  collapseStart();
  const landing=document.getElementById('landing');
  landing.classList.remove('exit-center');
  landing.style.display='flex';
}

function showConfirm(text, btnText, onConfirm, opts){
  const modal=document.getElementById('confirmModal');
  const pEl=modal.querySelector('p');
  modal.querySelector('h2').textContent=(opts&&opts.title)||'ARE YOU SURE?';
  const yesBtn=modal.querySelector('#confirmYesBtn');
  yesBtn.textContent=btnText;
  yesBtn.onclick=()=>{ closeConfirmModal(onConfirm); };
  // hideCancel — for pure informational notices (e.g. deck-import results in
  // deckbuilder.js) where there's nothing to actually confirm/cancel, just one
  // "OK". Restored (removed 'none') on every call so later real confirmations
  // aren't left without a Cancel button.
  const cancelBtn=modal.querySelector('.modal-art-btn.btn-cancel');
  if(cancelBtn) cancelBtn.style.display=(opts&&opts.hideCancel)?'none':'';
  modal.classList.remove('hidden');
  _modalPopIn(modal);
  _typeText(pEl,text,24);
}

function closeConfirmModal(onConfirm){
  playSfx('yellow_buttom');
  const modal=document.getElementById('confirmModal');
  const finish=()=>{
    modal.classList.add('hidden');
    if(onConfirm) onConfirm();
  };
  _modalPopOut(modal, finish, 250);
}


function askMenu(){
  showConfirm('Current game will be lost.','Yes, Exit',()=>showLanding());
}

function askRestart(){
  showConfirm('Current game will be lost.','Yes, Restart',()=>resetGame());
}

// ── Deck picker (Full/Compact/Mini) — shown before either Hot Seat or VS AI ──
let _pendingModeFlow=null; // 'hotseat' | 'vsai'
// Single place that actually reveals deckPickerModal — reused by the initial
// open AND every "back" that returns to it, so the line-typing animation
// (_playDeckPickerTyping()) always replays, not just on first visit.
function _showDeckPickerModal(){
  const modal=document.getElementById('deckPickerModal');
  modal.classList.remove('hidden');
  _modalPopIn(modal);
  _playDeckPickerTyping();
}
function openDeckPicker(flow){
  _pendingModeFlow=flow;
  _showDeckPickerModal();
}
// Кнопка "назад" — самый первый шаг цепочки, дальше отступать некуда, кроме как на
// landing. Раньше просто прятали модалку, предполагая, что landing и так виден под ней —
// но это могло не срабатывать (репорт автора: "ведёт в никуда", чёрный экран). Теперь
// явно возвращаем landing в видимое состояние (display:flex, без .exit-center), не полагаясь
// на то, что он "и так там был" — надёжнее при любом предыдущем состоянии.
function backFromDeckPicker(){
  playSfx('yellow_buttom');
  const modal=document.getElementById('deckPickerModal');
  _modalPopOut(modal, ()=>{
    modal.classList.add('hidden');
    _pendingModeFlow=null;
    const landing=document.getElementById('landing');
    if(landing){
      landing.style.display='flex';
      landing.classList.remove('exit-center');
    }
  }, 250);
}
function chooseDeckConfig(configKey){
  const modal=document.getElementById('deckPickerModal');
  // Start landing's own exit fade/shrink NOW, in parallel with the deck modal's
  // pop-out — otherwise there's a gap between the modal's opaque background
  // disappearing and landing's own transition starting, where landing flashes
  // back to full visibility for a frame.
  document.getElementById('landing').classList.add('exit-center');
  const proceed=()=>{
    modal.classList.add('hidden');
    if(_pendingModeFlow==='vsai') openVsAiPicker(configKey);
    // Hot Seat: Classic AND Rush both now go through the order-roll dice-off
    // first (see openOrderRoll below) — who goes first decides mulligan/
    // deckbuilder order, so it has to happen before either.
    else openOrderRoll({mode:'hotseat',deckConfig:configKey});
  };
  // Landing's own opacity/transform transition (see .landing.exit-center in
  // styles.css) takes 315ms, started at the same moment as the line above —
  // NOT 250ms (the modal pop-out timing). Waiting only 250ms here used to mean
  // `proceed()` ran, hid the modal's opaque background, and revealed landing
  // still ~20% visible mid-fade for another 65ms — then startGame()/
  // openVsAiPicker() waited a FRESH 315ms on top of that before showing the
  // next screen, so for ~250ms nothing covered the screen but the bare
  // .stars background. Waiting the full 315ms here — matching landing's own
  // transition exactly — means landing is already fully invisible by the time
  // we reveal the next screen, so startGame()/openVsAiPicker() no longer need
  // (and no longer add) any additional delay of their own.
  _modalPopOut(modal, proceed, 315);
}

function startGame(deckConfig,firstFaction){
  firstFaction=firstFaction||'tea';
  initState({deckConfig:deckConfig||'classic',firstFaction});
  const landing=document.getElementById('landing');
  landing.style.display='none';
  landing.classList.remove('exit-center');
  document.getElementById('game').style.display='flex';
  collapseStart();
  // render() here (not just whatever doMulligan()/render() calls happen to
  // fire downstream) so the field/stats/hand zones are already correct the
  // instant #game becomes visible — otherwise, for the ~50ms before the
  // mulligan modal opens, the screen briefly shows whatever was rendered
  // there LAST (a previous match's HP/hand, or the page's static placeholder
  // markup on the very first game) before flicking to the real new-game
  // state. Harmless on a fresh page load (nothing to flicker from), visible
  // on Restart/New Game after a previous match.
  render();
  lg(`${firstFaction==='tea'?'TAVERN':'JEET'} goes first.`,'imp');
  startMulliganFor(firstFaction); // synchronous — see 'flicker' note in CLAUDE.md backlog: a 50ms delay here left the bare arena visible for a frame between two black overlays
}

// ── VS AI ──────────────────────────────────────────────────────
let _pendingVsAiDeckConfig='classic';
// Single place that actually reveals vsAiPickerModal — see _showDeckPickerModal()
// above for why this exists (typing animation needs to replay every time).
function _showVsAiPickerModal(){
  const modal=document.getElementById('vsAiPickerModal');
  modal.classList.remove('hidden');
  _modalPopIn(modal);
  _playVsAiPickerTyping();
}
function openVsAiPicker(deckConfig){
  _pendingVsAiDeckConfig=deckConfig||'classic';
  // NO playSfx here — the deck-choice button that led here already played the
  // click sound in its own onclick (see deckPickerModal in index.html), and a
  // second one firing 315ms later when this modal appeared was audible as a
  // stray extra "click" between the two screens (reported 2026-07-06).
  // Landing is already fully faded by the time this runs (see chooseDeckConfig
  // above) — no extra wait needed before showing the faction-picker modal.
  _showVsAiPickerModal();
}
// Кнопка "назад" — возвращает к выбору Classic/Rush (deckPickerModal). Landing под обеими
// модалками остаётся как есть (пока он скрыт под непрозрачным фоном модалки — не важно, в
// каком именно .exit-center состоянии), трогать его тут не нужно.
function backFromVsAiPicker(){
  playSfx('yellow_buttom');
  const modal=document.getElementById('vsAiPickerModal');
  _modalPopOut(modal, ()=>{
    modal.classList.add('hidden');
    _showDeckPickerModal();
  }, 250);
}

// Faction chosen — before actually starting anything, the order-roll dice-off
// decides who goes first (see openOrderRoll below). deckConfig/humanFaction
// are carried through in the roll's ctx and only consumed once Ready is hit.
function chooseVsAiFaction(humanFaction){
  const modal=document.getElementById('vsAiPickerModal');
  _modalPopOut(modal, ()=>{
    modal.classList.add('hidden');
    openOrderRoll({mode:'vsai',deckConfig:_pendingVsAiDeckConfig,humanFaction});
  }, 250);
}

// Actually starts the vsAI match once faction + deck config + dice-roll order
// are all settled. Called from confirmOrderRoll() below (Classic path only —
// Rush instead goes to startRushBuild()).
function startGameVsAI(humanFaction,firstFaction){
  const landing=document.getElementById('landing');
  landing.style.display='none';
  landing.classList.remove('exit-center');
  document.getElementById('game').style.display='flex';
  collapseStart();
  initState({mode:'vsai',humanFaction,deckConfig:_pendingVsAiDeckConfig,firstFaction});
  render(); // see startGame() above for why this can't wait for doMulligan()'s own render()
  lg('─ NEW GAME (VS AI) ─','trn');
  lg(`${firstFaction==='tea'?'TAVERN':'JEET'} goes first.`,'imp');
  logTurnSnapshot(firstFaction);
  // ИИ разыгрывает свой муллиган мгновенно и без интерфейса —
  // человек видит только собственный муллиган.
  aiAutoMulligan(G.aiFaction);
  startMulliganFor(G.humanFaction); // synchronous — same flicker fix as above
}

// ── ORDER ROLL — dice-off deciding who goes first ────────────────────────
// Sits between mode/config(/faction) selection and mulligan-or-deckbuilder,
// for ALL four combos (hotseat×{classic,rush}, vsai×{classic,rush}). ctx
// carries whatever the next step needs:
//   hotseat: {mode:'hotseat', deckConfig}
//   vsai:    {mode:'vsai', deckConfig, humanFaction}
// See CLAUDE.md "Version 1.01" roadmap, turn-order item.
let _orderRollCtx=null;
let _orderRollTimer=null;
let _orderRollFirstFaction=null;
let _orderRollResultTypeCancel=null;

// Sets a die's face art (img/dice_1.png … dice_6.png, added by the author —
// same box size as the digit placeholder they replaced, see .order-roll-die
// in styles.css).
function _setDieFace(el,n){
  el.style.backgroundImage=`url('img/dice_${n}.png')`;
}

function openOrderRoll(ctx){
  _orderRollCtx=ctx;
  _orderRollFirstFaction=null;
  const modal=document.getElementById('orderRollModal');
  document.getElementById('orderRollReadyBtn').disabled=true;
  const resultEl=document.getElementById('orderRollResult');
  resultEl.textContent='\u00A0';
  resultEl.classList.remove('done');
  ['orderRollSideTea','orderRollSideJeet'].forEach(id=>{
    document.getElementById(id).classList.remove('order-roll-winner','order-roll-loser');
  });
  _setDieFace(document.getElementById('orderRollDieTea'),1);
  _setDieFace(document.getElementById('orderRollDieJeet'),1);
  modal.classList.remove('hidden');
  _modalPopIn(modal);
  _rollOrderDice();
}

// Кнопка "назад" — возвращает туда, откуда пришли: vsAiPickerModal (флоу vsai,
// faction уже выбрана) или deckPickerModal (флоу hotseat, Classic/Rush уже
// выбран). Дальше отступать некуда — обе эти модалки сами умеют идти назад
// ещё на шаг (см. backFromVsAiPicker/backFromDeckPicker).
function backFromOrderRoll(){
  playSfx('yellow_buttom');
  clearTimeout(_orderRollTimer);
  if(_orderRollResultTypeCancel) _orderRollResultTypeCancel();
  const modal=document.getElementById('orderRollModal');
  const ctx=_orderRollCtx;
  _modalPopOut(modal, ()=>{
    modal.classList.add('hidden');
    _orderRollCtx=null;
    if(ctx&&ctx.mode==='vsai') _showVsAiPickerModal();
    else _showDeckPickerModal();
  }, 250);
}

// Rolls both dice with a couple seconds of random face-cycling through the
// real dice_1..6.png art (author-supplied, img/), then settles on the actual
// result. Ties auto-reroll after a short pause until someone rolls higher —
// no manual reroll button, per spec.
function _rollOrderDice(){
  const dieT=document.getElementById('orderRollDieTea');
  const dieJ=document.getElementById('orderRollDieJeet');
  const resultEl=document.getElementById('orderRollResult');
  const CYCLE_MS=90, SPIN_MS=1400;
  const start=performance.now();
  clearTimeout(_orderRollTimer);
  const tick=()=>{
    const elapsed=performance.now()-start;
    _setDieFace(dieT,1+Math.floor(Math.random()*6));
    _setDieFace(dieJ,1+Math.floor(Math.random()*6));
    playSfx('card_navigation_cursor');
    if(elapsed<SPIN_MS){
      _orderRollTimer=setTimeout(tick,CYCLE_MS);
    } else {
      const rollT=1+Math.floor(Math.random()*6);
      const rollJ=1+Math.floor(Math.random()*6);
      _setDieFace(dieT,rollT);
      _setDieFace(dieJ,rollJ);
      if(rollT===rollJ){
        _typeOrderResult('Tie — rolling again...');
        _orderRollTimer=setTimeout(()=>_rollOrderDice(),900);
        return;
      }
      const winner = rollT>rollJ ? 'tea' : 'jeet';
      document.getElementById(winner==='tea'?'orderRollSideTea':'orderRollSideJeet').classList.add('order-roll-winner');
      document.getElementById(winner==='tea'?'orderRollSideJeet':'orderRollSideTea').classList.add('order-roll-loser');
      _orderRollFirstFaction=winner;
      _typeOrderResult(`${winner==='tea'?'TAVERN':'JEET'} goes first!`, ()=>{
        document.getElementById('orderRollReadyBtn').disabled=false;
      });
    }
  };
  tick();
}

// Character-by-character reveal, same CRT-terminal feel used across these
// modals. Generic — el just needs the `.type-fx` cursor-blink class (see
// styles.css); timer is returned so callers that need to cancel a whole
// sequence early (e.g. modal closed mid-type) can clearTimeout() it.
function _typeText(el,text,charMs,onDone){
  el.classList.remove('done','typing-hidden');
  // Измеряем высоту ПОЛНОГО текста (с учётом переноса строк) ДО начала печати и
  // фиксируем её через min-height — иначе контейнер (а с ним и вся модалка) растёт
  // построчно по мере того, как textContent удлиняется, и всё, что ниже (кнопки в
  // футере и т.п.), едет вниз вместе с текстом. Так модалка сразу открывается на
  // финальном размере, а печатается уже внутри готового по высоте блока.
  // scrollHeight, а не getBoundingClientRect().height — модалка в этот момент может
  // ещё доигрывать pop-in анимацию (transform:scale(), см. .modal-pop-in в styles.css),
  // а getBoundingClientRect() возвращает уже трансформированный (visually scaled) бокс;
  // scrollHeight — чисто layout-свойство, transform на него не влияет.
  el.style.minHeight='';
  el.textContent=text;
  el.style.minHeight=el.scrollHeight+'px';
  el.textContent='';
  let i=0;
  let timer=null;
  const step=()=>{
    el.textContent=text.slice(0,i+1);
    i++;
    if(i<text.length){
      timer=setTimeout(step,charMs);
    } else {
      el.classList.add('done');
      if(onDone) onDone();
    }
  };
  step();
  return {cancel:()=>clearTimeout(timer)};
}

// Same idea but for a line with an inline <strong> run (deckPicker's "Classic
// — ready deck" / "Rush — build your own deck") — plain textContent typing
// would have to choose between showing the bold tag literally or dropping
// the bold entirely, so this walks a flat char array carrying a per-char
// bold flag and re-wraps the revealed prefix into <strong>/plain runs.
function _typeHtmlLine(el,segments,charMs,onDone){
  el.classList.remove('done','typing-hidden');
  const flat=[];
  segments.forEach(seg=>{ for(const ch of seg.text) flat.push({ch,bold:!!seg.bold}); });
  let i=0;
  let timer=null;
  const render=count=>{
    let html='',buf='',curBold=null;
    const flush=()=>{ if(buf) html+=curBold?`<strong>${buf}</strong>`:buf; buf=''; };
    for(let k=0;k<count;k++){
      const f=flat[k];
      if(f.bold!==curBold){ flush(); curBold=f.bold; }
      buf+=f.ch;
    }
    flush();
    el.innerHTML=html;
  };
  // Тот же приём, что в _typeText() — измеряем высоту ПОЛНОГО (готового) контента
  // и фиксируем min-height до начала посимвольной печати, чтобы модалка не росла
  // по ходу тайпинга. scrollHeight, не getBoundingClientRect() — см. комментарий в
  // _typeText(), тот же transform:scale() у pop-in анимации модалки.
  el.style.minHeight='';
  render(flat.length);
  el.style.minHeight=el.scrollHeight+'px';
  el.innerHTML='';
  const step=()=>{
    i++;
    render(i);
    if(i<flat.length){
      timer=setTimeout(step,charMs);
    } else {
      el.classList.add('done');
      if(onDone) onDone();
    }
  };
  step();
  return {cancel:()=>clearTimeout(timer)};
}

function _typeOrderResult(text,onDone){
  const el=document.getElementById('orderRollResult');
  const {cancel}=_typeText(el,text,28,onDone);
  _orderRollResultTypeCancel=cancel;
}

// deckPickerModal — types both lines in sequence (Classic, then Rush) each
// time the modal is shown (initial open AND every "back" that returns to it —
// see _showDeckPickerModal() below, the single place that actually reveals
// this modal).
let _deckPickerTypeCancel=null;
function _playDeckPickerTyping(){
  if(_deckPickerTypeCancel) _deckPickerTypeCancel();
  const l1=document.getElementById('deckPickerLine1');
  const l2=document.getElementById('deckPickerLine2');
  l1.classList.add('typing-hidden'); l1.textContent='';
  l2.classList.add('typing-hidden'); l2.textContent='';
  const t1=_typeHtmlLine(l1,[{text:'Classic',bold:true},{text:' — ready deck'}],26,()=>{
    const t2=_typeHtmlLine(l2,[{text:'Rush',bold:true},{text:' — build your own deck'}],26);
    _deckPickerTypeCancel=t2.cancel;
  });
  _deckPickerTypeCancel=t1.cancel;
}

// vsAiPickerModal — single line, same cadence as the rest.
let _vsAiPickerTypeCancel=null;
function _playVsAiPickerTyping(){
  if(_vsAiPickerTypeCancel) _vsAiPickerTypeCancel();
  const el=document.getElementById('vsAiPickerText');
  const {cancel}=_typeText(el,"You'll play against a simple AI opponent. Which side do you want to control?",22);
  _vsAiPickerTypeCancel=cancel;
}

// Ready — dispatches to whichever screen comes next for this ctx, now that
// _orderRollFirstFaction is settled. Mirrors the dispatch that used to live
// directly in chooseDeckConfig()/startGameVsAI() before the dice-off existed.
function confirmOrderRoll(){
  if(!_orderRollFirstFaction) return; // guard: button is disabled until settled anyway
  const ctx=_orderRollCtx;
  const firstFaction=_orderRollFirstFaction;
  const modal=document.getElementById('orderRollModal');
  _modalPopOut(modal, ()=>{
    modal.classList.add('hidden');
    _orderRollCtx=null;
    _orderRollFirstFaction=null;
    if(ctx.mode==='hotseat'){
      if(ctx.deckConfig==='rush') startRushBuild('hotseat',{firstFaction});
      else startGame('classic',firstFaction);
    } else {
      const landing=document.getElementById('landing');
      landing.style.display='none';
      landing.classList.remove('exit-center');
      if(ctx.deckConfig==='rush') startRushBuild('vsai',{vsAiHumanFaction:ctx.humanFaction,firstFaction});
      else startGameVsAI(ctx.humanFaction,firstFaction);
    }
  }, 250);
}

// Second-player bonus card — see CLAUDE.md "Version 1.01" roadmap. Unseen is
// deliberately NOT part of the deck (see deck.js buildDeck()/buildAiRushDeck())
// so it can never show up in — or be discarded during — the mulligan; instead
// it's added directly to G.secondFaction's hand the moment the mulligan phase
// actually ends (both mulligan chains funnel through readyFromMulligan(),
// which is the single choke point for every mode/deck-config combo, so this
// only needs to be called from there).
function grantUnseenBonus(){
  const second=G.secondFaction;
  if(!second||!G[second]) return;
  const card=mkCard('unseen');
  // DEFS.unseen has f:"jeet" hardcoded (data.js) — leftover from back when
  // Unseen only ever went to Jeet. card.f drives "is this my card"/playability
  // everywhere (click handling, .affordable highlight, hand rendering), so if
  // the dice-roll makes TEA the 2nd player, the card must actually belong to
  // tea — otherwise it sits in Tea's hand but reads as Jeet's and can't be
  // clicked/played at all. Override after mkCard() rather than touching DEFS
  // (DEFS.unseen.f still matters as the "neutral-ish default" for anything
  // that reads it before a real owner is assigned, e.g. catalog display).
  card.f=second;
  G[second].hand.push(card);
  lg(`${second==='tea'?'TAVERN':'JEET'} receives UNSEEN — the 2nd-player bonus card.`,'imp');
}

function startMulliganFor(faction){
  G.mulliganTurn = faction;
  const name = faction==='tea' ? 'TAVERN — YOUR HAND' : 'JEET — YOUR HAND';
  document.getElementById('mulliganTitle').textContent = name;
  const m = G.mulligan[faction];
  document.getElementById('mulliganInfo').textContent =
    m.used===0 ? 'Mulligans left: 3' :
    m.used===1 ? 'Mulligans left: 2 (next draw: 4 cards)' :
    m.used===2 ? 'Mulligans left: 1 (next draw: 3 cards)' : 'No mulligans left';
  const container = document.getElementById('mulliganCards');
  container.innerHTML='';
  const scale = window.innerWidth < 600 ? 0.7 : 1;
  const cardH = window.innerHeight * 0.24;
  const cardW = cardH * 0.716;
  const negH = -Math.floor(cardH * (1 - scale));
  const negW = -Math.floor(cardW * (1 - scale));
  G[faction].hand.forEach(card=>{
    const el = mkEl(card,'hand');
    // Тот же голд-пульс, что у "affordable" карт в обычной руке (goldPulseWeak,
    // styles.css) — здесь чисто декоративно, не завязано на стоимость/эссенцию:
    // mkEl() сам ставит .affordable только если card.f===G.turn (а G.turn во
    // время муллигана всегда G.firstFaction — тот, кто выиграл бросок
    // кубиков и ходит первым, см. initState()) И cost<=ess — на муллигане
    // 2-го игрока это условие никогда не сработает, да и по смыслу тут не "могу
    // сыграть", а "вот эти карты у меня на руках" — подсвечиваем ВСЕ карты
    // муллигана одинаково, форсируя класс явно, а не полагаясь на встроенную
    // проверку mkEl().
    el.classList.add('affordable');
    el.style.cursor='default';
    el.style.pointerEvents='none';
    el.style.transform=`scale(${scale})`;
    el.style.transformOrigin='top left';
    el.style.marginRight=negW+'px';
    el.style.marginBottom=negH+'px';
    container.appendChild(el);
  });
  document.getElementById('passScreen').classList.add('hidden');
  const mulliganEl = document.getElementById('mulliganScreen');
  mulliganEl.classList.remove('hidden');
  _modalPopIn(mulliganEl);
  const mulliganBtn = document.getElementById('mulliganBtn');
  if(mulliganBtn){
    mulliganBtn.disabled = m.used >= 3;
  }
}

// Плавная "сборка" арены после последнего муллигана (или сразу после vsAI-муллигана
// человека): вместо плоского fade всего #game верхняя пара полос (статус оппонента +
// его рука) выезжает сверху вниз ЕДИНЫМ блоком, нижняя (рука игрока + его статус +
// активный bottom-bar) — снизу вверх, тоже единым блоком (без каскада между элементами
// внутри группы — раньше был, убрали по просьбе). "Единый блок" технически — не общий
// DOM-контейнер (не хотим лишний раз перестраивать разметку/flex #game), а одинаковое
// пиксельное смещение (--slide-dist, см. styles.css) для всех элементов группы при
// delay=0: если бы смещали на свои же 100% высоты, разные по высоте полосы ехали бы с
// разной скоростью и группа "тянулась" бы; общий px-сдвиг = одинаковая скорость = едут
// как одна цельная плита. Поля боя (field-zone) НЕ едут — там прямые дети-звёзды
// (.field-star, см. spawnStars()), которые вместо этого получают отдельный "вырост из
// точки" (иначе едут вертикально вместе с контейнером — смотрится странно поверх
// мерцания). Плюс поверх всего один раз выезжает надпись "Battle begins!". Вызывать
// ПОСЛЕ render(), чтобы к этому моменту уже был известен актуальный bottomBar (render()
// сам решает teaBottomBar/jeetBottomBar через display) и руки лежали в верных зонах.
function playArenaRevealAnimation(){
  const header = document.querySelector('#game .header');
  const topEls = ['oppStats','oppHandZone']
    .map(id=>document.getElementById(id)).filter(Boolean);
  const bottomBar = ['teaBottomBar','jeetBottomBar']
    .map(id=>document.getElementById(id))
    .find(el=>el && el.style.display!=='none');
  const bottomEls = ['playerHandZone','playerStats']
    .map(id=>document.getElementById(id)).filter(Boolean);
  if(bottomBar) bottomEls.push(bottomBar);

  const allEls=[header,...topEls,...bottomEls].filter(Boolean);
  // Сброс на случай повторного показа арены в той же вкладке (напр. Restart) — без
  // remove+reflow повторный add() на уже применённом классе анимацию не перезапустит.
  allEls.forEach(el=>{
    el.classList.remove('arena-slide-down-in','arena-slide-up-in','arena-header-fade-in');
    el.style.animationDelay='';
    el.style.removeProperty('--slide-dist');
  });
  void document.getElementById('game').offsetWidth;

  if(header) header.classList.add('arena-header-fade-in');

  // Суммарная высота группы = дистанция, на которую каждый элемент группы стартует
  // "за кадром" — одинаковая для всех, поэтому группа едет как единое целое, а не
  // по частям с разной скоростью.
  const topDist = topEls.reduce((sum,el)=>sum+el.offsetHeight,0);
  topEls.forEach(el=>{
    el.style.setProperty('--slide-dist', (-topDist)+'px');
    el.classList.add('arena-slide-down-in');
  });
  const bottomDist = bottomEls.reduce((sum,el)=>sum+el.offsetHeight,0);
  bottomEls.forEach(el=>{
    el.style.setProperty('--slide-dist', bottomDist+'px');
    el.classList.add('arena-slide-up-in');
  });

  // Длительность анимации задана в CSS (.arena-slide-*-in, .arena-header-fade-in) —
  // 0.715s/0.455s. Косметическая уборка классов после завершения, чтобы анимационные
  // правила не висели на элементах бесконечно (both и так держит финальный кадр).
  const barsTotalMs = 715 + 50;
  setTimeout(()=>{
    allEls.forEach(el=>{
      el.classList.remove('arena-slide-down-in','arena-slide-up-in','arena-header-fade-in');
      el.style.animationDelay='';
      el.style.removeProperty('--slide-dist');
    });
  }, barsTotalMs);

  _playFieldStarsGrowIn();
  _playBattleBeginsText();
}

// Звёзды на полях боя (.field-star, см. spawnStars()) уже крутят бесконечный starTwinkle
// с собственными случайными animation-delay/-duration (заданы инлайново при спавне).
// Здесь временно подменяем ИМЯ анимации на starGrowIn (см. styles.css — правило
// .field-star.field-star-grow-in задаёт только animation-name/-timing-function/-fill-mode,
// не трогая delay/duration) и на время роста подставляем свои короткие delay/duration —
// после чего возвращаем оригинальные твинкл-значения, чтобы мерцание продолжилось как обычно.
function _playFieldStarsGrowIn(){
  const stars = document.querySelectorAll('.field-star');
  stars.forEach(s=>{
    if(s.dataset.twinkleDelay===undefined) s.dataset.twinkleDelay = s.style.animationDelay||'';
    if(s.dataset.twinkleDuration===undefined) s.dataset.twinkleDuration = s.style.animationDuration||'';
    s.classList.remove('field-star-grow-in');
  });
  void document.getElementById('game').offsetWidth;
  stars.forEach(s=>{
    // Длительность/разброс тоже +30% от первой прикидки (0.5s/0.3s → 0.65s/0.39s),
    // чтобы рост звёзд не выбивался по темпу из замедленных баров.
    s.style.animationDelay = (Math.random()*0.39)+'s';
    s.style.animationDuration = '0.65s';
    s.classList.add('field-star-grow-in');
  });
  setTimeout(()=>{
    stars.forEach(s=>{
      s.classList.remove('field-star-grow-in');
      s.style.animationDelay = s.dataset.twinkleDelay||'';
      s.style.animationDuration = s.dataset.twinkleDuration||'';
    });
  }, 1050); // 0.65s рост + до 0.39s разброс + запас
}

// "Battle begins!": вырастает из точки шва между полями боя (чуть выше центра экрана) →
// держится и пульсирует 1с → уходит в fade.
// Font-size подгоняется под ~40% ширины экрана измерением фактической ширины отрисованного
// текста (на глаз в vw для произвольного шрифта 'MEK' — ненадёжно, ширина глифов неизвестна).
function _playBattleBeginsText(){
  const wrap = document.getElementById('battleBeginsText');
  const inner = document.getElementById('battleBeginsInner');
  if(!wrap || !inner) return;

  inner.classList.remove('battle-begins-in','battle-begins-pulse','battle-begins-out');
  wrap.classList.remove('hidden');

  // Вертикальный якорь — не центр экрана, а шов между полями боя (низ oppFieldZone
  // встречается с верхом playerFieldZone), т.е. "чуть выше центра" по факту макета.
  // Среднее двух краёв — на случай, если между зонами когда-нибудь появится зазор/бордер.
  const oppField = document.getElementById('oppFieldZone');
  const playerField = document.getElementById('playerFieldZone');
  let seamY = window.innerHeight/2;
  if(oppField && playerField){
    seamY = (oppField.getBoundingClientRect().bottom + playerField.getBoundingClientRect().top)/2;
  }
  wrap.style.top = seamY+'px';

  // Замер: временный крупный базовый размер, смотрим фактическую ширину, пересчитываем
  // до 40% ширины окна, затем сразу перезаписываем — пользователь base-размер не видит,
  // т.к. рост (scale от 0) стартует только после этого на следующем кадре.
  const PROBE_PX = 200;
  inner.style.fontSize = PROBE_PX+'px';
  const measuredWidth = inner.getBoundingClientRect().width || 1;
  const targetWidth = window.innerWidth * 0.4;
  const fittedPx = Math.max(18, PROBE_PX * (targetWidth / measuredWidth));
  inner.style.fontSize = fittedPx+'px';

  void wrap.offsetWidth; // reflow, чтобы новый font-size/top применились до старта анимации

  inner.classList.add('battle-begins-in');
  const growMs = 500;
  const holdMs = 1000;
  const fadeMs = 500;

  setTimeout(()=>{
    inner.classList.remove('battle-begins-in');
    inner.classList.add('battle-begins-pulse');
  }, growMs);

  setTimeout(()=>{
    inner.classList.remove('battle-begins-pulse');
    inner.classList.add('battle-begins-out');
  }, growMs+holdMs);

  setTimeout(()=>{
    inner.classList.remove('battle-begins-out');
    wrap.classList.add('hidden');
    inner.style.fontSize='';
  }, growMs+holdMs+fadeMs);
}

function doMulliganPhase(){
  doMulligan(G.mulliganTurn);
  startMulliganFor(G.mulliganTurn);
}

function readyFromMulligan(){
  const mulliganEl = document.getElementById('mulliganScreen');

  const proceed = () => {
    mulliganEl.classList.add('hidden');
    if(G.mode==='vsai'){
      // В VS AI муллиган-экран показывается только человеку — экран "передай устройство"
      // тут не нужен, сразу переходим к партии.
      G.phase='action';
      G.mulliganTurn=null;
      grantUnseenBonus();
      render();
      playArenaRevealAnimation();
      requestAnimationFrame(adjustHandOverlap);
      if(G.turn===G.aiFaction&&typeof runAiTurn==='function'){
        setTimeout(()=>runAiTurn(),600);
      }
      return;
    }
    // Hot Seat: mulligan order follows dice-roll order (G.firstFaction goes
    // first, see openOrderRoll/initState) — no longer hardcoded to tea→jeet.
    if(G.mulliganTurn===G.firstFaction){
      showPassScreen(G.secondFaction, ()=>startMulliganFor(G.secondFaction));
    } else {
      G.phase='action';
      G.mulliganTurn=null;
      grantUnseenBonus();
      render();
      playArenaRevealAnimation();
      requestAnimationFrame(adjustHandOverlap);
    }
  };

  _modalPopOut(mulliganEl, proceed, 250);
}


// ── Navigation ────────────────────────────────────────────────

function showWin(w){
  document.getElementById('winTitle').textContent=w.toUpperCase()+' WINS!';
  const text=w==='tea'?'The Tavern stands. The Great Return draws closer.':'Jeet consumes all. The cycle breaks.';
  const modal=document.getElementById('winModal');
  modal.classList.remove('hidden');
  _modalPopIn(modal);
  _typeText(document.getElementById('winText'),text,26);
}

function closeWinModal(){
  const modal=document.getElementById('winModal');
  _modalPopOut(modal, showLanding, 250);
}

// Saves the full battle log (G.logs) + match metadata as a downloadable JSON
// file — meant to be shared back for balance analysis. Button lives next to
// the win-modal's continue button (see index.html).
function downloadBattleLog(){
  const data={
    timestamp: new Date().toISOString(),
    gameVersion: GAME_VERSION,
    // AI_VERSION only exists (and only matters) for vsAI games — deliberately
    // recorded separately from gameVersion: the AI's scoring/decision logic
    // (ai.js) can be revised without touching cards or mechanics, and that
    // will likely happen MORE often than GAME_VERSION bumps going forward
    // (see CLAUDE.md "AI Module" — AI_VERSION vs GAME_VERSION). Without this,
    // a log reviewed weeks from now would have no way to tell which AI
    // "brain" actually produced these decisions.
    aiVersion: (G.mode==='vsai' && typeof AI_VERSION!=='undefined') ? AI_VERSION : null,
    mode: G.mode,
    turns: G.turnNum,
    winner: document.getElementById('winTitle')?.textContent || null,
    humanFaction: G.humanFaction || null,
    aiFaction: G.aiFaction || null,
    finalHp: { tea: G.tea?.hp, jeet: G.jeet?.hp },
    logs: G.logs,
  };
  const blob=new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`battle_log_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function resetGame(){
  document.getElementById('winModal').classList.add('hidden');
  document.getElementById('game').style.display='flex';
  document.getElementById('landing').style.display='none';
  const prevMode=G.mode, prevHuman=G.humanFaction, prevDeckConfig=G.deckConfig, prevRushDecks=G.rushDecks;
  // Restart replays the exact same setup as the match that just ended — same
  // deck config/picks (see prevRushDecks above) AND same dice-roll outcome,
  // not a fresh roll. Falls back to 'tea' only if G.firstFaction is somehow
  // unset (shouldn't happen post-initState, but keeps this defensive).
  const prevFirstFaction=G.firstFaction||'tea';
  if(prevMode==='vsai'){
    initState({mode:'vsai',humanFaction:prevHuman,deckConfig:prevDeckConfig,rushDecks:prevRushDecks,firstFaction:prevFirstFaction});
    render(); // see startGame() for why — here the stale frame would be the JUST-FINISHED match
    lg('─ NEW GAME (VS AI) ─','trn');
    lg(`${prevFirstFaction==='tea'?'TAVERN':'JEET'} goes first.`,'imp');
    logTurnSnapshot(prevFirstFaction);
    aiAutoMulligan(G.aiFaction);
    startMulliganFor(G.humanFaction); // synchronous — same flicker fix as above
    return;
  }
  initState({deckConfig:prevDeckConfig,rushDecks:prevRushDecks,firstFaction:prevFirstFaction});
  render();
  lg('─ NEW GAME ─','trn');
  lg(`${prevFirstFaction==='tea'?'TAVERN':'JEET'} goes first.`,'imp');
  logTurnSnapshot(prevFirstFaction);
  startMulliganFor(prevFirstFaction); // synchronous — see 'flicker' note in CLAUDE.md backlog: a 50ms delay here left the bare arena visible for a frame between two black overlays
}

function toggleLog(){
  const p=document.getElementById('logPanel');
  if(p.classList.contains('open')){
    playSfx('yellow_buttom');
    p.classList.remove('modal-pop-in-fast','modal-pop-out-fast');
    void p.offsetWidth;
    p.classList.add('modal-pop-out-fast');
    setTimeout(()=>{
      p.classList.remove('open','modal-pop-out-fast');
    }, 125);
  } else {
    playSfx('screen_monitor');
    p.classList.add('open');
    p.classList.remove('modal-pop-in-fast','modal-pop-out-fast');
    void p.offsetWidth;
    p.classList.add('modal-pop-in-fast');
  }
}

function toggleHamburger(){
  const btn=document.getElementById('hamburgerBtn');
  const menu=document.getElementById('hamburgerMenu');
  const opening = !btn.classList.contains('open');
  playSfx(opening ? 'open_door' : 'yellow_buttom');
  btn.classList.toggle('open');
  menu.classList.toggle('open');
}

function updateMulliganBtn(faction){
  const m=G.mulligan[faction];
  const sfx=faction==='tea'?'T':'J';
  const btn=document.getElementById('mulliganBtn'+sfx);
  if(!btn)return;
  const isTurn1 = false;
  const placeholder=document.getElementById('deckPlaceholder'+sfx);
  if(!isTurn1||m.used>=3){
    btn.style.display='none';
    if(placeholder)placeholder.style.display='block';
    return;
  }
  btn.style.display='flex';
  btn.textContent='';
  if(placeholder)placeholder.style.display='none';
}

function startBurn(){
  const cur=G[G.turn];
  if(cur.burned){lg('Already burned a card this turn!','dmg');return;}
  G.phase='burn';lg('Select a card from your HAND to burn.');render();
}

document.addEventListener('click',function(e){
  const btn=document.getElementById('hamburgerBtn');
  const menu=document.getElementById('hamburgerMenu');
  if(menu&&btn&&!btn.contains(e.target)&&!menu.contains(e.target)){
    btn.classList.remove('open');
    menu.classList.remove('open');
  }
});

// ── Loading screen ───────────────────────────────────────────────
(function(){
  const dotsEl = document.getElementById('ldots');
  let dotCount = 1;
  const dotsInterval = setInterval(() => {
    dotCount = dotCount >= 3 ? 1 : dotCount + 1;
    if(dotsEl) dotsEl.textContent = '.'.repeat(dotCount);
  }, 400);

  function hideLoading(){
    clearInterval(dotsInterval);
    const ls = document.getElementById('loadingScreen');
    const landing = document.getElementById('landing');
    if(!ls) return;
    ls.style.transition = 'opacity 0.4s ease';
    ls.style.opacity = '0';
    setTimeout(() => {
      ls.style.display = 'none';
      if(landing) landing.style.display = 'flex';
    }, 400);
  }

  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(() => setTimeout(hideLoading, 600));
  } else {
    window.addEventListener('load', () => setTimeout(hideLoading, 600));
  }
})();

// Boot

preloadAssets();
initState();
spawnStars();
spawnNebula(); // ← если хочешь туман
lg('─ Game Start ─','trn');
lg('TEA goes first. Good luck!','imp');


window.addEventListener('resize', adjustHandOverlap);

// ── Rules language toggle ────────────────────────────────────────
const RULES_TITLES = { ENG:'RULES', RUS:'Правила', POR:'REGRAS', VN:'Luật Chơi' };
function setRulesLang(lang) {
  ['ENG','RUS','POR','VN'].forEach(l => {
    const body = document.getElementById('rules' + l);
    if (body) body.style.display = l === lang ? '' : 'none';
  });
  document.querySelectorAll('.rules-lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === lang);
  });
  const title = document.getElementById('rulesTitleLabel');
  if (title) {
    title.textContent = RULES_TITLES[lang] || 'Rules';
    title.classList.toggle('rus-title', lang === 'RUS');
  }
  const screen = document.getElementById('rulesScreen');
  if (screen) screen.scrollTop = 0;
}

// Generic pass-device screen — shows "Hand the device to <faction>" and, once
// the Ready button is clicked, calls onReady() (or just closes if null/omitted).
// Used both for the initial Tea->Jeet mulligan handoff and after every turn
// in hotseat, so players never see each other's hand between turns.
function showPassScreen(faction, onReady){
  G._passCallback = onReady;
  document.getElementById('passTitle').textContent='PASS THE DEVICE';
  document.getElementById('passText').textContent=
    faction==='jeet' ? 'Hand the device to Player 2 — Jeet.' : 'Hand the device to Player 1 — Tea.';
  const passEl = document.getElementById('passScreen');
  passEl.classList.remove('hidden');
  _modalPopIn(passEl);
}

// ── Pass screen transition ───────────────────────────────────────
function passReady(){
  const passEl = document.getElementById('passScreen');
  const cb = G._passCallback;
  G._passCallback = null;
  const proceed = () => {
    passEl.classList.add('hidden');
    if(cb) cb(); // else: nothing further needed, board is already rendered
  };
  _modalPopOut(passEl, proceed, 250);
}

// Добавь в ui.js или отдельный файл, вызови один раз при загрузке
function spawnStars() {
  ['oppFieldZone','playerFieldZone'].forEach(id => {
    const zone = document.getElementById(id);
    if (!zone) return;
    for (let i = 0; i < 30; i++) {
      const s = document.createElement('div');
      const size = [1,1,1,2,2,3][Math.floor(Math.random()*6)]; // чаще маленькие
s.style.width  = size + 'px';
s.style.height = size + 'px';
      s.className = 'field-star';
      s.style.left = Math.random() * 100 + '%';
      s.style.top  = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 4) + 's';
      s.style.animationDuration = (2 + Math.random() * 3) + 's';
      s.style.opacity = Math.random() * 0.6 + 0.1;
      zone.appendChild(s);
    }
  });
}

function spawnNebula() {
  const zones = [
    { id: 'oppFieldZone',    cls: 'jeet' },
    { id: 'playerFieldZone', cls: 'tea'  },
  ];
  zones.forEach(({ id, cls }) => {
    const zone = document.getElementById(id);
    if (!zone) return;
    for (let i = 0; i < 2; i++) {
      const n = document.createElement('div');
      n.className = `field-nebula ${cls}`;
      n.style.left = (20 + Math.random() * 60) + '%';
      n.style.top  = (10 + Math.random() * 60) + '%';
      n.style.animationDelay = (Math.random() * 10) + 's';
      zone.appendChild(n);
    }
  });
}

// ── Tag tooltips (desktop only — mouse events не срабатывают на touch) ──────
// Жёсткая блокировка на тач-устройствах: некоторые мобильные браузеры после тапа
// всё же шлют синтетическое mousemove/mouseover, из-за чего подсказка периодически
// всплывала на телефоне и мешала визуалу (фидбек автора). IS_TOUCH_DEVICE считается
// один раз при загрузке и используется как ранний выход из обработчика ниже —
// на устройствах с реальной мышью (ontouchstart отсутствует и нет touch-точек)
// подсказки работают как раньше, без изменений.
const IS_TOUCH_DEVICE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

const TAG_TOOLTIPS = {
  'fear':    { name: 'Fear',    desc: 'On attack: target skips its next turn and deals no counter-damage.' },
  'pierce':  { name: 'Pierce',  desc: 'Ignores Provoke. Can attack the base or any enemy directly.' },
  'regen':   { name: 'Regen',   desc: 'Restores X HP to itself at the start of each of your turns.' },
  'burn':    { name: 'Burn',    desc: 'On attack: target loses 1 HP at the start of each of its turns until death.' },
  'rage':    { name: 'Rage',    desc: 'Gains +1 ATK permanently each time it attacks.' },
  'provoke': { name: 'Provoke', desc: 'All enemy attacks must target this creature.' },
  'vanguard':{ name: 'Vanguard', desc: 'Enters the battlefield already active — can attack the same turn it is played.' },
  'invisible':{ name: 'Invisible', desc: 'Cannot be targeted while allies exist. No counter-attack when it is attacked.' },
  'untamed': { name: 'Untamed', desc: "Regains strength during the opponent's turn — clears exhausted as soon as its own turn ends, instead of waiting for its owner's next turn like everything else." },
  'ward':    { name: 'Ward', desc: 'Immune to magic damage (AOE, Shard, targeted spell damage — the category that ignores Armor), and also immune to Fear and Burn. Normal attack damage still hurts it.' },
};

const TOOLTIP_TRIGGER_SELECTOR = '.card-tag-icon, .card-cost, .card-small-cost, .card-type-dot, .stat-ess-box, .card-small-hp-box, .card-hp-box, .card-atk-box, .card-small-atk-box, .card-armor-box, .card-small-armor-box';
const TOOLTIP_SHOW_DELAY = 500; // мс — подсказка не появляется мгновенно

let _tooltipEl = null;
let _tooltipTimer = null;
let _tooltipCurrentTarget = null;
function _getTooltip(){ return _tooltipEl || (_tooltipEl = document.getElementById('card-tooltip')); }

function _tooltipDataFor(el){
  if(el.classList.contains('card-tag-icon')) return TAG_TOOLTIPS[el.dataset.tag] || null;
  if(el.classList.contains('card-cost') || el.classList.contains('card-small-cost')){
    return { name: '', desc: 'Cost of <img src="img/ess.png" class="tt-ess-icon" alt="Essence">' };
  }
  if(el.classList.contains('card-type-dot')){
    return { name: '', desc: `Type of card: ${el.dataset.type || 'Unknown'}` };
  }
  if(el.classList.contains('stat-ess-box')){
    return { name: '', desc: `${el.dataset.max || '?'} max Essence` };
  }
  if(el.classList.contains('card-small-hp-box')){
    return { name: '', desc: `${el.dataset.hp}/${el.dataset.maxhp} HP` };
  }
  // .card-armor-box / .card-small-armor-box — data-armor/data-maxarmor навешаны в mkEl()
  // (render.js) для живых карт (data-armor — текущий пул, может быть меньше max, если
  // часть уже поглощена ударом в этом ходу) и в catalog.js/deckbuilder.js для превью карт
  // вне игры (там armor===maxarmor всегда, живого состояния ещё нет).
  if(el.classList.contains('card-armor-box') || el.classList.contains('card-small-armor-box')){
    return { name: '', desc: `${el.dataset.armor}/${el.dataset.maxarmor} Armor` };
  }
  // Полноразмерная карта (рука/превью/зум) — data-hp/data-maxhp навешаны в mkEl()
  // (render.js). У карт в руке hp===maxHp (ещё не в бою); у зумленной карты поля
  // (showFieldCardPreview копирует card.hp как есть, см. render.js) может отличаться —
  // тултип тогда честно покажет текущее HP, даже если сама плашка на карте рисует
  // только maxHp (компактности ради).
  if(el.classList.contains('card-hp-box')){
    return { name: '', desc: `${el.dataset.hp}/${el.dataset.maxhp} HP` };
  }
  // .card-atk-box / .card-small-atk-box — data-base/data-bonus навешаны в mkEl()
  // (render.js, полноразмерная и мини-карта соответственно — та же логика бонуса,
  // просто два разных DOM-узла для двух режимов отображения карты). Если бонусов нет,
  // просто "Attack power"; если есть — расшифровка, откуда взялась итоговая цифра
  // (aura/rage/squad/combat-trick всё суммируются в один и тот же bonus на
  // data-атрибуте, без разбивки по источнику — различать их тут не пытаемся, это уже
  // детали реализации).
  if(el.classList.contains('card-atk-box')||el.classList.contains('card-small-atk-box')){
    const base=Number(el.dataset.base||0), bonus=Number(el.dataset.bonus||0);
    return { name: '', desc: bonus ? `Attack power: ${base} base + ${bonus} bonus` : 'Attack power' };
  }
  return null;
}

function _positionTooltip(tip, clientX, clientY){
  const PAD = 12;
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = clientX + 18;
  let y = clientY - th - 10;

  if(x + tw > vw - PAD) x = clientX - tw - 10;
  if(y < PAD) y = clientY + 18;

  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

function _hideTooltipNow(){
  clearTimeout(_tooltipTimer);
  _tooltipTimer = null;
  _tooltipCurrentTarget = null;
  const tip = _getTooltip();
  if(tip) tip.classList.remove('tt-visible');
}

// Доп. страховка: если подсказка уже как-то показалась (напр. успела всплыть до
// этого фикса/из старого состояния), любой тач сразу её гасит.
if(IS_TOUCH_DEVICE){
  document.addEventListener('touchstart', _hideTooltipNow, {passive:true});
}

document.addEventListener('mousemove', (e) => {
  if(IS_TOUCH_DEVICE) return; // жёсткий блок — на телефоне подсказки не показываем вообще
  const tip = _getTooltip();
  if(!tip) return;

  const el = e.target.closest(TOOLTIP_TRIGGER_SELECTOR);
  if(!el){
    _hideTooltipNow();
    return;
  }

  if(el !== _tooltipCurrentTarget){
    // Навелись на новый элемент — сбрасываем предыдущее состояние и планируем
    // показ через TOOLTIP_SHOW_DELAY; если курсор уйдёт раньше — таймер отменится.
    _hideTooltipNow();
    _tooltipCurrentTarget = el;
    const data = _tooltipDataFor(el);
    if(!data) return;
    const x = e.clientX, y = e.clientY;
    _tooltipTimer = setTimeout(() => {
      tip.innerHTML = (data.name ? `<div class="tt-name">${data.name}</div>` : '') + `<div class="tt-desc">${data.desc}</div>`;
      _positionTooltip(tip, x, y);
      tip.classList.add('tt-visible');
    }, TOOLTIP_SHOW_DELAY);
    return;
  }

  // Всё ещё на том же элементе — если подсказка уже показана, просто следуем за курсором
  if(tip.classList.contains('tt-visible')){
    _positionTooltip(tip, e.clientX, e.clientY);
  }
});

// ── Hover-звук card_navigation_cursor на кнопках лендинга ─────────────────────────
// mouseover + relatedTarget-проверка: срабатывает один раз при входе на кнопку,
// а не на каждый пиксель движения мыши внутри неё.
// ── Hover-звук card_navigation_cursor на ВСЕХ кнопках ─────────────────────────────
// mouseover + relatedTarget-проверка: срабатывает один раз при входе на кнопку,
// а не на каждый пиксель движения мыши внутри неё. Один делегированный обработчик
// на document покрывает вообще все <button> (лендинг, бургер, модалки, каталог,
// попапы карт и т.д.), плюс .play-gate-sprite — это div, а не button.
document.addEventListener('DOMContentLoaded', ()=>{
  document.addEventListener('mouseover', (e)=>{
    const btn = e.target.closest('button, .play-gate-sprite');
    if(!btn) return;
    if(btn.contains(e.relatedTarget)) return;
    playSfx('card_navigation_cursor');
  });
});

// Landing footer version label — pulled from GAME_VERSION (data.js) so it
// can't drift out of sync with the actual build the way a hardcoded string
// in index.html could.
document.addEventListener('DOMContentLoaded', ()=>{
  const el=document.getElementById('landingVersionLabel');
  if(el) el.textContent=`v${GAME_VERSION}`;
});
