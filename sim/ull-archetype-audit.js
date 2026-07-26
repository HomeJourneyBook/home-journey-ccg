#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// ПОЛНЫЙ АРХЕТИПНЫЙ АУДИТ — в отличие от mch-szg-audit.js (который
// специально брал ТОЛЬКО mch+szg целиком + куцый фон остальных), тут
// колода включает ВСЕ 6 архетипов целиком (53 рядовых/фракцию) + все
// уники + world/artifact + по 1 копии каждого спелла — задача не
// "максимум сэмплов на двух картах", а "ровный census по всей коллекции",
// чтобы сравнить, как Dreegan/Xuiqtr (танки) и Umbasir/Orbiton (утилити,
// почти без ATK) держатся относительно уже выверенных Szarg/Mechird.
//
// Дека получается большая (~85-90 карт/фракция вместо обычных 35) —
// это НЕ реалистичный размер деки для игры, только для census-теста;
// нужно больше партий (N), чтобы на каждую карту набрался сэмпл (примерно
// в 2.5 раза больше, чем в mch-szg-audit.js, деки же в 2.5 раза крупнее).
//
// Использование: node sim/full-archetype-audit.js [games=3000] [--json out.json]
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
      if(seenSpell.has(def.name)) continue; // 1 копия на спелл (Tea/Jeet зеркала — разные ключи, ок)
      seenSpell.add(def.name);
      deck.push(key);
      continue;
    }
    deck.push(key); // creature (rank-and-file OR unique), world, artifact — все идут целиком
  }
  return deck;
}

const n = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '3000', 10);
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? process.argv[jsonIdx+1] : null;

const DEFS = loadDefs();
const teaDeck = buildFullDeck('tea', DEFS);
const jeetDeck = buildFullDeck('jeet', DEFS);

console.error(`Tea deck: ${teaDeck.length} cards | Jeet deck: ${jeetDeck.length} cards`);
console.error(`Running ${n} AI-vs-AI games (full-collection census decks)...`);

const t0 = Date.now();
const agg = runBatch(n, {
  seedFirst: true,
  deckConfig: 'rush',
  rushDecks: { tea: teaDeck, jeet: jeetDeck },
});
const secs = ((Date.now()-t0)/1000).toFixed(1);

console.log(`\n═══ RESULTS (${agg.valid}/${agg.games} valid games, ${secs}s) ═══`);
if(agg.errors) console.log(`⚠ errors: ${agg.errors}\n${agg.errorSamples.join('\n')}`);
if(agg.stalls) console.log(`⚠ stalled games: ${agg.stalls}`);
console.log(`Winrate: TEA ${agg.winrate.tea}%  /  JEET ${agg.winrate.jeet}%`);
console.log(`Turns: median ${agg.turns.median}, mean ${agg.turns.mean}, range ${agg.turns.min}-${agg.turns.max}`);
console.log(`Fatigue endings: ${agg.fatigueRate}%`);

const DEFS_SRC = fs.readFileSync(path.join(ROOT,'js/data.js'),'utf8');
const nameOf = key => { const m = DEFS_SRC.match(new RegExp(key+':\\s*\\{name:"([^"]+)"')); return m ? m[1] : key; };

// ── Агрегация по архетипу (среднее WWP всех карт архетипа + суммарный урон по базам) ──
const gtypeAgg = {}; // gt -> {playedSum, winsSum, cards:[{key,cost,hp,atk,wr,played}]}
for(const [key, def] of Object.entries(DEFS)){
  if(!(def.f==='tea' || def.f==='jeet') || def.neutral || def.spell || def.world || def.artifact) continue;
  const gt = def.unique ? 'unique' : (gtypeOf(def) || 'other');
  const s = agg.cardStats[key];
  if(!s || s.played < 15) continue;
  gtypeAgg[gt] = gtypeAgg[gt] || { playedSum:0, winsSum:0, cards:[] };
  gtypeAgg[gt].playedSum += s.played;
  gtypeAgg[gt].winsSum += s.wins;
  gtypeAgg[gt].cards.push({ key, name:nameOf(key), f:def.f, cost:def.cost, hp:def.hp, atk:def.atk,
    played:s.played, wr:+(s.wins/s.played*100).toFixed(1) });
}

console.log(`\nBase damage by gtype:`, agg.gtypeBaseDmg);
const totalDmg = Object.values(agg.gtypeBaseDmg).reduce((a,b)=>a+b,0);

console.log(`\n═══ Archetype-level summary (WWP усреднён по всем картам архетипа с ≥15 играми; доля урона по базам от общего) ═══`);
Object.entries(gtypeAgg)
  .map(([gt,g]) => ({ gt, avgWr:+(g.winsSum/g.playedSum*100).toFixed(1), nCards:g.cards.length,
    dmgShare: totalDmg ? +((agg.gtypeBaseDmg[gt]||0)/totalDmg*100).toFixed(1) : 0 }))
  .sort((a,b)=>b.avgWr-a.avgWr)
  .forEach(r => console.log(`  ${r.gt.padEnd(8)} avgWWP ${r.avgWr}%  (${r.nCards} карт, порог ≥15 игр)   dmg share ${r.dmgShare}%`));

console.log(`\n═══ Per-card detail (только вне здорового коридора 40-60%, отсортировано по gtype) ═══`);
Object.entries(gtypeAgg).forEach(([gt,g]) => {
  const outliers = g.cards.filter(c => c.wr < 40 || c.wr > 60).sort((a,b)=>a.cost-b.cost);
  if(!outliers.length) return;
  console.log(`  [${gt}]`);
  outliers.forEach(c => console.log(`    ${c.f} cost${c.cost} ${c.hp}/${c.atk}  ${c.wr}%  ${c.name}  (${c.played} games)`));
});

if(jsonOut){ fs.writeFileSync(jsonOut, JSON.stringify({ agg, gtypeAgg, teaDeck, jeetDeck }, null, 2)); console.error(`\nFull metrics → ${jsonOut}`); }
