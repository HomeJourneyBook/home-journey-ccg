#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// ТОЧЕЧНЫЙ АУДИТ Mechird ↔ Szarg — генералистские кастомные деки вместо
// текущей печатной Classic (та заточена под тему burn/fear и даёт мало
// сэмплов на Mechird — cost2-5, не все карты попадают в стартер).
//
// Стратегия: строим "widescreen" 35-карточную Rush-деку на фракцию —
// ВСЕ карты gtype:mch И ВСЕ карты gtype:szg (прямые соперники по роли
// "атакер архетипа" — максимум сэмплов на обоих), плюс ровный разбавочный
// фон из остальных архетипов/уников/спеллов, чтобы колода не была
// моно-архетипной нонсенс-подборкой, а давала осмысленный "полноценная
// колода, где оба атакера хорошо представлены" сигнал.
//
// Использование:
//   node sim/mch-szg-audit.js [games=1000] [--json out.json]
// ══════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { runBatch } = require('./headless.js');

const ROOT = path.join(__dirname, '..');

// Лёгкий sandbox — грузим ТОЛЬКО data.js, нужен просто DEFS для сборки списков.
function loadDefs(){
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), sandbox, { filename:'js/data.js' });
  // top-level `const` in vm.runInContext lives in the context's lexical scope,
  // not as a sandbox object property — fetch it with a second eval in the same context.
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
  // Ядро теста — оба атакера архетипа целиком (максимум сэмплов на каждой карте).
  deck.push(...(keysByGtype.mch || []));
  deck.push(...(keysByGtype.szg || []));
  // Разбавочный фон — по 2 карты из каждого из оставшихся 4 архетипов (ровный срез
  // по costам: сортируем по cost и берём крайние + средние, не первые N подряд).
  for(const gt of ['orb','drg','umb','xui']){
    const arr = (keysByGtype[gt] || []).slice().sort((a,b)=>DEFS[a].cost-DEFS[b].cost);
    if(arr.length){
      deck.push(arr[0]); // самый дешёвый
      if(arr.length>1) deck.push(arr[arr.length-1]); // самый дорогой
    }
  }
  // 2 уника, world, artifact
  deck.push(...uniques.slice(0,2));
  if(world) deck.push(world);
  if(artifact) deck.push(artifact);
  // Спеллы добиваем до 35 — ровный набор (draw/removal/heal/buff), без дублей.
  const wanted = 35 - deck.length;
  const pickedSpells = spells.slice(0, Math.max(0, wanted));
  deck.push(...pickedSpells);

  return { deck, meta: { mch: (keysByGtype.mch||[]).length, szg: (keysByGtype.szg||[]).length, total: deck.length } };
}

const n = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '1000', 10);
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? process.argv[jsonIdx+1] : null;

const DEFS = loadDefs();
const teaBuild = buildDeckFor('tea', DEFS);
const jeetBuild = buildDeckFor('jeet', DEFS);

console.error(`Tea deck: ${teaBuild.meta.total} cards (mch=${teaBuild.meta.mch}, szg=${teaBuild.meta.szg})`);
console.error(`Jeet deck: ${jeetBuild.meta.total} cards (mch=${jeetBuild.meta.mch}, szg=${jeetBuild.meta.szg})`);
console.error(`Running ${n} AI-vs-AI games (custom widescreen decks, alternating first player)...`);

const t0 = Date.now();
const agg = runBatch(n, {
  seedFirst: true,
  deckConfig: 'rush',
  rushDecks: { tea: teaBuild.deck, jeet: jeetBuild.deck },
});
const secs = ((Date.now()-t0)/1000).toFixed(1);

console.log(`\n═══ RESULTS (${agg.valid}/${agg.games} valid games, ${secs}s) ═══`);
if(agg.errors) console.log(`⚠ errors: ${agg.errors}\n${agg.errorSamples.join('\n')}`);
if(agg.stalls) console.log(`⚠ stalled games: ${agg.stalls}`);
console.log(`Winrate: TEA ${agg.winrate.tea}%  /  JEET ${agg.winrate.jeet}%`);
console.log(`First-player winrate: ${agg.firstPlayerWinrate}%`);
console.log(`Turns: median ${agg.turns.median}, mean ${agg.turns.mean}, range ${agg.turns.min}-${agg.turns.max}`);
console.log(`Fatigue endings: ${agg.fatigueRate}%`);
console.log(`\nBase damage by gtype:`, agg.gtypeBaseDmg);

const DEFS_SRC = fs.readFileSync(path.join(ROOT,'js/data.js'),'utf8');
const nameOf = key => { const m = DEFS_SRC.match(new RegExp(key+':\\s*\\{name:"([^"]+)"')); return m ? m[1] : key; };

// Фильтр специально на mch/szg карты — это и есть предмет теста.
const focusKeys = Object.keys(DEFS).filter(k => {
  const gt = gtypeOf(DEFS[k]);
  return gt === 'mch' || gt === 'szg';
});
console.log(`\nMechird/Szarg winrate-when-played (фокус теста):`);
focusKeys
  .filter(k => agg.cardStats[k] && agg.cardStats[k].played >= 10)
  .map(k => ({ key:k, name:nameOf(k), cost:DEFS[k].cost, atk:DEFS[k].atk, hp:DEFS[k].hp,
    gt:gtypeOf(DEFS[k]), played:agg.cardStats[k].played,
    wr:+(agg.cardStats[k].wins/agg.cardStats[k].played*100).toFixed(1) }))
  .sort((a,b)=> a.gt===b.gt ? a.cost-b.cost : a.gt.localeCompare(b.gt))
  .forEach(r => console.log(`  [${r.gt}] cost${r.cost} ${r.hp}/${r.atk}  ${r.wr}%  ${r.name}  (${r.played} games)`));

if(jsonOut){ fs.writeFileSync(jsonOut, JSON.stringify({ agg, teaDeck: teaBuild.deck, jeetDeck: jeetBuild.deck }, null, 2)); console.error(`\nFull metrics → ${jsonOut}`); }
