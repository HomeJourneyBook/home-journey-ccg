#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// SUSTAIN-ДЕКА: Orbiton + Dreegan + все спеллы + уники/world/artifact,
// БЕЗ Mechird/Szarg/Xuiqtr вообще — убираем конкурентов-атакеров, чтобы
// проверить, не в контексте ли дело (control-план, который защищает
// хил, вместо "рандомная карта среди хаоса", как в full-archetype-audit).
//
//   A — текущие живые статы Orbiton (без правок)
//   B — та же дека, но Orbiton пробафан (ATK curve 1-1-2-2-2 + heal-от-
//       cost + squad→armor:2, см. orbiton-atk-heal-audit.js)
//
// Использование: node sim/orbiton-sustain-deck-audit.js [games=1500] [--json out.json]
// ══════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { runBatch } = require('./headless.js');

const ROOT = path.join(__dirname, '..');

function loadDefs(){
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), sandbox, { filename:'js/data.js' });
  return vm.runInContext('DEFS', sandbox);
}
function gtypeOf(def){ const t=(def.tags||[]).find(t=>t.startsWith('gtype:')); return t?t.slice(6):null; }

function buildSustainDeck(f, DEFS){
  const deck = []; const seenSpell = new Set();
  for(const [key, def] of Object.entries(DEFS)){
    if(def.f !== f || def.neutral) continue;
    const gt = gtypeOf(def);
    if(gt === 'mch' || gt === 'szg' || gt === 'xui') continue; // исключаем атакеров-конкурентов
    if(def.spell){
      if(seenSpell.has(def.name)) continue;
      seenSpell.add(def.name);
      deck.push(key);
      continue;
    }
    deck.push(key); // orb, umb(нет — тоже исключим ниже), drg creatures, uniques, world, artifact
  }
  return deck;
}
// поправка: umb тоже не входит в "Orbiton+Dreegan+ремувал" по ТЗ — фильтруем явно
function buildSustainDeckStrict(f, DEFS){
  const deck = []; const seenSpell = new Set();
  for(const [key, def] of Object.entries(DEFS)){
    if(def.f !== f || def.neutral) continue;
    const gt = gtypeOf(def);
    if(gt === 'mch' || gt === 'szg' || gt === 'xui' || gt === 'umb') continue;
    if(def.spell){
      if(seenSpell.has(def.name)) continue;
      seenSpell.add(def.name);
      deck.push(key);
      continue;
    }
    deck.push(key);
  }
  return deck;
}

function healForCost(cost){ return cost<=2 ? 2 : (cost<=4 ? 3 : 4); }
function atkForCost(cost){ return cost>=3 ? 2 : 1; }
function buildOrbBuffPatch(DEFS){
  const patch = {};
  for(const [key, def] of Object.entries(DEFS)){
    if(gtypeOf(def) !== 'orb') continue;
    const newDef = { ...def, tags: def.tags.map(t => t.startsWith('heal:') ? `heal:${healForCost(def.cost)}` : t) };
    newDef.atk = atkForCost(def.cost);
    patch[key] = newDef;
  }
  return patch;
}

const VARIANTS = [
  { name: 'A: sustain-дека, Orbiton как есть', buff:false },
  { name: 'B: sustain-дека, Orbiton пробафан (ATK+heal+squad-armor)', buff:true },
];

const n = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '1500', 10);
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? process.argv[jsonIdx+1] : null;
const allResults = {};
const DEFS_SRC = fs.readFileSync(path.join(ROOT,'js/data.js'),'utf8');
const nameOf = key => { const m = DEFS_SRC.match(new RegExp(key+':\\s*\\{name:"([^"]+)"')); return m ? m[1] : key; };

for(const variant of VARIANTS){
  const DEFS = loadDefs();
  const defsPatch = variant.buff ? buildOrbBuffPatch(DEFS) : null;
  if(defsPatch) Object.assign(DEFS, defsPatch);
  const squadPatch = variant.buff ? { gtype:'orb', effect:'armor', val:2 } : null;

  const teaDeck = buildSustainDeckStrict('tea', DEFS);
  const jeetDeck = buildSustainDeckStrict('jeet', DEFS);

  console.error(`\n### ${variant.name} ###  Tea:${teaDeck.length} Jeet:${jeetDeck.length} cards, ${n} games`);
  const t0 = Date.now();
  const agg = runBatch(n, {
    seedFirst: true, deckConfig: 'rush',
    rushDecks: { tea: teaDeck, jeet: jeetDeck },
    defsPatch: defsPatch || undefined,
    squadPatch: squadPatch || undefined,
  });
  const secs = ((Date.now()-t0)/1000).toFixed(1);

  console.log(`\n═══ ${variant.name} (${agg.valid}/${agg.games}, ${secs}s) ═══`);
  console.log(`Winrate: TEA ${agg.winrate.tea}% / JEET ${agg.winrate.jeet}%   Turns median ${agg.turns.median}, mean ${agg.turns.mean}  fatigue ${agg.fatigueRate}%`);
  console.log(`Base dmg by gtype:`, agg.gtypeBaseDmg);

  const orbKeys = Object.keys(DEFS).filter(k => gtypeOf(DEFS[k]) === 'orb');
  const drgKeys = Object.keys(DEFS).filter(k => gtypeOf(DEFS[k]) === 'drg');
  for(const [label, keys] of [['Orbiton', orbKeys], ['Dreegan', drgKeys]]){
    let playedSum=0, winsSum=0;
    const rows = keys.filter(k => agg.cardStats[k] && agg.cardStats[k].played >= 15)
      .map(k => { const s=agg.cardStats[k]; playedSum+=s.played; winsSum+=s.wins;
        return { key:k, f:DEFS[k].f, cost:DEFS[k].cost, hp:DEFS[k].hp, atk:DEFS[k].atk,
          played:s.played, wr:+(s.wins/s.played*100).toFixed(1) }; })
      .sort((a,b)=>a.cost-b.cost);
    console.log(`\n${label} per-card WWP:`);
    rows.forEach(r => console.log(`  ${r.f} cost${r.cost} ${r.hp}/${r.atk}  ${r.wr}%  ${nameOf(r.key)}  (${r.played} games)`));
    console.log(`${label} avgWWP (pooled): ${playedSum ? (winsSum/playedSum*100).toFixed(1) : 0}%`);
  }

  allResults[variant.name] = agg;
}

if(jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(allResults, null, 2));
