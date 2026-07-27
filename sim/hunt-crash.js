#!/usr/bin/env node
// Разовый охотник за багом (2026-07-27, по прямому запросу автора — после серии
// необъяснимых "вылетов на лендинг" в хотсите/Раше со случайными тестовыми колодами).
// Строит МНОГО случайных Rush-колод (упор на все новые/недавно тронутые теги этой
// сессии: frost, foxy, death_armor, death_bolt, remember, rage, vampiric, incarnation,
// enter_lose, enter_draw, vanguard, shield, ward, intercept, untamed) и гоняет их через
// headless.js runGame() — если где-то есть необработанное исключение, оно всплывёт тут
// сразу в stdout/stderr, а не молча "унесёт" браузер на лендинг без единой строчки в
// консоли.
'use strict';
const path = require('path');
const { runGame } = require(path.join(__dirname, 'headless.js'));

// Грузим DEFS напрямую (тем же способом, что уже использовался в этой сессии для
// анализа nft-data) — просто читаем js/data.js и добавляем module.exports на лету.
const fs = require('fs');
const dataSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
const vm = require('vm');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(dataSrc + '\nthis.DEFS = DEFS;', sandbox);
const DEFS = sandbox.DEFS;

const PRIORITY_TAGS = ['frost','foxy','death_armor','death_bolt','remember','rage',
  'vampiric','incarnation','enter_lose','enter_draw','vanguard','shield','ward',
  'intercept','untamed','draw_attack'];

function hasAnyPriorityTag(d){
  if(!d.tags) return false;
  return d.tags.some(t=>PRIORITY_TAGS.some(p=>t===p||t.startsWith(p+':')));
}

function buildRandomDeck(faction, size){
  const pool = Object.entries(DEFS).filter(([k,d]) => d.f===faction && !d.unique);
  const priority = pool.filter(([k,d])=>hasAnyPriorityTag(d));
  const rest = pool.filter(([k,d])=>!hasAnyPriorityTag(d));
  const deck = [];
  // Гарантируем, что каждая приоритетная карта попадёт хотя бы раз (если влезает).
  for(const [k] of priority){ if(deck.length<size) deck.push(k); }
  // Добиваем случайными из общего пула (с повторами — как это допускает
  // customList.slice() в newPlayer(), никакой уникальности не требуется).
  while(deck.length<size){
    const [k] = rest[Math.floor(Math.random()*rest.length)] || pool[Math.floor(Math.random()*pool.length)];
    deck.push(k);
  }
  // Перемешиваем, чтобы приоритетные карты не всегда были в начале руки одинаково.
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck.slice(0,size);
}

const N_GAMES = parseInt(process.argv[2]||'500',10);
let crashed = 0;
let completed = 0;
const errors = [];

for(let i=0;i<N_GAMES;i++){
  const rushDecks = {
    tea: buildRandomDeck('tea', 35),
    jeet: buildRandomDeck('jeet', 35),
  };
  const firstFaction = Math.random()<0.5 ? 'tea':'jeet';
  try{
    runGame({ deckConfig:'rush', rushDecks, firstFaction });
    completed++;
  }catch(e){
    crashed++;
    errors.push({ game:i, message:e.message, stack:e.stack, rushDecks });
    console.error(`\n❌ CRASH on game ${i}:`, e.message);
    console.error(e.stack);
    console.error('Decks that triggered it:', JSON.stringify(rushDecks));
  }
}

console.log(`\n=== Done: ${completed}/${N_GAMES} completed, ${crashed} crashed ===`);
if(errors.length>0){
  fs.writeFileSync(path.join(__dirname, 'crash-report.json'), JSON.stringify(errors,null,2));
  console.log('Full crash report written to sim/crash-report.json');
  process.exit(1);
}
