#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// ЭКСПЕРИМЕНТ: вводить ли cost5 Szarg, и с какой статлайн — не трогая
// data.js. Использует opts.defsPatch (headless.js) для in-memory
// инъекции гипотетической карты прямо в DEFS перед сборкой колод/партией.
//
// Три варианта гоняются подряд на ОДНОЙ и той же widescreen-деке (все
// карты Mechird+Szarg + ровный фон остальных архетипов/уников/спеллов,
// та же логика, что и mch-szg-audit.js):
//   A — без cost5 Szarg вообще (контроль, только что снятое ограничение cost4)
//   B — + гипотетический cost5 Szarg 5/6 (incarnation:4 + draw_attack:1), только Tea
//   C — + тот же кандидат, но 5/5 (на 1 мягче) — для сравнения
//
// Использование: node sim/szg-cost5-audit.js [games=1500] [--json out.json]
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

function buildDeckFor(f, DEFS){
  const keysByGtype = {};
  const uniques = [];
  const spells = [];
  let world = null, artifact = null;

  for(const [key, def] of Object.entries(DEFS)){
    if(def.f !== f || def.neutral) continue;
    if(def.spell){ spells.push(key); continue; }
    if(def.world){ world = world || key; continue; }
    if(def.artifact){ artifact = artifact || key; continue; }
    if(def.unique){ uniques.push(key); continue; }
    const gt = gtypeOf(def);
    if(gt){ (keysByGtype[gt] = keysByGtype[gt] || []).push(key); }
  }

  const deck = [];
  deck.push(...(keysByGtype.mch || []));
  deck.push(...(keysByGtype.szg || []));
  for(const gt of ['orb','drg','umb','xui']){
    const arr = (keysByGtype[gt] || []).slice().sort((a,b)=>DEFS[a].cost-DEFS[b].cost);
    if(arr.length){
      deck.push(arr[0]);
      if(arr.length>1) deck.push(arr[arr.length-1]);
    }
  }
  deck.push(...uniques.slice(0,2));
  if(world) deck.push(world);
  if(artifact) deck.push(artifact);
  const wanted = 35 - deck.length;
  deck.push(...spells.slice(0, Math.max(0, wanted)));

  return deck;
}

// Гипотетический кандидат — NFT-обоснование по запросу автора: Ancient (incarnation)
// + Candle (draw_attack), два "дорогих" тега сразу, отсюда полная cost5-формула
// (HP=cost, ATK=cost+1, без урезки — решение прошлого шага) даёт 5/6.
const CANDIDATE_5_6 = {
  t_test_szg5: {
    name: "TEST SZARG5", cost:5, hp:5, atk:6, art:"🦈", img:"434.png", f:"tea",
    tags: ["incarnation:4","draw_attack:1","gtype:szg"], ab: "Squad +1 maxHP."
  }
};
const CANDIDATE_5_5 = {
  t_test_szg5: { ...CANDIDATE_5_6.t_test_szg5, atk:5 }
};
// D — рычаг не ATK, а HP: та же атака 6, но тело хрупче (4 вместо 5) — проверяем,
// действительно ли ATK почти не влияет на WWP (см. B vs C), а решает именно HP/выживаемость.
const CANDIDATE_4_6 = {
  t_test_szg5: { ...CANDIDATE_5_6.t_test_szg5, hp:4, atk:6 }
};

const VARIANTS = [
  { name: 'A: без cost5 Szarg (контроль)', inject: null },
  { name: 'B: + cost5 Szarg 5/6 (incarn+draw_attack)', inject: CANDIDATE_5_6 },
  { name: 'C: + тот же кандидат, но 5/5', inject: CANDIDATE_5_5 },
  { name: 'D: + тот же кандидат, но 4/6 (урезано HP, не ATK)', inject: CANDIDATE_4_6 },
];

const n = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '1500', 10);
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? process.argv[jsonIdx+1] : null;
const allResults = {};

for(const variant of VARIANTS){
  const DEFS = loadDefs();
  if(variant.inject) Object.assign(DEFS, variant.inject);

  const teaDeck = buildDeckFor('tea', DEFS);
  const jeetDeck = buildDeckFor('jeet', DEFS);

  console.error(`\n### ${variant.name} ###`);
  console.error(`Tea deck: ${teaDeck.length} cards${variant.inject ? ' (incl. TEST SZARG5)' : ''} | Jeet deck: ${jeetDeck.length} cards`);
  console.error(`Running ${n} games...`);

  const t0 = Date.now();
  const agg = runBatch(n, {
    seedFirst: true,
    deckConfig: 'rush',
    rushDecks: { tea: teaDeck, jeet: jeetDeck },
    defsPatch: variant.inject || undefined,
  });
  const secs = ((Date.now()-t0)/1000).toFixed(1);

  console.log(`\n═══ ${variant.name} (${agg.valid}/${agg.games}, ${secs}s) ═══`);
  console.log(`Winrate: TEA ${agg.winrate.tea}% / JEET ${agg.winrate.jeet}%`);
  console.log(`Turns: median ${agg.turns.median}, mean ${agg.turns.mean}, range ${agg.turns.min}-${agg.turns.max}  fatigue ${agg.fatigueRate}%`);
  console.log(`Base dmg by gtype:`, agg.gtypeBaseDmg);

  // szg cards WWP (tea side), including the test card if present
  const szgKeys = Object.keys(DEFS).filter(k => DEFS[k].f==='tea' && gtypeOf(DEFS[k])==='szg');
  console.log(`Tea Szarg WWP:`);
  szgKeys
    .filter(k => agg.cardStats[k] && agg.cardStats[k].played >= 10)
    .map(k => ({ key:k, cost:DEFS[k].cost, hp:DEFS[k].hp, atk:DEFS[k].atk,
      played:agg.cardStats[k].played, wr:+(agg.cardStats[k].wins/agg.cardStats[k].played*100).toFixed(1) }))
    .sort((a,b)=>a.cost-b.cost)
    .forEach(r => console.log(`  cost${r.cost} ${r.hp}/${r.atk}  ${r.wr}%  ${r.key===  't_test_szg5' ? '<-- TEST CARD' : ''}  (${r.played} games)`));

  allResults[variant.name] = agg;
}

if(jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(allResults, null, 2));
