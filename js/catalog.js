function getTypeDotColorDef(def){
  if(def.world) return '#e05555';
  if(def.unique) return '#c8a84b';
  if(def.artifact) return '#5599ff';
  if(def.spell) return '#88ccff';
  return '#888888';
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

function getCardType(def){
  if(def.unique) return 'unique';
  if(def.spell) return 'spell';
  if(def.world) return 'world';
  if(def.artifact) return 'artifact';
  return 'creature';
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
    const tags=(def.tags||[]).filter(t=>!['spell','world','artifact','unique'].includes(t));
    const tagHtml=tags.map(t=>{
      const base=t.split(':')[0];
      return `<span class="tag ${base}" style="font-size:5px;padding:1px 3px;">${t.toUpperCase()}</span>`;
    }).join('');

    const div=document.createElement('div');
    div.className=`cat-card ${def.f==='tea'?'tea-c':'jeet-c'}`;
    div.style.cursor='pointer';
    div.onclick=()=>openCardDetail(def);
    div.innerHTML=`
      <div class="cat-card-cost">${def.cost}</div>
      <div class="card-type-dot" style="background:${getTypeDotColorDef(def)};"></div>
      <div class="cat-card-art">${def.img?`<img src="img/cards/${def.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:def.art}</div>
      <div class="cat-card-name">${def.name}</div>
      ${!isSW?`<div class="cat-card-stats"><span class="cat-card-hp">❤${def.hp}</span><span class="cat-card-atk">⚔${def.atk}</span></div>`:''}
      <div class="cat-card-ab">${def.ab||''}</div>
`;
    grid.appendChild(div);
  });
}

function openCardDetail(def){
  const overlay=document.getElementById('cardDetailOverlay');
  const box=document.getElementById('cardDetailBox');
  box.className=`card-detail ${def.f==='tea'?'tea-detail':'jeet-detail'}`;
  document.getElementById('cdArt').textContent=def.art;
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
