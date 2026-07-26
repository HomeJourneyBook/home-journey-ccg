#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// A/B: дать ВСЕМ картам Orbiton (gtype:orb) armor:1, без правки других
// статов — проверяем, тянет ли это архетип к здоровому WWP/damage share.
// Патчится in-memory через defsPatch (headless.js), data.js не трогается —
// решение ещё не принято, только проверка цифр.
//
// Дека — full-collection census (та же логика, что full-archetype-audit.js),
// чтобы сравнить с уже снятым baseline (Orbiton avgWWP 48.0%, dmg share 4.2%).
//
// Использование: node sim/orbiton-armor-audit.js [games=3000] [--json out.json]
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

function gtypeOf(def){
  const t = (def.tags || []).find(t => t.startsWith('gtype:'));
  return t ? t.slice(6) : null;
}

function buildFullDeck(f, DEFS){
  const deck = [];
  const seenSpell = new Set();
  for(const [key, def] of Object.entries(DEFS)){
    if(def.f !== f || def.neutral) continue;
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

// Строит defsPatch: копия каждой карты gtype:orb с armor:1 добавленным в tags
// (если ещё не armor'ена — на всякий случай, хотя сейчас у Orbiton armor нет вообще).
function buildOrbArmorPatch(DEFS){
  const patch = {};
  for(const [key, def] of Object.entries(DEFS)){
    if(gtypeOf(def) !== 'orb') continue;
    const tags = def.tags.some(t => t.startsWith('armor:')) ? def.tags.slice() : [...def.tags, 'armor:1'];
    patch[key] = { ...def, tags };
  }
  return patch;
}

const n = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '3000', 10);
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? process.argv[jsonIdx+1] : null;

const VARIANTS = [
  { name: 'A: baseline (текущий Orbiton, без брони)', patch: null },
  { name: 'B: + armor:1 на все карты Orbiton', patch: 'orb_armor' },
];

const allResults = {};
const DEFS_SRC = fs.readFileSync(path.join(ROOT,'js/data.js'),'utf8');
const nameOf = key => { const m = DEFS_SRC.match(new RegExp(key+':\\s*\\{name:"([^"]+)"')); return m ? m[1] : key; };

for(const variant of VARIANTS){
  const DEFS = loadDefs();
  const defsPatch = variant.patch === 'orb_armor' ? buildOrbArmorPatch(DEFS) : null;
  if(defsPatch) Object.assign(DEFS, defsPatch);

  const teaDeck = buildFullDeck('tea', DEFS);
  const jeetDeck = buildFullDeck('jeet', DEFS);

  console.error(`\n### ${variant.name} ###`);
  console.error(`Running ${n} games (${teaDeck.length}/${jeetDeck.length} cards)...`);

  const t0 = Date.now();
  const agg = runBatch(n, {
    seedFirst: true,
    deckConfig: 'rush',
    rushDecks: { tea: teaDeck, jeet: jeetDeck },
    defsPatch: defsPatch || undefined,
  });
  const secs = ((Date.now()-t0)/1000).toFixed(1);

  console.log(`\n═══ ${variant.name} (${agg.valid}/${agg.games}, ${secs}s) ═══`);
  console.log(`Winrate: TEA ${agg.winrate.tea}% / JEET ${agg.winrate.jeet}%`);
  console.log(`Turns: median ${agg.turns.median}, fatigue ${agg.fatigueRate}%`);

  const totalDmg = Object.values(agg.gtypeBaseDmg).reduce((a,b)=>a+b,0);
  const orbDmg = agg.gtypeBaseDmg.orb || 0;
  console.log(`Base dmg share Orbiton: ${totalDmg ? (orbDmg/totalDmg*100).toFixed(1) : 0}%  (raw: ${orbDmg})`);

  const orbKeys = Object.keys(DEFS).filter(k => gtypeOf(DEFS[k]) === 'orb');
  let playedSum=0, winsSum=0;
  console.log(`Orbiton per-card WWP:`);
  orbKeys
    .filter(k => agg.cardStats[k] && agg.cardStats[k].played >= 15)
    .map(k => { const s=agg.cardStats[k]; playedSum+=s.played; winsSum+=s.wins;
      return { key:k, f:DEFS[k].f, cost:DEFS[k].cost, hp:DEFS[k].hp, atk:DEFS[k].atk,
        played:s.played, wr:+(s.wins/s.played*100).toFixed(1) }; })
    .sort((a,b)=> a.cost-b.cost)
    .forEach(r => console.log(`  ${r.f} cost${r.cost} ${r.hp}/${r.atk}  ${r.wr}%  ${nameOf(r.key)}  (${r.played} games)`));
  console.log(`Orbiton avgWWP (pooled): ${playedSum ? (winsSum/playedSum*100).toFixed(1) : 0}%`);

  allResults[variant.name] = agg;
}

if(jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(allResults, null, 2));
