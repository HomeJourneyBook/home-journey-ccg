function getCardType(def){
  if(def.unique) return 'unique';
  if(def.spell) return 'spell';
  if(def.world) return 'world';
  if(def.artifact) return 'artifact';
  return 'creature';
}

const catalogFilters={faction:'all',type:'all',sort:'name',dir:1};

function setSort(val,btn){
  if(catalogFilters.sort===val){
    // Повторный клик по УЖЕ активной кнопке сортировки — разворот направления
    // (было по убыванию силы — станет по возрастанию, и наоборот), а не повторная
    // пересортировка тем же порядком (по просьбе автора, 2026-07-13).
    catalogFilters.dir*=-1;
  } else {
    catalogFilters.sort=val;
    catalogFilters.dir=1; // новая кнопка — всегда стартует со своего "родного" направления
  }
  const group=btn.parentElement;
  group.querySelectorAll('.filter-btn').forEach(b=>{
    b.classList.remove('active');
    // Подпись остальных кнопок сбрасываем на дефолтный вариант (data-label1) — направление
    // запоминается только у ТЕКУЩЕЙ активной кнопки, у остальных оно не имеет смысла.
    if(b.dataset.label1) b.textContent=b.dataset.label1;
  });
  btn.classList.add('active');
  if(btn.dataset.label1) btn.textContent = catalogFilters.dir===1 ? btn.dataset.label1 : btn.dataset.label2;
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
    if(catalogFilters.faction==='neutral'){
      if(!def.neutral) return false;
    } else if(catalogFilters.faction!=='all'&&def.f!==catalogFilters.faction) return false;
    const type=getCardType(def);
    if(catalogFilters.type!=='all'&&type!==catalogFilters.type) return false;
    if(search&&!def.name.toLowerCase().includes(search)&&!def.ab.toLowerCase().includes(search)) return false;
    return true;
  });
  cards.sort(([,a],[,b])=>{
    const dir=catalogFilters.dir||1;
    if(catalogFilters.sort==='name') return a.name.localeCompare(b.name)*dir;
    if(catalogFilters.sort==='cost') return (a.cost-b.cost)*dir;
    if(catalogFilters.sort==='hp') return (b.hp-a.hp)*dir;
    if(catalogFilters.sort==='atk') return (b.atk-a.atk)*dir;
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
      'vanguard':'<img src="img/ico_vanguard.png" style="width:60%;height:60%;">',
      'invisible':'<img src="img/ico_invis.png" style="width:60%;height:60%;">',
      'untamed': '<img src="img/ico_untamed.png" style="width:60%;height:60%;">',
      'ward':    '<img src="img/ico_ward.png" style="width:60%;height:60%;">',
  'incarnation': '<img src="img/ico_incarn.png" style="width:60%;height:60%;">',
  'taunt_break': '<img src="img/ico_tb.png" style="width:60%;height:60%;">',
    };
    const tagIcons=(def.tags||[])
      .map(t=>({full:t, base:t.split(':')[0], val:t.includes(':')?t.split(':')[1]:''}))
      .filter(t=>TAG_ICONS[t.base])
      .map(t=>`<div class="card-tag-icon" data-tag="${t.base}" data-tagval="${t.val}">${TAG_ICONS[t.base]}</div>`)
      .join('');

    const div=document.createElement('div');
    div.className=`card cat-card ${def.f==='tea'?'tea-card':'jeet-card'}${def.neutral?' neutral-card':''}`;
    div.style.cursor='pointer';
    div.onclick=()=>{playSfx('yellow_buttom');openCardDetail(def);};
    div.addEventListener('mouseenter',()=>playSfx('card_navigation_cursor'));
    if(def.world||def.fullArt){
  div.classList.add('world-card');
  if(def.img) div.style.cssText += ';background-image:url(\'img/cards/'+def.img+'\')!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;';
  div.innerHTML=`
    <div class="card-cost">${def.cost}</div>
    <div class="card-type-dot" data-type="${getTypeDotLabel(def)}" style="background-image:url('${getTypeDotImg(def)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
    <div class="card-name-box"><div class="card-name">${def.name}</div></div>
    <div class="card-ability-box"><div class="card-ability">${def.ab||''}</div></div>`;
  grid.appendChild(div);
  return;
}
    div.innerHTML=`
      <div class="card-cost">${def.cost}</div>
      ${hasTag(def,'armor')?`<div class="card-armor-box" data-armor="${getTagVal(def,'armor')||0}" data-maxarmor="${getTagVal(def,'armor')||0}"><span class="card-armor"><img src="./img/armor.png" class="stat-icon">${getTagVal(def,'armor')||0}</span></div>`:''}
      <div class="card-type-dot" data-type="${getTypeDotLabel(def)}" style="background-image:url('${getTypeDotImg(def)}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      <div class="card-art">${def.img?`<img src="img/cards/${def.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`:def.art}</div>
      ${tagIcons?`<div class="card-tag-icons">${tagIcons}</div>`:''}
      <div class="card-name-box"><div class="card-name">${def.name}</div></div>
      ${!isSW?`<div class="card-stats">
        <div class="card-hp-box" data-hp="${def.hp}" data-maxhp="${def.hp}"><span class="card-hp"><img src="./img/heart.png" class="stat-icon">${def.hp}</span></div>
        <img src="img/${def.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon">
        <div class="card-atk-box" data-base="${def.atk}" data-bonus="0"><span class="card-atk"><img src="./img/attack.png" class="stat-icon">${def.atk}</span></div>
      </div>`
      :`<div class="card-stats" style="justify-content:center;"><img src="img/${def.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon"></div>`}
      <div class="card-ability-box"><div class="card-ability">${def.ab||''}</div></div>
    `;
    grid.appendChild(div);
  });
}

function openCardDetail(def){
  const overlay=document.getElementById('cardDetailOverlay');
  const box=document.getElementById('cardDetailBox');

  const isSW = def.spell||def.world||def.artifact;
  const faction = def.f==='tea'?'tea':'jeet';

  const TAG_ICONS = {
    'fear':    '<img src="img/ico_fear.png" style="width:60%;height:60%;">',
    'pierce':  '<img src="img/ico_pierce.png" style="width:60%;height:60%;">',
    'regen':   '<img src="img/ico_regen.png" style="width:60%;height:60%;">',
    'burn':    '<img src="img/ico_burn.png" style="width:60%;height:60%;">',
    'rage':    '<img src="img/ico_rage.png" style="width:60%;height:60%;">',
    'provoke': '<img src="img/ico_provoke.png" style="width:60%;height:60%;">',
    'vanguard':'<img src="img/ico_vanguard.png" style="width:60%;height:60%;">',
    'invisible':'<img src="img/ico_invis.png" style="width:60%;height:60%;">',
    'untamed': '<img src="img/ico_untamed.png" style="width:60%;height:60%;">',
    'ward':    '<img src="img/ico_ward.png" style="width:60%;height:60%;">',
  'incarnation': '<img src="img/ico_incarn.png" style="width:60%;height:60%;">',
  'taunt_break': '<img src="img/ico_tb.png" style="width:60%;height:60%;">',
  };
  const tagIcons = (def.tags||[])
    .map(t=>({full:t, base:t.split(':')[0], val:t.includes(':')?t.split(':')[1]:''}))
    .filter(t=>TAG_ICONS[t.base])
    .map(t=>`<div class="card-tag-icon" data-tag="${t.base}" data-tagval="${t.val}">${TAG_ICONS[t.base]}</div>`)
    .join('');

  const typeDot = def.world?'img/type_world.png'
    : def.unique?'img/type_unique.png'
    : def.artifact?'img/type_artifact.png'
    : def.spell?'img/type_spell.png'
    : 'img/type_creature.png';
  const typeLabel = def.world?'World'
    : def.unique?'Unique'
    : def.artifact?'Artifact'
    : def.spell?'Spell'
    : 'Traveler';

  const bgClass = faction==='tea'?'tea-card':'jeet-card';
  const neutralClass = def.neutral?'neutral-card':'';
  const worldClass = (def.world||def.fullArt)?'world-card':'';
  const worldBg = (def.world||def.fullArt) && def.img ? `background-image:url('img/cards/${def.img}')!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;` : '';

  box.className = 'card-detail-box';

  if(def.world||def.fullArt){
    box.innerHTML = `
      <button class="card-detail-close" onclick="closeCardDetail()">✕</button>
      <div class="card ${bgClass} ${worldClass} ${neutralClass} card-detail-scaled" style="${worldBg}">
        <div class="card-cost">${def.cost}</div>
        <div class="card-type-dot" data-type="${typeLabel}" style="background-image:url('${typeDot}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
        <div class="card-name-box"><div class="card-name">${def.name}</div></div>
        <div class="card-ability-box"><div class="card-ability">${def.ab||''}</div></div>
      </div>
    `;
    overlay.style.display='flex';
    return;
  }

  box.innerHTML = `
    <button class="card-detail-close" onclick="closeCardDetail()">✕</button>
    <div class="card ${bgClass} ${worldClass} ${neutralClass} card-detail-scaled" style="${worldBg}">
      <div class="card-cost">${def.cost}</div>
      ${hasTag(def,'armor')?`<div class="card-armor-box" data-armor="${getTagVal(def,'armor')||0}" data-maxarmor="${getTagVal(def,'armor')||0}"><span class="card-armor"><img src="./img/armor.png" class="stat-icon">${getTagVal(def,'armor')||0}</span></div>`:''}
      <div class="card-type-dot" data-type="${typeLabel}" style="background-image:url('${typeDot}');background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      <div class="card-art">${def.img
        ? `<img src="img/cards/${def.img}" style="width:100%;height:100%;object-fit:cover;display:block;">`
        : def.art}</div>
      ${tagIcons ? `<div class="card-tag-icons">${tagIcons}</div>` : ''}
      <div class="card-name-box"><div class="card-name">${def.name}</div></div>
      ${!isSW
        ? `<div class="card-stats" style="width:var(--card-stats-w);">
             <div class="card-hp-box" data-hp="${def.hp}" data-maxhp="${def.hp}"><span class="card-hp"><img src="./img/heart.png" class="stat-icon">${def.hp}</span></div>
             <img src="img/${def.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon">
             <div class="card-atk-box" data-base="${def.atk}" data-bonus="0"><span class="card-atk"><img src="./img/attack.png" class="stat-icon">${def.atk}</span></div>
           </div>`
        : `<div class="card-stats" style="justify-content:center;"><img src="img/${def.f==='jeet'?'chel2':'chel'}.png" class="card-stats-icon"></div>`}
      <div class="card-ability-box"><div class="card-ability">${def.ab||''}</div></div>
    </div>
  `;

  overlay.style.display='flex';
}

function closeCardDetail(e){
  if(e&&e.target!==document.getElementById('cardDetailOverlay')&&!e.target.classList.contains('card-detail-close')) return;
  document.getElementById('cardDetailOverlay').style.display='none';
}
