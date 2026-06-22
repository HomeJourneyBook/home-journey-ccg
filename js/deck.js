function buildDeck(f) {
  const t = f==='tea';
  const weak   = t ? ['t_szarg_w','t_orb_w','t_drig_w','t_umb_w','t_meh_w','t_ksi_w']
                   : ['j_szarg_w','j_orb_w','j_drig_w','j_umb_w','j_meh_w','j_ksi_w'];
  const legs   = t ? ['t_tean','t_aslex','t_tuborg','t_faeron','t_nab']
                   : ['j_reap','j_ryv','j_mal','j_phleg','j_vard'];
  const spells = t ? ['t_sp1','t_sp2','t_sp3','t_sp4'] : ['j_sp1','j_sp2','j_sp3','j_sp4'];
  const worlds = t ? ['t_w1','t_w2'] : ['j_w1','j_w2'];
  const arts   = t ? ['t_a1','t_a2'] : ['j_a1','j_a2'];
  const extra  = t ? [] : ['unseen'];

  let d = [];
  weak.forEach(k=>{d.push(k);d.push(k);d.push(k);d.push(k);d.push(k);}); // 5 copies each = 30
  legs.forEach(k=>d.push(k));
  spells.forEach(k=>{d.push(k);d.push(k);});
  worlds.forEach(k=>d.push(k));
  arts.forEach(k=>d.push(k));
  extra.forEach(k=>d.push(k));

  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}

let UID=0;
function mkCard(key){
  const def=DEFS[key];
  if(!def)return null;
  UID++;
  return{id:'c'+UID,key,name:def.name,cost:def.cost,hp:def.hp,maxHp:def.hp,atk:def.atk,art:def.art,
    f:def.f,tags:[...(def.tags||[])],ab:def.ab||'',
    spell:!!def.spell,world:!!def.world,artifact:!!def.artifact,unique:!!def.unique,
    sleeping:false,exhausted:false,feared:false,burning:false,atkBonus:0};
}
