#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// HEADLESS SELF-PLAY SIMULATOR — AI vs AI без браузера (2026-07-21).
//
// Зачем: заменяет ручной цикл "сыграл → сохранил battle_log → отдал на
// разбор" (7-8 логов за вечер, выборка вечно однобока по фракциям — см.
// AI BALANCE NOTES) на тысячи партий за минуты с автоматическим сбором
// метрик. Ничего не меняет в игровом коде: грузит НАСТОЯЩИЕ js/data.js,
// deck.js, state.js, abilities.js, game.js, ai.js в vm-контекст и
// подставляет 7 заглушек вместо UI (render/playSfx/showWin и т.д. — см.
// makeSandbox() ниже; список получен статическим анализом, это ВСЕ
// внешние символы, которые движок+ИИ зовут из ui.js/render.js).
//
// Использование:
//   node sim/headless.js [games=500] [--json out.json] [--seed-first]
//     games        — сколько партий сыграть (default 500)
//     --json FILE  — сохранить полные метрики в JSON
//     --seed-first — чередовать первого игрока строго 50/50
//                    (default: случайный бросок, как в игре)
//
// Метрики на выходе:
//   • винрейт фракций (цель: коридор 45-55%)
//   • распределение длин партий (медиана/среднее, доля фатиг-концовок)
//   • per-card "winrate when played" — % побед владельца в партиях, где
//     карта была разыграна хотя бы раз (метрика HSReplay/untapped.gg;
//     на 500+ партиях карты стабильно >55% или <45% — первые кандидаты
//     на правку)
//   • урон по базам в разрезе gtype-архетипов (та метрика, что до сих
//     пор считалась руками по логам — см. AI BALANCE NOTES)
//
// A/B-тюнинг весов ИИ: см. соседний sim/tune.js — гоняет два конфига
// AI_WEIGHTS друг против друга через этот же модуль (экспорт runGame).
// ══════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ENGINE_FILES = ['js/data.js','js/deck.js','js/state.js','js/abilities.js','js/game.js','js/ai.js'];

// ── DOM-заглушки ────────────────────────────────────────────────────
// Один вечный stub-элемент на любой запрос: движок пишет в innerHTML/
// classList и т.п. — всё уходит в никуда, но ни один вызов не падает.
function makeStubEl(){
  const el = {
    innerHTML:'', textContent:'', value:'', scrollTop:0, scrollHeight:0,
    style:{ display:'', setProperty(){} },
    dataset:{}, children:[], disabled:false, checked:false,
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    appendChild(){}, removeChild(){}, remove(){}, prepend(){},
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    addEventListener(){}, removeEventListener(){},
    focus(){}, blur(){}, click(){},
    closest(){ return null; },
    getBoundingClientRect(){ return {left:0,top:0,width:0,height:0,right:0,bottom:0}; },
  };
  el.querySelector = () => makeStubEl();
  el.querySelectorAll = () => [];
  el.cloneNode = () => makeStubEl();
  return el;
}

function makeSandbox(){
  // Очередь вместо реального таймера: весь каскад setTimeout-цепочек ИИ
  // (aiPlayCardsStep → aiAttackStep → endTurn → runAiTurn …) выполняется
  // синхронно в pump() ниже — задержки AI_STEP_DELAY игнорируются, партия
  // проигрывается за миллисекунды.
  const queue = [];
  const els = {};
  const sandbox = {
    console, Math, JSON, Date, parseInt, parseFloat, isNaN, String, Number,
    Array, Object, RegExp, Promise, Map, Set,
    document: {
      getElementById(id){ return els[id] || (els[id] = makeStubEl()); },
      createElement(){ return makeStubEl(); },
      querySelector(){ return makeStubEl(); },
      querySelectorAll(){ return []; },
      body: makeStubEl(),
      addEventListener(){},
    },
    window: {},
    navigator: { userAgent:'headless-sim' },
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    performance: { now(){ return Date.now(); } },
    requestAnimationFrame(fn){ queue.push(fn); },
    setTimeout(fn){ queue.push(fn); return queue.length; },
    clearTimeout(){},
    // ── 7 UI-заглушек (полный список внешних зависимостей движка+ИИ) ──
    render(){},
    mkEl(){ return makeStubEl(); },
    playSfx(){},
    showPassScreen(_a,_b,cb){ if(typeof cb==='function') queue.push(cb); },
    updateMulliganBtn(){},
    // Анимация спелла ОБЯЗАНА дёрнуть onDone — в браузере эффект спелла
    // резолвится именно в этом колбэке; потерять его = зависший ход.
    playSpellRevealAnimation(_card, onDone){ if(typeof onDone==='function') queue.push(onDone); },
    showWin(w){ sandbox.__winner = w; },
    __winner: null,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for(const f of ENGINE_FILES){
    vm.runInContext(fs.readFileSync(path.join(ROOT, f),'utf8'), sandbox, {filename:f});
  }
  // Инструментация РОЗЫГРЫШЕЙ (для winrate-when-played): оборачиваем doPlay
  // поверх загруженного кода — function-декларации в vm-контексте мутабельны,
  // внутренние вызовы game.js подхватят обёртку через глобальный биндинг.
  vm.runInContext(`
    (function(){
      const orig = doPlay;
      globalThis.__plays = [];
      doPlay = function(card){
        if(card && card.key) __plays.push({ f: card.f, key: card.key, turn: G.turnNum });
        return orig.apply(this, arguments);
      };
    })();
  `, sandbox);
  return { sandbox, queue };
}

// ── Одна партия ─────────────────────────────────────────────────────
// opts: { firstFaction:'tea'|'jeet', maxSteps, weightsPatch:{tea:{},jeet:{}} }
// weightsPatch — для A/B-тюнинга (sim/tune.js): точечная подмена значений
// AI_WEIGHTS перед стартом. В спектаторе обе стороны используют один объект
// весов, поэтому per-faction патчи применяются перед КАЖДЫМ ходом (см. hook).
function runGame(opts = {}){
  const { sandbox, queue } = makeSandbox();
  const firstFaction = opts.firstFaction || (Math.random() < 0.5 ? 'tea' : 'jeet');

  vm.runInContext(`initState({ mode:'vsai', humanFaction:'tea', spectator:true,
    deckConfig:'classic', firstFaction:'${firstFaction}' });`, sandbox);

  // Муллиган пропускаем (политика "keep any hand" — простейшая; при желании
  // сюда легко добавить эвристику "нет тел cost≤3 → перемуллиганить").
  // Бонус второго игрока выдаём вручную — в браузере это делает
  // grantUnseenBonus() из ui.js в конце муллигана, который мы обходим.
  vm.runInContext(`
    G.phase = 'action';
    (function(){
      const second = G.secondFaction;
      G[second].hand.push(mkCard(second === 'tea' ? 't_sp4' : 'j_sp4'));
    })();
  `, sandbox);

  // Патч весов ИИ по фракциям (для тюнинга): перехватываем runAiTurn.
  if(opts.weightsPatch){
    sandbox.__weightsPatch = opts.weightsPatch;
    // Мердж патча — с одним уровнем вложенности: { tagBonus:{heal:0.8} } должен
    // поменять ОДИН ключ внутри tagBonus, а не заменить всю таблицу целиком.
    // Базовые значения снимаются один раз до первого патча (__baseWeights), и
    // перед каждым ходом веса восстанавливаются из базы + патч текущей стороны —
    // иначе в спектаторе патч одной фракции "протекал" бы в ходы другой (обе
    // стороны используют один и тот же объект AI_WEIGHTS).
    vm.runInContext(`
      (function(){
        const base = JSON.parse(JSON.stringify(AI_WEIGHTS));
        function apply(patch){
          for(const k of Object.keys(base)){
            if(base[k] && typeof base[k] === 'object') AI_WEIGHTS[k] = { ...base[k] };
            else AI_WEIGHTS[k] = base[k];
          }
          if(!patch) return;
          for(const [k,v] of Object.entries(patch)){
            if(v && typeof v === 'object' && AI_WEIGHTS[k] && typeof AI_WEIGHTS[k] === 'object')
              Object.assign(AI_WEIGHTS[k], v);
            else AI_WEIGHTS[k] = v;
          }
        }
        const orig = runAiTurn;
        runAiTurn = function(){
          apply(__weightsPatch[G.turn]);
          return orig.apply(this, arguments);
        };
      })();
    `, sandbox);
  }

  vm.runInContext('runAiTurn();', sandbox);

  // pump: крутим очередь до конца партии. Страховки от вечных партий и
  // зависших цепочек (если очередь опустела, а игра не кончилась — ИИ
  // где-то ждёт клика человека, фиксируем как 'stall' для разбора).
  // `let G` из state.js живёт в лексическом скоупе vm-контекста, НЕ как
  // свойство sandbox — читаем состояние только через runInContext.
  const readG = expr => vm.runInContext(expr, sandbox);
  const maxSteps = opts.maxSteps || 500000;
  let steps = 0, stalled = false;
  while(!sandbox.__winner && steps < maxSteps){
    if(readG('G.gameOver')) break;
    if(readG('G.turnNum') > 200){ stalled = true; break; } // патологически длинная партия
    const fn = queue.shift();
    if(!fn){
      // очередь пуста, игра не окончена: в спектаторе такого быть не должно —
      // пинаем ход ИИ ещё раз; если и после пинка пусто — реальный stall.
      vm.runInContext('if(!G.gameOver && typeof runAiTurn==="function") runAiTurn();', sandbox);
      if(!queue.length){ stalled = true; break; }
      continue;
    }
    try { fn(); } catch(e){ return { error: String(e && e.stack || e), firstFaction }; }
    steps++;
  }

  const G = readG('G');
  const winner = sandbox.__winner || (G.gameOver ? (G.tea.hp <= 0 ? 'jeet' : 'tea') : null);

  // Урон по базам в разрезе gtype + фатиг-детект — из тех же строк лога,
  // которые сейчас разбираются руками (см. AI BALANCE NOTES, формат
  // "X hits ... base for N dmg").
  const gtypeBaseDmg = {};
  let fatigue = false;
  const nameToDef = {};
  const DEFS = vm.runInContext('DEFS', sandbox);
  for(const k of Object.keys(DEFS)) nameToDef[DEFS[k].name] = DEFS[k];
  for(const entry of (G.logs || [])){
    const msg = entry.msg || '';
    if(msg.includes('wins by fatigue')) fatigue = true;
    const m = msg.match(/^(.+?) hits .*base for (\d+) dmg/);
    if(m && nameToDef[m[1]]){
      const def = nameToDef[m[1]];
      const gt = (def.tags || []).find(t => t.startsWith('gtype:'));
      const bucket = gt ? gt.slice(6) : (def.unique ? 'unique' : 'other');
      gtypeBaseDmg[bucket] = (gtypeBaseDmg[bucket] || 0) + parseInt(m[2], 10);
    }
  }

  return {
    winner, firstFaction, stalled, fatigue,
    turns: G.turnNum,
    plays: vm.runInContext('__plays', sandbox),
    gtypeBaseDmg,
  };
}

// ── Батч + агрегация ────────────────────────────────────────────────
function runBatch(n, opts = {}){
  const results = [];
  for(let i = 0; i < n; i++){
    const firstFaction = opts.seedFirst ? (i % 2 === 0 ? 'tea' : 'jeet') : undefined;
    const r = runGame({ ...opts, firstFaction: opts.firstFaction || firstFaction });
    results.push(r);
    if(!opts.quiet && (i + 1) % 100 === 0) process.stderr.write(`  ...${i + 1}/${n} games\n`);
  }
  return aggregate(results);
}

function aggregate(results){
  const ok = results.filter(r => !r.error && !r.stalled && r.winner);
  const errors = results.filter(r => r.error);
  const stalls = results.filter(r => r.stalled);
  const wins = { tea:0, jeet:0 };
  const turnsArr = [];
  let fatigueCount = 0;
  const firstPlayerWins = { first:0, second:0 };
  const gtypeDmg = {};
  // per-card: { key: { played: N партий, wins: N побед владельца } }
  const cardStats = {};

  for(const r of ok){
    wins[r.winner]++;
    turnsArr.push(r.turns);
    if(r.fatigue) fatigueCount++;
    if(r.winner === r.firstFaction) firstPlayerWins.first++; else firstPlayerWins.second++;
    for(const [gt, d] of Object.entries(r.gtypeBaseDmg)) gtypeDmg[gt] = (gtypeDmg[gt] || 0) + d;
    const playedByFaction = { tea:new Set(), jeet:new Set() };
    for(const p of r.plays) playedByFaction[p.f] && playedByFaction[p.f].add(p.key);
    for(const f of ['tea','jeet']){
      for(const key of playedByFaction[f]){
        cardStats[key] = cardStats[key] || { played:0, wins:0 };
        cardStats[key].played++;
        if(r.winner === f) cardStats[key].wins++;
      }
    }
  }

  turnsArr.sort((a,b)=>a-b);
  const median = turnsArr.length ? turnsArr[Math.floor(turnsArr.length/2)] : 0;
  const mean = turnsArr.length ? (turnsArr.reduce((a,b)=>a+b,0)/turnsArr.length) : 0;

  return {
    games: results.length, valid: ok.length,
    errors: errors.length, errorSamples: errors.slice(0,3).map(e=>e.error),
    stalls: stalls.length,
    winrate: {
      tea: ok.length ? +(wins.tea/ok.length*100).toFixed(1) : 0,
      jeet: ok.length ? +(wins.jeet/ok.length*100).toFixed(1) : 0,
    },
    firstPlayerWinrate: ok.length ? +(firstPlayerWins.first/ok.length*100).toFixed(1) : 0,
    turns: { median, mean: +mean.toFixed(1), min: turnsArr[0]||0, max: turnsArr[turnsArr.length-1]||0 },
    fatigueRate: ok.length ? +(fatigueCount/ok.length*100).toFixed(1) : 0,
    gtypeBaseDmg: gtypeDmg,
    cardStats,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────
if(require.main === module){
  const args = process.argv.slice(2);
  const n = parseInt(args.find(a => /^\d+$/.test(a)) || '500', 10);
  const jsonIdx = args.indexOf('--json');
  const jsonOut = jsonIdx >= 0 ? args[jsonIdx+1] : null;
  const seedFirst = args.includes('--seed-first');

  console.error(`Running ${n} AI-vs-AI games (classic decks, ${seedFirst?'alternating':'random'} first player)...`);
  const t0 = Date.now();
  const agg = runBatch(n, { seedFirst });
  const secs = ((Date.now()-t0)/1000).toFixed(1);

  console.log(`\n═══ RESULTS (${agg.valid}/${agg.games} valid games, ${secs}s) ═══`);
  if(agg.errors) console.log(`⚠ errors: ${agg.errors}\n${agg.errorSamples.join('\n')}`);
  if(agg.stalls) console.log(`⚠ stalled games: ${agg.stalls}`);
  console.log(`Winrate: TEA ${agg.winrate.tea}%  /  JEET ${agg.winrate.jeet}%   (target corridor: 45-55)`);
  console.log(`First-player winrate: ${agg.firstPlayerWinrate}%`);
  console.log(`Turns: median ${agg.turns.median}, mean ${agg.turns.mean}, range ${agg.turns.min}-${agg.turns.max}`);
  console.log(`Fatigue endings: ${agg.fatigueRate}%`);
  console.log(`\nBase damage by gtype:`, agg.gtypeBaseDmg);

  const DEFS_SRC = fs.readFileSync(path.join(ROOT,'js/data.js'),'utf8');
  const nameOf = key => { const m = DEFS_SRC.match(new RegExp(key+':\\s*\\{name:"([^"]+)"')); return m ? m[1] : key; };
  const rows = Object.entries(agg.cardStats)
    .filter(([,s]) => s.played >= Math.max(20, agg.valid*0.05))
    .map(([key,s]) => ({ key, name:nameOf(key), played:s.played, wr:+(s.wins/s.played*100).toFixed(1) }))
    .sort((a,b) => b.wr - a.wr);
  console.log(`\nPer-card winrate-when-played (played in ≥${Math.max(20, Math.round(agg.valid*0.05))} games):`);
  console.log(`  — TOP (кандидаты на нерф, если стабильно >55 на больших выборках):`);
  rows.slice(0,8).forEach(r => console.log(`    ${r.wr}%  ${r.name}  (${r.played} games)`));
  console.log(`  — BOTTOM (кандидаты на бафф/замену, если стабильно <45):`);
  rows.slice(-8).forEach(r => console.log(`    ${r.wr}%  ${r.name}  (${r.played} games)`));

  if(jsonOut){ fs.writeFileSync(jsonOut, JSON.stringify(agg, null, 2)); console.error(`\nFull metrics → ${jsonOut}`); }
}

module.exports = { runGame, runBatch, aggregate };
