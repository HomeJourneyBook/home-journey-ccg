#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// Xuiqtr — кандидаты на урезку: HP cost+1 (было cost+2) и/или ATK
// исключение cost≥4 (было cost≥5). Тестируется в ДВУХ контекстах:
//   1. full-collection census (где поймали 56.1% avgWWP)
//   2. настоящая Classic-дека (Xuiqtr — один из 3 фаворитов Jeet) —
//      проверяем гипотезу "перегрев Xuiqtr = причина Jeet ~57% на Classic"
//
// Использование: node sim/xuiqtr-audit.js <A|B|C|D> [gamesFull=1200] [gamesClassic=3000] [--json out.json]
//   A — baseline   B — HP−1   C — ATK−1 на cost4   D — оба
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

function buildFullDeck(f, DEFS){
  const deck = []; const seenSpell = new Set();
  for(const [key, def] of Object.entries(DEFS)){
    if(def.f !== f || def.neutral) continue;
    if(def.spell){ if(seenSpell.has(def.name)) continue; seenSpell.add(def.name); deck.push(key); continue; }
    deck.push(key);
  }
  return deck;
}

function hpForXui(cost, hpCut){ return cost + (hpCut ? 1 : 2); }
function atkForXui(cost, atkCut){
  if(atkCut) return cost>=4 ? cost-2 : cost-1;
  return cost>=5 ? cost-2 : cost-1;
}
function buildXuiPatch(DEFS, hpCut, atkCut){
  const patch = {};
  for(const [key, def] of Object.entries(DEFS)){
    if(gtypeOf(def) !== 'xui') continue;
    patch[key] = { ...def, hp: hpForXui(def.cost, hpCut), atk: atkForXui(def.cost, atkCut) };
  }
  return patch;
}

const VARIANTS = {
  A: { name:'A: baseline', hpCut:false, atkCut:false },
  B: { name:'B: HP cost+1 (было +2)', hpCut:true, atkCut:false },
  C: { name:'C: ATK−1 на cost4 (искл. cost≥4 вместо cost≥5)', hpCut:false, atkCut:true },
  D: { name:'D: оба вместе', hpCut:true, atkCut:true },
};

const which = (process.argv[2] || 'A').toUpperCase();
const variant = VARIANTS[which];
if(!variant){ console.error('variant must be A|B|C|D'); process.exit(1); }
const nFull = parseInt(process.argv[3] || '1200', 10);
const nClassic = parseInt(process.argv[4] || '3000', 10);
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? process.argv[jsonIdx+1] : null;

const DEFS = loadDefs();
const defsPatch = (variant.hpCut || variant.atkCut) ? buildXuiPatch(DEFS, variant.hpCut, variant.atkCut) : null;
if(defsPatch) Object.assign(DEFS, defsPatch);

const DEFS_SRC = fs.readFileSync(path.join(ROOT,'js/data.js'),'utf8');
const nameOf = key => { const m = DEFS_SRC.match(new RegExp(key+':\\s*\\{name:"([^"]+)"')); return m ? m[1] : key; };

console.log(`\n╔══ ${variant.name} ══╗`);

// ── 1. Full-collection census ──
{
  const teaDeck = buildFullDeck('tea', DEFS);
  const jeetDeck = buildFullDeck('jeet', DEFS);
  console.error(`\n[full-census] running ${nFull} games...`);
  const t0 = Date.now();
  const agg = runBatch(nFull, {
    seedFirst: true, deckConfig: 'rush',
    rushDecks: { tea: teaDeck, jeet: jeetDeck },
    defsPatch: defsPatch || undefined,
  });
  const secs = ((Date.now()-t0)/1000).toFixed(1);
  console.log(`\n[FULL-CENSUS] (${agg.valid}/${agg.games}, ${secs}s) Winrate TEA ${agg.winrate.tea}% / JEET ${agg.winrate.jeet}%`);
  const totalDmg = Object.values(agg.gtypeBaseDmg).reduce((a,b)=>a+b,0);
  const xuiDmg = agg.gtypeBaseDmg.xui || 0;
  console.log(`Xuiqtr dmg share: ${totalDmg?(xuiDmg/totalDmg*100).toFixed(1):0}%`);
  const xuiKeys = Object.keys(DEFS).filter(k => gtypeOf(DEFS[k]) === 'xui');
  let playedSum=0, winsSum=0;
  const rows = xuiKeys.filter(k => agg.cardStats[k] && agg.cardStats[k].played >= 15)
    .map(k => { const s=agg.cardStats[k]; playedSum+=s.played; winsSum+=s.wins;
      return { key:k, f:DEFS[k].f, cost:DEFS[k].cost, hp:DEFS[k].hp, atk:DEFS[k].atk,
        played:s.played, wr:+(s.wins/s.played*100).toFixed(1) }; })
    .sort((a,b)=>a.cost-b.cost);
  rows.forEach(r => console.log(`  ${r.f} cost${r.cost} ${r.hp}/${r.atk}  ${r.wr}%  ${nameOf(r.key)}  (${r.played} games)`));
  console.log(`Xuiqtr avgWWP (pooled): ${playedSum?(winsSum/playedSum*100).toFixed(1):0}%`);
}

// ── 2. Real Classic deck ──
{
  console.error(`\n[classic] running ${nClassic} games...`);
  const t0 = Date.now();
  const agg = runBatch(nClassic, {
    seedFirst: true, deckConfig: 'classic',
    defsPatch: defsPatch || undefined,
  });
  const secs = ((Date.now()-t0)/1000).toFixed(1);
  console.log(`\n[CLASSIC] (${agg.valid}/${agg.games}, ${secs}s) Winrate TEA ${agg.winrate.tea}% / JEET ${agg.winrate.jeet}%   (target 45-55)`);
  console.log(`Turns: median ${agg.turns.median}, fatigue ${agg.fatigueRate}%`);
  const xuiKeys = Object.keys(DEFS).filter(k => gtypeOf(DEFS[k]) === 'xui');
  xuiKeys.filter(k => agg.cardStats[k] && agg.cardStats[k].played >= 15)
    .map(k => { const s=agg.cardStats[k];
      return { key:k, f:DEFS[k].f, cost:DEFS[k].cost, hp:DEFS[k].hp, atk:DEFS[k].atk,
        played:s.played, wr:+(s.wins/s.played*100).toFixed(1) }; })
    .sort((a,b)=>a.cost-b.cost)
    .forEach(r => console.log(`  ${r.f} cost${r.cost} ${r.hp}/${r.atk}  ${r.wr}%  ${nameOf(r.key)}  (${r.played} games)`));

  if(jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ variant: variant.name }, null, 2));
}
