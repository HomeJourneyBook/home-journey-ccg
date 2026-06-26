function preloadAssets(){
  const images = [
    // Фоны карт
    'img/card_tea.png', 'img/card_jeet.png',
    // UI элементы
    'img/card_name_bg.png', 'img/card_text_bg.png', 'img/card_stat_bg.png',
    'img/pcard_tea_bg.png', 'img/pcard_jeet_bg.png', 'img/pcard_bg.png',
    'img/tag_bg.png', 'img/space_bg.png', 'img/brand.png',
    // Кнопки
    'img/button_1.png', 'img/button_grav_1.png', 'img/button_mul_1.png',
    'img/deck.png', 'img/runaha.png',
    // Иконки статов
    'img/heart.png', 'img/attack.png', 'img/chel.png', 'img/ess.png',
    'img/hp_tea.png', 'img/hp_jeet.png',
    // Иконки типов
    'img/type_creature.png', 'img/type_spell.png', 'img/type_world.png',
    'img/type_artifact.png', 'img/type_unique.png',
    // Иконки тегов
    'img/ico_fear.png', 'img/ico_pierce.png', 'img/ico_regen.png',
    'img/ico_burn.png', 'img/ico_rage.png', 'img/ico_provoke.png',
    // Эффекты
    'img/ef_burn.png',
    // Кнопки попапов
    'img/btn_play.png', 'img/btn_burn.png', 'img/btn_spell.png',
  ];

  // Добавляем арт всех карт из DEFS
  if(typeof DEFS !== 'undefined'){
    Object.values(DEFS).forEach(def=>{
      if(def.img) images.push(`img/cards/${def.img}`);
    });
  }

  images.forEach(src=>{
    const img = new Image();
    img.src = src;
  });
}

function startGame(){
  document.getElementById('landing').style.display='none';
  document.getElementById('game').style.display='flex';
  // Не рендерим сразу — запускаем фазу мулигана
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
  // Показать карты
  const container = document.getElementById('mulliganCards');
  container.innerHTML='';
  // card-h = 24vh, scale = 0.7, лишнее = 24vh * 0.3
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
  document.getElementById('mulliganScreen').classList.remove('hidden');

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
  // Обновить карты на экране
  startMulliganFor(G.mulliganTurn);
}

function readyFromMulligan(){
  document.getElementById('mulliganScreen').classList.add('hidden');
  if(G.mulliganTurn==='tea'){
    // Показать экран передачи устройства
    document.getElementById('passTitle').textContent='PASS THE DEVICE';
    document.getElementById('passText').textContent='Hand the device to Player 2 — Jeet Core.';
    document.getElementById('passScreen').classList.remove('hidden');
  } else {
    // Оба готовы — начать игру
    G.phase='action';
    G.mulliganTurn=null;
    render();
    requestAnimationFrame(adjustHandOverlap);
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

function askMenu(){
  document.getElementById('confirmModal').classList.remove('hidden');
}

function confirmMenu(){
  document.getElementById('confirmModal').classList.add('hidden');
  resetGame();
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
  const used=m.used;
const isTurn1 = false; // mulligan теперь только в pre-game фазе
  const placeholder=document.getElementById('deckPlaceholder'+sfx);
  if(!isTurn1||used>=3){
    btn.style.display='none';
    if(placeholder)placeholder.style.display='block';
    return;
  }
  btn.style.display='flex'; // flex keeps 34x34 size
  btn.textContent=''; // no text - PNG button
  if(placeholder)placeholder.style.display='none';
}

function startBurn(){
  const cur=G[G.turn];
  if(cur.burned){lg('Already burned a card this turn!','dmg');return;}
  G.phase='burn';lg('Select a card from your HAND to burn.');render();
}

// Close hamburger when clicking outside
document.addEventListener('click',function(e){
  const btn=document.getElementById('hamburgerBtn');
  const menu=document.getElementById('hamburgerMenu');
  if(menu&&btn&&!btn.contains(e.target)&&!menu.contains(e.target)){
    btn.classList.remove('open');
    menu.classList.remove('open');
  }
});

window.addEventListener('resize', adjustHandOverlap);

// Boot
preloadAssets();
initState();
lg('─ Game Start ─','trn');
lg('TEA goes first. Good luck!','imp');
