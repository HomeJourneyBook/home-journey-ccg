// ── Background music ─────────────────────────────────────────────
const MUSIC_TARGET_VOLUME = 0.4;
const FADE_MS = 900; // длительность плавного появления/затухания музыки

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
  if(musicEnabled) playSfx('yellow_buttom_play_endturn_menu_gravyard_loop'); // звук только при включении
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
  'Navigation_Cursor', 'Click_Cursor', 'Burn_Card',
  'card_atack', 'card_fire_atack', 'card_spell_atack',
  'open_door', 'yellow_buttom_play_endturn_menu_gravyard_loop',
  'baf', 'debaf'
];

// Минимальный интервал между повторными вызовами одного и того же звука (мс).
// Navigation_Cursor тротлим жёстко — иначе при движении по картам будет шторм вызовов.
const SFX_THROTTLE = { 'Navigation_Cursor': 90 };
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
  if(sfxEnabled) playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
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
    'img/bg_modal.png', 'img/bg_jest.png',
    'img/log_frame.png', 'img/grav_frame.png',
    'img/bg_jest_log.png', 'img/bg_jest_grav.png',
    'img/bones.png',
    'img/bg_bottom_bar.png',

    // ── Кнопки лендинга ──
    'img/btn_playgame1.png', 'img/btn_playgame2.png',
    'img/btn_playgame_gates_sheet.png', 'img/btn_playgame_frame.png', 'img/btn_playgame_hover.png',
    'img/btn_rules1.png', 'img/btn_rules2.png',
    'img/btn_catalog1.png', 'img/btn_catalog2.png',
    'img/btn_lore1.png', 'img/btn_lore2.png',
    'img/btn_hotseat1.png', 'img/btn_hotseat2.png', 'img/btn_hotseatH.png',
    'img/btn_vsai1.png', 'img/btn_online1.gif',
    'img/btn_music_on1.png', 'img/btn_music_on2.png',
    'img/btn_music_off1.png', 'img/btn_music_off2.png',

    // ── Кнопки модалок ──
    'img/btn_yes.png', 'img/btn_cancel.png',
    'img/btn_mulligan.png', 'img/btn_ready.png',
    'img/btn_X.png', 'img/btn_Xh.png', 'img/btn_X2.png',

    // ── Карты — базовые фреймы ──
    'img/card_tea.png', 'img/card_jeet.png',
    'img/card_name_bg.png', 'img/card_text_bg.png',
    'img/card_stat_bg.png', 'img/card_text_world_bg.png',
    'img/pcard_tea_bg.png', 'img/pcard_jeet_bg.png',
    'img/pcard_tea_shutter_sheet.png', 'img/pcard_jeet_shutter_sheet.png',
    'img/tag_bg.png',

    // ── Стат-бары ──
    'img/bg_tea_bar.png', 'img/bg_jeet_bar.png',
    'img/bg_statbar_hp.png', 'img/bg_statbar_ess.png',
    'img/bg_statbar_tea.png', 'img/bg_statbar_jeet.png',
    'img/statbar_jeet.png', 'img/statbar_tea.png',
    'img/bg_cost_tea.png', 'img/bg_cost_jeet.png',
    'img/bg_handP_bar.png', 'img/bg_handO_bar.png', 'img/bg_arena_bar.png',

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
    'img/btn_turn1.png', 'img/btn_zoom.png',
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
  playSfx('open_door');
  _clearGateAnimTimers();
  wrap.classList.remove('gate-idle'); // анимация пошла — ховер больше не показываем
  for(let frame=2; frame<=GATE_FRAME_COUNT; frame++){
    const delay=(frame-1)*GATE_STEP_MS;
    _gateAnimTimers.push(setTimeout(()=>{
      _setGateFrame(sprite,frame);
      if(frame===GATE_FRAME_COUNT){
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

function showConfirm(text, btnText, onConfirm){
  const modal=document.getElementById('confirmModal');
  modal.querySelector('p').textContent=text;
  modal.querySelector('h2').textContent='ARE YOU SURE?';
  const yesBtn=modal.querySelector('#confirmYesBtn');
  yesBtn.textContent=btnText;
  yesBtn.onclick=()=>{ closeConfirmModal(onConfirm); };
  modal.classList.remove('hidden');
  const inner=modal.querySelector('.modal');
  if(inner){
    inner.classList.remove('modal-pop-in','modal-pop-out');
    void inner.offsetWidth;
    inner.classList.add('modal-pop-in');
  }
}

function closeConfirmModal(onConfirm){
  playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
  const modal=document.getElementById('confirmModal');
  const inner=modal.querySelector('.modal');
  const finish=()=>{
    modal.classList.add('hidden');
    if(onConfirm) onConfirm();
  };
  if(inner){
    inner.classList.remove('modal-pop-in','modal-pop-out');
    void inner.offsetWidth;
    inner.classList.add('modal-pop-out');
    setTimeout(finish, 250);
  } else {
    finish();
  }
}


function askMenu(){
  showConfirm('Current game will be lost.','Yes, Exit',()=>showLanding());
}

function askRestart(){
  showConfirm('Current game will be lost.','Yes, Restart',()=>resetGame());
}

function startGame(){
  const landing=document.getElementById('landing');
  landing.classList.add('exit-center');
  setTimeout(()=>{
    landing.style.display='none';
    landing.classList.remove('exit-center');
    document.getElementById('game').style.display='flex';
    collapseStart();
    setTimeout(()=>{ startMulliganFor('tea'); }, 50);
  }, 315);
}

// ── VS AI ──────────────────────────────────────────────────────
function openVsAiPicker(){
  playSfx('yellow_buttom_play_endturn_menu_gravyard_loop');
  const landing=document.getElementById('landing');
  landing.classList.add('exit-center');
  setTimeout(()=>{
    const modal=document.getElementById('vsAiPickerModal');
    modal.classList.remove('hidden');
    const inner=modal.querySelector('.modal');
    if(inner){
      inner.classList.remove('modal-pop-in','modal-pop-out');
      void inner.offsetWidth;
      inner.classList.add('modal-pop-in');
    }
  }, 315);
}

function startGameVsAI(humanFaction){
  const modal=document.getElementById('vsAiPickerModal');
  const inner=modal.querySelector('.modal');
  const proceed=()=>{
    modal.classList.add('hidden');
    const landing=document.getElementById('landing');
    landing.style.display='none';
    landing.classList.remove('exit-center');
    document.getElementById('game').style.display='flex';
    collapseStart();
    initState({mode:'vsai',humanFaction});
    lg('─ NEW GAME (VS AI) ─','trn');
    // ИИ разыгрывает свой муллиган мгновенно и без интерфейса —
    // человек видит только собственный муллиган.
    aiAutoMulligan(G.aiFaction);
    setTimeout(()=>{ startMulliganFor(G.humanFaction); }, 50);
  };
  if(inner){
    inner.classList.remove('modal-pop-in','modal-pop-out');
    void inner.offsetWidth;
    inner.classList.add('modal-pop-out');
    setTimeout(proceed, 250);
  } else {
    proceed();
  }
}

function startMulliganFor(faction){
  G.mulliganTurn = faction;
  const name = faction==='tea' ? 'TAVERN — YOUR HAND' : 'JEET CORE — YOUR HAND';
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
  const mulliganModal = mulliganEl.querySelector('.modal');
  if(mulliganModal){
    mulliganModal.classList.remove('modal-pop-in','modal-pop-out');
    void mulliganModal.offsetWidth;
    mulliganModal.classList.add('modal-pop-in');
  }
  const mulliganBtn = document.querySelector('#mulliganScreen .btn[onclick="doMulliganPhase()"]');
  if(mulliganBtn){
    if(m.used >= 3){
      mulliganBtn.disabled = true;
      mulliganBtn.style.opacity = '0.3';
      mulliganBtn.style.cursor = 'not-allowed';
    } else {
      mulliganBtn.disabled = false;
      mulliganBtn.style.opacity = '1';
      mulliganBtn.style.cursor = 'pointer';
    }
  }
}

function doMulliganPhase(){
  doMulligan(G.mulliganTurn);
  startMulliganFor(G.mulliganTurn);
}

function readyFromMulligan(){
  const mulliganEl = document.getElementById('mulliganScreen');
  const mulliganModal = mulliganEl.querySelector('.modal');

  const proceed = () => {
    mulliganEl.classList.add('hidden');
    if(G.mode==='vsai'){
      // В VS AI муллиган-экран показывается только человеку — экран "передай устройство"
      // тут не нужен, сразу переходим к партии.
      G.phase='action';
      G.mulliganTurn=null;
      const game=document.getElementById('game');
      game.classList.remove('game-fade-in');
      void game.offsetWidth;
      game.classList.add('game-fade-in');
      render();
      requestAnimationFrame(adjustHandOverlap);
      if(G.turn===G.aiFaction&&typeof runAiTurn==='function'){
        setTimeout(()=>runAiTurn(),600);
      }
      return;
    }
    if(G.mulliganTurn==='tea'){
      document.getElementById('passTitle').textContent='PASS THE DEVICE';
      document.getElementById('passText').textContent='Hand the device to Player 2 — Jeet Core.';
      const passEl = document.getElementById('passScreen');
      passEl.classList.remove('hidden');
      const passModal = passEl.querySelector('.modal');
      if(passModal){
        passModal.classList.remove('modal-pop-in','modal-pop-out');
        void passModal.offsetWidth;
        passModal.classList.add('modal-pop-in');
      }
    } else {
      G.phase='action';
      G.mulliganTurn=null;
      const game = document.getElementById('game');
      game.classList.remove('game-fade-in');
      void game.offsetWidth;
      game.classList.add('game-fade-in');
      render();
      requestAnimationFrame(adjustHandOverlap);
    }
  };

  if(mulliganModal){
    mulliganModal.classList.remove('modal-pop-in','modal-pop-out');
    void mulliganModal.offsetWidth;
    mulliganModal.classList.add('modal-pop-out');
    setTimeout(proceed, 250);
  } else {
    proceed();
  }
}

// ── Navigation ────────────────────────────────────────────────

function showWin(w){
  document.getElementById('winTitle').textContent=w.toUpperCase()+' WINS!';
  document.getElementById('winText').textContent=w==='tea'?'The Tavern stands. The Great Return draws closer.':'Jeet consumes all. The cycle breaks.';
  const modal=document.getElementById('winModal');
  modal.classList.remove('hidden');
  const inner=modal.querySelector('.modal');
  if(inner){
    inner.classList.remove('modal-pop-in','modal-pop-out');
    void inner.offsetWidth;
    inner.classList.add('modal-pop-in');
  }
}

function closeWinModal(){
  const modal=document.getElementById('winModal');
  const inner=modal.querySelector('.modal');
  if(inner){
    inner.classList.remove('modal-pop-in','modal-pop-out');
    void inner.offsetWidth;
    inner.classList.add('modal-pop-out');
    setTimeout(()=>{ showLanding(); }, 250);
  } else {
    showLanding();
  }
}

function resetGame(){
  document.getElementById('winModal').classList.add('hidden');
  document.getElementById('game').style.display='flex';
  document.getElementById('landing').style.display='none';
  const prevMode=G.mode, prevHuman=G.humanFaction;
  if(prevMode==='vsai'){
    initState({mode:'vsai',humanFaction:prevHuman});
    lg('─ NEW GAME (VS AI) ─','trn');
    aiAutoMulligan(G.aiFaction);
    setTimeout(()=>{ startMulliganFor(G.humanFaction); }, 50);
    return;
  }
  initState();
  lg('─ NEW GAME ─','trn');
  lg('TEA goes first.','imp');
  setTimeout(()=>{ startMulliganFor('tea'); }, 50);
}

function toggleLog(){
  const p=document.getElementById('logPanel');
  if(p.classList.contains('open')){
    p.classList.remove('modal-pop-in-fast','modal-pop-out-fast');
    void p.offsetWidth;
    p.classList.add('modal-pop-out-fast');
    setTimeout(()=>{
      p.classList.remove('open','modal-pop-out-fast');
    }, 125);
  } else {
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
  playSfx(opening ? 'open_door' : 'yellow_buttom_play_endturn_menu_gravyard_loop');
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

// ── Pass screen transition ───────────────────────────────────────
function passReady(){
  const passEl = document.getElementById('passScreen');
  const passModal = passEl.querySelector('.modal');
  const proceed = () => {
    passEl.classList.add('hidden');
    startMulliganFor('jeet');
  };
  if(passModal){
    passModal.classList.remove('modal-pop-in','modal-pop-out');
    void passModal.offsetWidth;
    passModal.classList.add('modal-pop-out');
    setTimeout(proceed, 250);
  } else {
    proceed();
  }
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
const TAG_TOOLTIPS = {
  'fear':    { name: 'Fear',    desc: 'On attack: target skips its next turn and deals no counter-damage.' },
  'pierce':  { name: 'Pierce',  desc: 'Ignores Provoke. Can attack the base or any enemy directly.' },
  'regen':   { name: 'Regen',   desc: 'Restores X HP to itself at the start of each of your turns.' },
  'burn':    { name: 'Burn',    desc: 'On attack: target loses 1 HP at the start of each of its turns until death.' },
  'rage':    { name: 'Rage',    desc: 'Gains +1 ATK permanently each time it attacks.' },
  'provoke': { name: 'Provoke', desc: 'All enemy attacks must target this creature.' },
  'vanguard':{ name: 'Vanguard', desc: 'Enters the battlefield already active — can attack the same turn it is played.' },
  'invisible':{ name: 'Invisible', desc: 'Cannot be targeted while allies exist. No counter-attack when it is attacked.' },
};

const TOOLTIP_TRIGGER_SELECTOR = '.card-tag-icon, .card-cost, .card-small-cost, .card-type-dot, .stat-ess-box';
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

document.addEventListener('mousemove', (e) => {
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

// ── Hover-звук Navigation_Cursor на кнопках лендинга ─────────────────────────
// mouseover + relatedTarget-проверка: срабатывает один раз при входе на кнопку,
// а не на каждый пиксель движения мыши внутри неё.
// ── Hover-звук Navigation_Cursor на ВСЕХ кнопках ─────────────────────────────
// mouseover + relatedTarget-проверка: срабатывает один раз при входе на кнопку,
// а не на каждый пиксель движения мыши внутри неё. Один делегированный обработчик
// на document покрывает вообще все <button> (лендинг, бургер, модалки, каталог,
// попапы карт и т.д.), плюс .play-gate-sprite — это div, а не button.
document.addEventListener('DOMContentLoaded', ()=>{
  document.addEventListener('mouseover', (e)=>{
    const btn = e.target.closest('button, .play-gate-sprite');
    if(!btn) return;
    if(btn.contains(e.relatedTarget)) return;
    playSfx('Navigation_Cursor');
  });
});
