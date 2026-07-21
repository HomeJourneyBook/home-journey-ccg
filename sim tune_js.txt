#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// A/B-ТЮНЕР ВЕСОВ ИИ (2026-07-21) — hill-climbing поверх sim/headless.js.
//
// Идея: AI_WEIGHTS (js/ai.js) — готовая тюнинг-панель. Вместо ручной
// правки числа → вечер логов → выводы, гоняем два конфига весов друг
// против друга сотнями партий и оставляем побеждающий.
//
// Схема честного замера: кандидат-патч применяется к ОДНОЙ стороне
// (челленджер), базовые веса — к другой; каждая пара конфигов играет
// games партий с чередованием фракций И первого игрока (иначе замер
// меряет силу фракции/первого хода, а не весов). Патч "лучше", если
// челленджер выигрывает статистически заметно чаще базы.
//
// Использование:
//   node sim/tune.js                     — прогон дефолтного набора кандидатов
//   node sim/tune.js --games 300         — партий на кандидата (default 200)
//   node sim/tune.js --patch '{"tagBonus":{"heal":0.8}}'
//                                        — проверить один свой патч
//
// Найденный сильный патч НЕ применяется автоматически — он печатается,
// решение о переносе значений в js/ai.js остаётся за автором (и требует
// бампа AI_VERSION по принятой конвенции).
// ══════════════════════════════════════════════════════════════════
'use strict';
const { runGame } = require('./headless');

// Дефолтные кандидаты — по одному осмысленному рычагу за раз (менять по
// одной оси — иначе непонятно, что именно сработало). Стартовый набор
// нацелен на находки baseline-прогона 2026-07-21 (Tea недобирает: ИИ,
// возможно, недооценивает heal/сустейн-паттерны, которыми Tea и играет).
const DEFAULT_CANDIDATES = [
  { label:'heal-weight up',      patch:{ tagBonus:{ heal:0.8 } } },
  { label:'provoke-weight up',   patch:{ tagBonus:{ provoke:0.7 } } },
  { label:'atk-ratio down',      patch:{ atkVsHpRatio:1.1 } },
  { label:'atk-ratio up',        patch:{ atkVsHpRatio:1.5 } },
  { label:'squad-complete up',   patch:{ squadCompleteBonus:1.5 } },
  { label:'draw-weight up',      patch:{ tagBonus:{ draw:0.9, draw_attack:0.8 } } },
];

function evalCandidate(patch, games){
  let challengerWins = 0, valid = 0;
  for(let i = 0; i < games; i++){
    // Ротация: челленджер играет за tea/jeet поровну, первый ход тоже чередуется
    // независимо — 4 комбинации по кругу.
    const challengerSide = i % 2 === 0 ? 'tea' : 'jeet';
    const firstFaction = (i >> 1) % 2 === 0 ? 'tea' : 'jeet';
    const weightsPatch = { [challengerSide]: patch, [challengerSide==='tea'?'jeet':'tea']: null };
    const r = runGame({ firstFaction, weightsPatch });
    if(r.error || r.stalled || !r.winner) continue;
    valid++;
    if(r.winner === challengerSide) challengerWins++;
  }
  return { winrate: valid ? +(challengerWins/valid*100).toFixed(1) : 0, valid };
}

if(require.main === module){
  const args = process.argv.slice(2);
  const gi = args.indexOf('--games');
  const games = gi >= 0 ? parseInt(args[gi+1],10) : 200;
  const pi = args.indexOf('--patch');
  const custom = pi >= 0 ? [{ label:'custom', patch: JSON.parse(args[pi+1]) }] : null;

  const candidates = custom || DEFAULT_CANDIDATES;
  console.log(`Evaluating ${candidates.length} candidate patch(es), ${games} games each...`);
  console.log(`(50% = не отличим от базы; >53-54% на 200+ играх — сигнал, перепроверь на 500+)`);
  for(const c of candidates){
    const t0 = Date.now();
    const res = evalCandidate(c.patch, games);
    console.log(`  ${c.label.padEnd(22)} → ${res.winrate}% за челленджера  (${res.valid} valid, ${((Date.now()-t0)/1000).toFixed(0)}s)`);
  }
}

module.exports = { evalCandidate };
