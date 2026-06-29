function preloadAssets(){
  const criticalImages = [
    'img/card_tea.png', 'img/card_jeet.png',
    'img/card_name_bg.png', 'img/card_text_bg.png', 'img/card_stat_bg.png',
    'img/pcard_tea_bg.png', 'img/pcard_jeet_bg.png', 'img/pcard_bg.png',
    'img/tag_bg.png', 'img/space_bg.png', 'img/brand.png',
    'img/button_1.png', 'img/button_grav_1.png', 'img/button_mul_1.png',
    'img/deck.png', 'img/runaha.png',
    'img/heart.png', 'img/attack.png', 'img/chel.png', 'img/ess.png',
    'img/hp_tea.png', 'img/hp_jeet.png',
    'img/type_creature.png', 'img/type_spell.png', 'img/type_world.png',
    'img/type_artifact.png', 'img/type_unique.png',
    'img/ico_fear.png', 'img/ico_pierce.png', 'img/ico_regen.png',
    'img/ico_burn.png', 'img/ico_rage.png', 'img/ico_provoke.png',
    'img/ef_burn.png',
    'img/btn_play.png', 'img/btn_burn.png', 'img/btn_spell.png',
  ];
  criticalImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
  setTimeout(() => {
    if(typeof DEFS === 'undefined') return;
    Object.values(DEFS).forEach(def => {
      if(def.img){ const img = new Image(); img.src = `img/cards/${def.img}`; }
    });
  }, 2000);
}

// ── Start menu ────────────────────────────────────────────────
let _expandTimer = null;

function collapseStart(){
  document.getElementById('startMainBtn').classList.remove('hidden');
  document.getElementById('startOptions').classList.add('hidden');
  if(_expandTimer){ clearTimeout(_expandTimer); _expandTimer=null; }
}

function expandStart(){
  document.getElementById('startMainBtn').classList.add('hidden');
  document.getElementById('startOptions').classList.remove('hidden');
  if(_expandTimer) clearTimeout(_expandTimer);
  _expandTimer = setTimeout(collapseStart, 30000);
}

// ── Navigation ────────────────────────────────────────────────
function showLanding(){
  document.getElementById('game').style.display='none';
  document.getElementById('mulliganScreen').classList.add('hidden');
  document.getElementById('passScreen').classList.add('hidden');
  document.getElementById('winModal').classList.add('hidden');
  document.getElementById('confirmModal').classList.add('hidden');
  initState();
  collapseStart();
  document.getElementById('landing').style.display='flex';
}

function showConfirm(text, btnText, onConfirm){
  const modal=document.getElementById('confirmModal');
  modal.querySelector('p').textContent=text;
  modal.querySelector('h2').textContent='ARE YOU SURE?';
  const yesBtn=modal.querySelector('.btn[style*="e05555"]');
  yesBtn.textContent=btnText;
  yesBtn.onclick=()=>{modal.classList.add('hidden');onConfirm();};
  modal.classList.remove('hidden');
}

function askMenu(){
  showConfirm('Current game will be lost.','Yes, Exit',()=>showLanding());
}

function askRestart(){
  showConfirm('Current game will be lost.','Yes, Restart',()=>resetGame());
}

function startGame(){
  document.getElementById('landing').style.display='none';
  document.getElementById('game').style.display='flex';
  collapseStart();
  setTimeout(()=>{ startMulliganFor('tea'); }, 50);
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
    setTimeout(proceed, 150);
  } else {
    proceed();
  }
}

function showScreen(name){
  document.getElementById('landing').style.display='none';
  document.getElementById(name+'Screen').classList.add('active');
  if(name==='catalog') setTimeout(renderCatalog, 0);
}

function hideScreen(name){
  document.getElementById(name+'Screen').classList.remove('active');
  document.getElementById('landing').style.display='flex';
}

function showWin(w){
  document.getElementById('winTitle').textContent=w.toUpperCase()+' WINS!';
  document.getElementById('winText').textContent=w==='tea'?'The Tavern stands. The Great Return draws closer.':'Jeet consumes all. The cycle breaks.';
  document.getElementById('winModal').classList.remove('hidden');
}

function resetGame(){
  document.getElementById('winModal').classList.add('hidden');
  document.getElementById('game').style.display='flex';
  document.getElementById('landing').style.display='none';
  initState();
  lg('─ NEW GAME ─','trn');
  lg('TEA goes first.','imp');
  setTimeout(()=>{ startMulliganFor('tea'); }, 50);
}

function toggleLog(){
  const p=document.getElementById('logPanel');
  p.classList.toggle('open');
}

function toggleHamburger(){
  const btn=document.getElementById('hamburgerBtn');
  const menu=document.getElementById('hamburgerMenu');
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
    setTimeout(proceed, 150);
  } else {
    proceed();
  }
}
