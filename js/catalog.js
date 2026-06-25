function getCardType(def){
  if(def.unique) return 'unique';
  if(def.spell) return 'spell';
  if(def.world) return 'world';
  if(def.artifact) return 'artifact';
  return 'creature';
}

const catalogFilters={faction:'all',type:'all',sort:'name'};

function setSort(val,btn){
  catalogFilters.sort=val;
  const group=btn.parentElement;
  group.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderCatalog();
}

function setFilter(key,val,btn){
  catalogFilters[key]=val;
  const group=btn.parentElement;
  group.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderCatalog();
}

function renderCatalog(){
  const grid=document.getElementById('catalogGrid');
  const search=(document.getElementById('catalogSearch')?.value||'').toLowerCase();
  if(!grid)return;

  let cards=Object.entries(DEFS).filter(([key,def])=>{
    if(catalogFilters.faction!=='all'&&def.f!==catalogFilters.faction) return false;
    const type=getCardType(def);
    if(catalogFilters.type!=='all'&&type!==catalogFilters.type) return false;
    if(search&&!def.name.toLowerCase().includes(search)&&!def.ab.toLowerCase().includes(search)) return false;
    return true;
  });
  cards.sort(([,a],[,b])=>{
    if(catalogFilters.sort==='name') return a.name.localeCompare(b.name);
    if(catalogFilters.sort==='cost') return a.cost-b.cost;
    if(catalogFilters.sort==='hp') return b.hp-a.hp;
    if(catalogFilters.sort==='atk') return b.atk-a.atk;
    return 0;
  });

  document.getElementById('catalogCount').textContent=`${cards.length} cards`;
  grid.innerHTML='';
  cards.forEach(([key,def])=>{
    const isSW=def.spell||def.world||def.artifact;

    const TAG_ICONS = {
      'fear':    '<img src="img/ico_fear.png" style="width:60%;height:60%;">',
      'pierce':  '<img src="img/ico_pierce.png" style="width:60%;height:60%;">',
      'regen':   '<img src="img/ico_regen.png" style="width:60%;height:60%;">',
      'burn':    '<img src="img/ico_burn.png" style="width:60%;height:60%;">',
      'rage':    '<img src="img/ico_rage.png" style="width:60%;height:60%;">',
      'provoke': '<img src="img/ico_provoke.png" style="width:60%;height:60%;">',
    };
    const tagIcons=(def.tags||[])
      .map(t=>t.split(':')[0])
      .filter(t=>TAG_ICONS[t])
      .map(t=>`<div class="card-tag-icon">${TAG_ICONS[t]}</div>`)
      .join('');

    const div=document.createElement('div');
    div.className=`card cat-card ${def.f==='tea'?'tea-card':'jeet-card'}`;
    div.style.cursor='pointer';
    div.onclick=()=>openCardDetail(def);
    if(def.world){
  div.classList.add('world-card');
  if(def.img) div.classList.add('world-img-' + def.img.replace('.','_'));
  div.innerHTML=`
    <div class="card-cost">${def.cost}</div>
    <div class="card-type-dot" style="background-image:url('${getTypeDotImg(def)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    <div class="card-name-box"><div class="card-name">${def.name}</div></div>
    <div class="card-ability-box"><div class="card-ability">${def.ab||''}</div></div>`;
  grid.appendChild(div);
  return;
}
    div.innerHTML=`
      <div class="card-cost">${def.cost}</div>
      <div class="card-type-dot" style="background-image:url('${getTypeDotImg(def)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      <div class="card-art">${def.img?`<img src="img/cards/${def.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:def.art}</div>
      ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
      <div class="card-name-box"><div class="card-name">${def.name}</div></div>
      ${!isSW?`<div class="card-stats">
        <div class="card-hp-box"><span class="card-hp"><img src="./img/heart.png" class="stat-icon">${def.hp}</span></div>
        <img src="img/chel.png" class="card-stats-icon">
        <div class="card-atk-box"><span class="card-atk"><img src="./img/attack.png" class="stat-icon">${def.atk}</span></div>
      </div>`
      :`<div class="card-stats" style="justify-content:center;"><img src="img/chel.png" class="card-stats-icon"></div>`}
      <div class="card-ability-box"><div class="card-ability">${def.ab||''}</div></div>
    `;
    grid.appendChild(div);
  });
}

function openCardDetail(def){
  const overlay=document.getElementById('cardDetailOverlay');
  const box=document.getElementById('cardDetailBox');
  box.className=`card-detail ${def.f==='tea'?'tea-detail':'jeet-detail'}`;
  const cdArt=document.getElementById('cdArt');
  if(def.img){
    cdArt.innerHTML=`<img src="img/cards/${def.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
  } else {
    cdArt.textContent=def.art;
  }
  document.getElementById('cdName').textContent=def.name;
  document.getElementById('cdCost').textContent=`${def.cost} Essence`;
  const isSW=def.spell||def.world||def.artifact;
  document.getElementById('cdStats').innerHTML=isSW?''
    :`<span class="cat-card-hp">❤ ${def.hp} HP</span><span class="cat-card-atk">⚔ ${def.atk} ATK</span>`;
  document.getElementById('cdAb').textContent=def.ab||'—';
  const tags=(def.tags||[]).filter(t=>!['spell','world','artifact','unique'].includes(t));
  document.getElementById('cdTags').innerHTML=tags.map(t=>{
    const base=t.split(':')[0];
    return `<span class="tag ${base}" style="font-size:8px;padding:2px 6px;">${t.toUpperCase()}</span>`;
  }).join('');
  overlay.style.display='flex';
}

function closeCardDetail(e){
  if(e&&e.target!==document.getElementById('cardDetailOverlay')&&!e.target.classList.contains('card-detail-close')) return;
  document.getElementById('cardDetailOverlay').style.display='none';
}
