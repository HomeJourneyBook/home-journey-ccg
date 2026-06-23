function startGame(){
  document.getElementById('landing').style.display='none';
  document.getElementById('game').style.display='flex';
  setTimeout(()=>{ render(); requestAnimationFrame(adjustHandOverlap); },50);
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
  document.getElementById('game').style.display='none';
  document.getElementById('landing').style.display='flex';
  initState();
  lg('─── NEW GAME ───','trn');
  lg('TEA goes first.','imp');
  render();
}

function toggleLog(){
  const p=document.getElementById('logPanel');
  p.classList.toggle('open');
}

function toggleHamburger(){
  const m=document.getElementById('hamburgerMenu');
  m.style.display=m.style.display==='none'?'block':'none';
}

function updateMulliganBtn(faction){
  const m=G.mulligan[faction];
  const sfx=faction==='tea'?'T':'J';
  const btn=document.getElementById('mulliganBtn'+sfx);
  if(!btn)return;
  const used=m.used;
  const isTurn1=(faction==='tea'&&G.turnNum===1&&G.turn==='tea')||
                (faction==='jeet'&&G.turnNum===1&&G.turn==='jeet');
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
    menu.style.display='none';
  }
});

window.addEventListener('resize', adjustHandOverlap);

// Boot
initState();
lg('─── Game Start ───','trn');
lg('TEA goes first. Good luck!','imp');
render();
