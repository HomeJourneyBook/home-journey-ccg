// Три готовых сборки колоды (см. обсуждение размеров стартера):
//  full    — как было, 45/46 карт, вся глубина архетипов
//  compact — ~39/40 карт: те же архетипы и легендарки, меньше копий спеллов
//  mini    — ~28/29 карт: только 4 архетипа из 6, 2 легендарки — быстрый показ на вечер
const DECK_CONFIGS = {
  full:    { groupCount:6, groupSize:4, legCount:5, spellCopies:3 },
  compact: { groupCount:6, groupSize:4, legCount:3, spellCopies:2 },
  mini:    { groupCount:4, groupSize:4, legCount:2, spellCopies:2 },
};

function buildDeck(f, configKey) {
  const cfg = DECK_CONFIGS[configKey] || DECK_CONFIGS.full;
  const t = f==='tea';

  const szarg  = t ? ['t_trvl25_w','t_trvl33_w','t_trvl34_w','t_trvl434_w']
                   : ['j_trvl12_w','j_trvl49_w','j_trvl57_w','j_trvl551_w'];

  const orb    = t ? ['t_trvl10_w','t_trvl398_w','t_trvl433_w','t_trvl1034_w']
                   : ['j_trvl170_w','j_trvl429_w','j_trvl454_w','j_trvl523_w'];

  const drg    = t ? ['t_trvl1_w','t_trvl31_w','t_trvl892_w','t_trvl14_w']
                   : ['j_trvl36_w','j_trvl41_w','j_trvl1015_w','j_trvl859_w'];

  const umb    = t ? ['t_trvl583_w','t_trvl2_w','t_trvl52_w','t_trvl6_w']
                   : ['j_trvl550_w','j_trvl53_w','j_trvl54_w','j_trvl20_w'];

  const mch    = t ? ['t_trvl38_w','t_trvl18_w','t_trvl35_w','t_trvl11_w']
                   : ['j_trvl22_w','j_trvl724_w','j_trvl921_w','j_trvl804_w'];

  const xui    = t ? ['t_trvl187_w','t_trvl704_w','t_trvl26_w','t_trvl39_w']
                   : ['j_trvl579_w','j_trvl972_w','j_trvl50_w','j_trvl37_w'];

  const legs   = t ? ['t_tean','t_aslex','t_tuborg','t_faeron','t_nab']
                   : ['j_reap','j_ryv','j_mal','j_phleg','j_vard'];

  const spells = t ? ['t_sp1','t_sp2','t_sp3','t_sp4']
                   : ['j_sp1','j_sp2','j_sp3','j_sp4'];

  const worlds = t ? ['t_w1','t_w2'] : ['j_w1','j_w2'];
  const arts   = t ? ['t_a1','t_a2'] : ['j_a1','j_a2'];
  const extra  = t ? [] : ['unseen'];

  let d = [];
  const allGroups = [szarg,orb,drg,umb,mch,xui];
  allGroups.slice(0, cfg.groupCount).forEach(group => {
    group.slice(0, cfg.groupSize).forEach(k => d.push(k));
  });

  legs.slice(0, cfg.legCount).forEach(k => d.push(k));
  spells.forEach(k => { for(let i=0;i<cfg.spellCopies;i++) d.push(k); });
  worlds.forEach(k => d.push(k));
  arts.forEach(k => d.push(k));
  extra.forEach(k => d.push(k));

  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}

let UID=0;
function mkCard(key){
  const def=DEFS[key];
  if(!def)return null;
  UID++;
  return{id:'c'+UID,key,name:def.name,cost:def.cost,hp:def.hp,maxHp:def.hp,atk:def.atk,art:def.art,img:def.img||null,
    f:def.f,tags:[...(def.tags||[])],ab:def.ab||'',
    spell:!!def.spell,world:!!def.world,artifact:!!def.artifact,unique:!!def.unique,
    sleeping:false,exhausted:false,feared:false,burning:false,atkBonus:0};
}
