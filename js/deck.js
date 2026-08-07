// Deck presets:
//  classic — печатная 1st-edition колода (с 2026-07-22, финальная версия): все 6 Врат в
//            игре на каждой фракции, асимметрия фаворитов сохранена (родные Врата мин.5,
//            остальные мин.3 — см. archetypeSizes) — 24 рядовых/фракцию (TRAVELER #128 и
//            #434, единственные cost6-карты, убраны из classic целиком — стабильно горячие
//            в sim, см. комментарий у archetypeSizes), кривая маны 1:5/2:5/3:9/4:4/5:1
//            идентична у обеих фракций, тематические теги сохранены (Tea burn:
//            #57/#10/#921/#972/#387, Jeet fear: #523/#859/#550/#579). + all 5 legendaries
//            (cost 4-8) + 16 спеллов (см. SPELL_COPIES) + 2 worlds + 2 artifacts = ровно 49
//            карт/фракция (98 + 2 общие Unseen-бонус карты второму игроку = 100 на печать).
//            (Держи в уме, что при следующей правке archetypeSizes/SPELL_COPIES/worlds/
//            arts этот комментарий и число тоже надо поправить, само по себе не сверяется.)
//  rush    — no fixed list: the human player assembles it themselves in the
//            deckbuilder (js/deckbuilder.js) by picking quantities out of the
//            SAME pool `classic` uses (see getRushPool() below). Deck size is now
//            EXACT, not just a floor (2026-07-24, по прямому запросу автора: "минимум
//            и максимум чтоб было 35 карт") — RUSH_MIN and RUSH_MAX were both 35;
//            dbSetQty() in deckbuilder.js caps additions at the total, and the
//            Next/Start button only enables at exactly RUSH_MIN. The AI's own deck in vsAI
//            Rush games is no longer a random sample of the pool (see buildAiRushDeck()
//            below, now unused by deckbuilder.js but left intact) — it plays the same
//            curated Classic deck as Classic mode (buildDeck(ai,'classic')).
//            2026-08-01 (по прямому запросу автора, вслед за Classic 35→40 в этой же
//            сессии — см. чат/архетипный разбор выше): RUSH_MIN/RUSH_MAX подняты 35→40 в
//            паре с Classic, чтобы дековый лимит не разъезжался между режимами (Rush и
//            так всегда следовал за Classic по пулу карт — getRushPool() читает ИЗ ТОГО ЖЕ
//            DEFS, что и Classic-срез, см. её комментарий ниже). Ничего в самой логике
//            dbSetQty()/_dbTotal()/UI-подписи "Selected: X / RUSH_MIN" трогать не пришлось —
//            всё уже читает константу, а не хардкод.
const RUSH_MIN = 40;
const RUSH_MAX = 40;

// Копии каждого спелла в Classic — раньше было плоских 3 копии на все 13 спеллов сразу
// (39/фракция), теперь подобрано по значимости для темы Врат (2026-07-18, по прямому
// запросу автора): 3 — дешёвые "чистая польза" (ess/draw/bounce) + сигнатурный
// mass-payoff темы (burn_all/fear_all); 2 — сильные, но не сигнатурные; 1 — узкие/
// ситуативные/дорогой топ-энд. Ключ — по каждой карте отдельно (Tea/Jeet спеллы НЕ
// идут в одном порядке между фракциями, см. комментарий у SPELL_COPIES ниже), не по
// индексу в массиве.
// 2026-07-21 (вечер, стартеры "3 Врат против 3 Врат", дека 35): спеллы ужаты 17→12 на
// фракцию — соотношение тел поднято до 60% (21/35), жанровая норма для существо-центричного
// вин-кондишена (см. аудит). Что резалось и почему:
//   Tea: GUST/EXPOSE/FORGET-ME-NOT → 0. EXPOSE (анти-провок) стал почти мёртвым техом —
//   у Jeet после разъезда архетипов провока на рядовых нет вообще (только ABYSSWALKER);
//   баунс/дискард — наименее сигнатурные слоты. Tea держит 4 слота прямого урона
//   (SPARK/JOURNEY×2/BREACH) — это ЕДИНСТВЕННЫЙ не-боевой урон фракции: Umbasir-болтеры
//   уехали к Jeet, THE BOOK один.
//   Jeet: MALICE/REVERSE/MINDROT → 0. Jeet-ремувал теперь частично живёт на телах
//   (6 Umbasir-болтеров + SHARD) — спеллов урона нужно меньше (HEX×2/RUPTURE); UNMASK
//   наоборот сохранён — единственный взлом Dreegan-стены Tea, критичный теперь матчап-тех.
//   SWARM CULL сохранён — Tea стала wide-фракцией (5 однодропов + сквады), Jeet без
//   масс-ответа в этом матчапе нельзя.
// 2026-07-22 (по прямому запросу автора, печатная classic-колода, 16 спеллов/фракцию):
// draw:1 / draw:2 / bounce_target — по 2 копии каждой (обе фракции); anti-provoke
// (EXPOSE/UNMASK) и ess_add (SCHEME/BLACK MAGIC) — исключены полностью в ЭТОЙ конкретной
// печатной classic-колоде (решение по вкусу/теме, не по механическому дублированию —
// см. поправку ниже); все остальные 10 пар — по 1 копии. См. полный разбор ролей в
// CLAUDE.md/сессионной записи.
// ИСПРАВЛЕНО (2026-07-24, автор поймал устаревшую причину в этом же комментарии): здесь
// раньше было написано, что ess_add исключён, потому что "эссенция уже выдаётся 2-му
// игроку отдельным Unseen-бонусом" — неверно вдвойне. Во-первых, бонус 2-го игрока
// (`grantUnseenBonus()`, ui.js) с 2026-07-23 — это НАСТОЯЩАЯ 6-я карта из собственной
// колоды игрока, а не эссенция и не карта UNSEEN. Во-вторых, сам UNSEEN (до 2026-07-23
// бывший механизмом бонуса) — это bounce-спелл, тоже не эссенция. Ни один из двух
// реальных вариантов бонуса никогда не выдавал эссенцию — старая формулировка путала
// сразу оба. exclusion SCHEME/BLACK MAGIC в classic остаётся в силе (это решение по теме/
// балансу колоды, см. выше), просто не по этой причине.
// 2026-07-24 (по прямому запросу автора — полная замена под новую 35-карточную сборку):
// раньше эта таблица держала квоты под старый 16-спелловый набор. Теперь набор сильно уже —
// только 10 спеллов на фракцию (2 добор + 2 хил + 2 эссенция + 6 прочих), всё остальное на 0.
const SPELL_COPIES = {
  // Tea
  t_sp1:0,  // ARCHIVE (combat-trick +1 ATK) — исключён
  t_sp2:1,  // VERDICT (bolt 999 — guaranteed kill) — добавлен 2026-07-24, больше атаки в арсенал
  t_sp3:0,  // SHEN'S CALL (revive full) — исключён (по прямому запросу автора: без воскрешения)
  t_sp4:2,  // SCHEME (ess_add:4) — эссенция ×2
  t_sp5:1,  // GUST (bounce any)
  t_sp6:0,  // RECKONING (aoe count) — исключён
  t_sp7:0,  // FORGET-ME-NOT (discard 2) — исключён (срезан ради лимита 35 карт)
  t_sp8:0,  // EXPOSE (anti-provoke tech) — исключён
  t_sp9:1,  // BREACH (bolt 5 + trample)
  t_sp10:1, // WILDFIRE (burn_all) — АОЕ-поджог, добавлен по прямому запросу автора
  t_sp11:0, // REKINDLE (untap) — исключён
  t_sp12:1, // BULWARK (combat-trick +1 Armor) — защитный бафф, добавлен 2026-07-24
  t_sp13:2, // INSIGHT (draw 2) — добор ×2
  t_sp14:1, // GLIMPSE (draw 1 + heal base 2)
  t_sp15:0, // SPARK (bolt 2) — исключён 2026-07-28 (по прямому запросу автора), заменён на SUNDER
  t_sp16:2, // SANCTUARY (heal all 2 + heal base 2) — хил ×2
  t_sp17:1, // JAB (bolt 1)
  t_sp18:1, // SCATTERSHOT (3 random spread)
  t_sp19:0, // MULTITUDE (scaling draw) — исключён
  t_sp20:1, // EXECUTE (bolt3 + draw on kill)
  t_sp21:1, // SUNDER (destroy world/artifact) — добавлен в Classic 2026-07-28 (по прямому запросу автора), заменил SPARK
  t_sp22:1, // CATACLYSM (destroy all enemies) — добавлен 2026-07-24, больше атаки в арсенал
  t_sp23:1, // CINDER (single-target burn) — точечный поджог, добавлен по прямому запросу автора
  t_sp24:1, // RENEWAL (discard hand, draw 3) — добавлен в Classic 2026-07-24, заменил TUBORG
  // Jeet
  j_sp1:2,  // JEET WAVE (draw 2) — добор ×2
  j_sp2:0,  // OBLIVION (untap) — исключён
  j_sp3:0,  // FORGETTING (revive full) — исключён (без воскрешения)
  j_sp4:2,  // BLACK MAGIC (ess_add:4) — эссенция ×2
  j_sp5:1,  // REVERSE (bounce any)
  j_sp6:0,  // SWARM CULL (aoe count) — исключён
  j_sp7:0,  // MINDROT (discard 2) — исключён (срезан ради лимита 35 карт)
  j_sp8:0,  // UNMASK (anti-provoke tech) — исключён
  j_sp9:1,  // RUPTURE (bolt 5 + trample)
  j_sp10:1, // NIGHTMARE (fear_all) — АОЕ-фир, добавлен по прямому запросу автора
  j_sp11:0, // FRENZY (combat-trick +1 ATK) — исключён
  j_sp12:1, // CARAPACE (combat-trick +1 Armor) — защитный бафф, добавлен 2026-07-24
  j_sp13:1, // DAMNATION (bolt 999 — guaranteed kill) — добавлен 2026-07-24, больше атаки в арсенал
  j_sp14:1, // OMEN (draw 1 + heal base 2)
  j_sp15:1, // MALICE (bolt 2) — добавлен 2026-07-24, больше атаки в арсенал
  j_sp16:2, // VIGIL (heal all 2 + heal base 2) — хил ×2
  j_sp17:1, // STING (bolt 1)
  j_sp18:1, // SHRAPNEL (3 random spread)
  j_sp19:0, // LEGION (scaling draw) — исключён
  j_sp20:1, // CULL (bolt3 + draw on kill)
  j_sp21:0, // BLIGHT (destroy world/artifact) — исключён
  j_sp22:1, // EXTINCTION (destroy all enemies) — добавлен 2026-07-24, больше атаки в арсенал
  j_sp23:1, // DREAD (single-target fear) — точечный фир, добавлен по прямому запросу автора
  j_sp24:1, // AMNESIA (discard hand, draw 3) — добавлен в Classic 2026-07-24, заменил ABYSSWALKER
};

const DECK_CONFIGS = {
  // 2026-07-18: было плоское groupSize:5 на все 6 архетипов сразу. Теперь у каждого
  // архетипа свой целевой размер НА ФРАКЦИЮ (тема Врат: Джит гуще берёт Umbasir/Mechird/
  // Xuiqtr, Чай — Szarg/Dreegan/Orbiton, ровно наоборот) — см. archetypeSizes и полный
  // разбор в CLAUDE.md "Рефактор классик-колоды под тему Врат". Итог: по 18 рядовых
  // существ на фракцию (полный симметричный расклад 4+4+4+2+2+2 против 2+2+2+4+4+4).
  classic: {},
};

function shuffleArr(d){
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}

// Builds the raw (unshuffled, no Unseen bonus card) card-key list for a given
// faction + config — shared by buildDeck() and getRushPool(). Kept separate so
// the Rush deckbuilder's pool is always exactly "whatever Classic currently
// contains", with zero duplicated card-list logic to keep in sync.
// 2026-07-25 — classic-ростер заменён на 35 карт из Rush-колоды автора (Tea) +
// Jeet-аналог (burn→fear). Просто два списка ключей, без доп. логики.
// 2026-07-26 (по прямому запросу автора, шлифовка свободных слотов Classic-деки —
// см. CLAUDE.md "Classic-дека: раунд шлифовки свободных слотов" за полную методологию
// и историю): 8 фикс-поджог рядовых/фракцию (было ошибочно записано "минимум 5" в чате,
// по факту уже 8 — трогать НЕЛЬЗЯ), мир/артефакт/тематический уник (Faeron/Seeker) —
// тоже фикс. Заменены 2 явных выброса на cost4 у Tea (оба Dreegan 8/2, WWP 55.5%/58.5%
// на N=3000-прогоне) на Orbiton/Mechird (диверсификация архетипа + меньше сырой силы) и
// 2 спелла на каждой фракции (MUSE/SCATTERSHOT у Tea, FRENZY/BLACK MAGIC у Jeet).
// ВАЖНЫЙ УРОК (round 2 сессии): попытка заменить ВТОРОЕ cost4-тело Tea (#388→Umbasir)
// СВЕРХ первой замены обрушила винрейт до 37.7/62.3 — Tea без обоих мясистых тел на
// cost4 не может устоять против fear-агра Jeet. Откачен обратно на Mechird (#495,
// 54.3% — тёплый, но не критично) вместо дальнейшего урезания тела. Аналогично ELIXIRS
// (замена RENEWAL) в одиночку просадила Tea на 6.5пп (untap почти мёртв без
// комбо-партнёра в этой деке) — RENEWAL оставлен, несмотря на то что сам по себе горячий
// (58.6%) — деке в целом лучше с ним, чем без. Итог: TEA 48.8% / JEET 51.2% на N=3000.
// 2026-07-28 (по прямому запросу автора): CLASSIC_TEA_DECK/CLASSIC_JEET_DECK ПОЛНОСТЬЮ
// синхронизированы с Rush-сборками, которые автор вручную докрутил в деккбилдере и
// прогнал через sim/headless.js (1000 партий, TEA 50.8% / JEET 49.2% — макро сбалансировано;
// см. чат-разбор per-card/per-gtype winrate-when-played на этот же билд). Раньше Classic и
// Rush-старт ИИ были РАЗНЫМИ списками (Classic — более старый "печатный" набор, см. историю
// правок выше) — теперь это один и тот же список, так что "играть именно этими сборками" в
// Classic и смотреть на них в Rush-деккбилдере — один и тот же контент. При следующей ручной
// правке в деккбилдере — не забыть синхронизировать оба списка ниже заново тем же способом
// (экспорт JSON из деккбилдера → развернуть qty в плоский массив → вставить сюда).
const CLASSIC_TEA_DECK = [
  't_w1','t_a1','t_faeron','t_ogniv',
  't_trvl18_w','t_trvl34_w','t_trvl14_w','t_trvl58_w','t_trvl42_w','t_trvl692_w', // t_trvl870_w→t_trvl18_w (mirror-фикс, см. выше); t_trvl890_w(szg cost2)→t_trvl34_w(szg cost3) — 2026-08-04, по прямому запросу автора, уровняли кривую Szarg с Jeet (2:1 3:1 5:1 на обеих фракциях теперь)
  't_trvl31_w','t_trvl921_w','t_trvl972_w','t_trvl495_w','t_trvl1034_w','t_trvl6_w',
  't_trvl250_w','t_trvl28_w','t_trvl26_w','t_trvl1015_w', // t_trvl39_w(xui cost2)→t_trvl26_w(xui cost3) — 2026-08-04, по прямому запросу автора, уровняли кривую Xuiqtr с Jeet (2:1 3:2 на обеих фракциях теперь); t_trvl533_w(drg, cost5→4 обратно)↔t_trvl1015_w(drg, cost4→5, пересчитан на hp10/atk2) — 2026-08-06, по прямому запросу автора: поменяли местами ещё раз, теперь #1015 (vanguard) занимает cost5-слот, #533 (untamed) вернулся на cost4 (см. data.js)
  // ── ЭКСПЕРИМЕНТ 35→40, раунд 2 (2026-08-01, кандидат для сравнительного прогона
  // sim/headless.js, см. чат — НЕ синхронизировано с Rush-деккбилдером, НЕ финальное
  // решение). Раунд 1 (см. git-history/чат) добавлял t_trvl607_w (Mechird cost5,
  // draw_attack+remember) — 71.2% WWP на N=3000, разогнал Tea до 55.7/44.3, вне коридора.
  // Убран по прямому запросу автора. Теперь ровно 4 тела (столько и нужно, чтобы у
  // Umbasir/Orbiton/Mechird стало по 3 — сквад-минимум) + 5-е — NABUNAGI (легендарка,
  // была не в Classic). Приоритет при выборе конкретной карты внутри архетипа — sustain-
  // теги (regen/vampiric/death_heal), по прямому запросу автора: Mechird и так
  // тематически "regen+vampiric" (см. CLAUDE.md, золотые путешественники), но до этого
  // раунда в Classic не было НИ ОДНОЙ vampiric и НИ ОДНОЙ regen карты в принципе (только
  // 1 death_heal на Mechird, у Tea в целом). Дважды принесло гарантированную выгоду: сам
  // сквад-минимум и заодно лечит эту дыру.
  't_trvl45_w',  // Umbasir cost2 (bolt:1, ваниль) — Umbasir 1→2, дешёвый filler
  't_trvl583_w', // Umbasir cost4 (bolt:1+regen+death_heal:4) — Umbasir 2→3, sustain-пик вместо снятого cost5 burn (#387, тоже был тёплый 59.9% WWP в раунде 1)
  't_trvl218_w', // Orbiton cost2 (heal:2) — Orbiton 2→3, уже в струю (Orbiton и так heal-архетип)
  't_trvl150_w', // Mechird cost1 (shot:1) — 2026-08-06, по прямому запросу автора: заменён t_trvl38_w (Mechird cost3, shot+vampiric) — кривая маны Tea была поджата на cost1 (всего 2 карты), cost3 был раздут (8 карт); Xuiqtr и Burn-карты (сигнатура фракции) намеренно не трогались как доноры
  't_nab',       // NABUNAGI (unique, bushido+armor:1, cost8) — 5-й слот, не было в Classic. ВНИМАНИЕ: у карты своя история балансировки (56-66% WWP на разных срезах статов до текущей atk2/hp8/armor:1) — эта версия последняя протестированная, но не факт что холодная именно в ЭТОЙ колоде, сверить по прогону.
  't_sp23','t_sp10','t_sp20','t_sp17',
  't_sp14','t_sp14','t_sp13','t_sp16','t_sp11','t_sp6','t_sp12','t_sp26','t_sp9','t_sp18','t_sp27', // t_sp22(CATACLYSM, aoe-снос поля)→t_sp9(BREACH, Bolt5+trample) — 2026-08-06, по прямому запросу автора: "игра сводится к тому, кто счистит поле и по новой" — убрали AOE-wipe, дали точечный тяжёлый Bolt5 вместо него; t_sp24(RENEWAL)→t_sp11(ELIXIRS) — 2026-08-06, по прямому запросу автора, ELIXIRS теперь активирует+чистит (см. data.js), был вообще не в Classic до этого
];

const CLASSIC_JEET_DECK = [
  'j_w1','j_a1','j_kezarion','j_terror', // j_seek(SEEKER)→j_kezarion(KEZARION) — 2026-08-06, по прямому запросу автора, новый уник (см. data.js); SEEKER сам переименован с ключа j_vard на j_seek в этот же день
  'j_trvl724_w','j_trvl740_w','j_trvl41_w','j_trvl27_w','j_trvl50_w','j_trvl1008_w', // j_trvl971_w(szg,был cost1→сейчас cost2)→j_trvl724_w(mch,cost1) — тот же mirror-фикс, что у Tea выше; j_trvl740_w НЕ заменён — второй cost1-Mechird для Jeet тоже пока не существует
  'j_trvl523_w','j_trvl579_w','j_trvl36_w','j_trvl434_w','j_trvl859_w','j_trvl663_w',
  'j_trvl578_w','j_trvl359_w','j_trvl53_w','j_trvl901_w',
  // ── ЭКСПЕРИМЕНТ 35→40, раунд 2 — та же логика, что у Tea выше, зеркально по слабым
  // архетипам Jeet (Umbasir/Mechird/Xuiqtr). Раунд 1 добавлял j_trvl128_w (Mechird
  // cost5, draw_attack+incarnation:4) — 58.7% WWP, тоже тёплая, снята вместе с Tea-
  // парой ради симметрии решения (не потому что сама по себе была вне коридора).
  'j_trvl934_w', // Umbasir cost2 (bolt:1, ваниль) — Umbasir 1→2, дешёвый filler
  'j_trvl133_w', // Umbasir cost4 (bolt:1+mek+regen) — Umbasir 2→3, sustain-пик вместо снятого cost5 shield/ward (#248)
  'j_trvl178_w', // Mechird cost1 (shot:1) — 2026-08-06, по прямому запросу автора: заменён j_trvl804_w (Mechird cost3, shot+regen) — тот же curve-фикс, что у Tea (см. t_trvl38_w→t_trvl150_w выше), зеркально по фракции
  'j_trvl76_w',  // Xuiqtr cost3 (intercept+death_atk:1) — 2026-08-06, по прямому запросу автора: заменён j_trvl3_w (intercept+vampiric) — vampiric лечит на КАЖДОЙ успешной атаке (постоянный ресурс), заметно сильнее разового death_atk/death_armor-паттерна у остальных cost3-пиров; подозревается как один из вкладчиков в перекос винрейта Jeet (43-45%/55-57% на нескольких N=1500 прогонах после свежих правок кривой маны)
  'j_phleg',     // PHLEGMOR (unique, raise:1 — некромантия/воскрешение, cost8) — 5-й слот, не было в Classic. Та же оговорка про историю балансировки, что у NABUNAGI — последний срез (atk2/hp8) в изолированных тестах всё ещё держался 56-59.7% WWP, не факт что холодная.
  'j_sp23','j_sp10','j_sp20','j_sp17',
  'j_sp14','j_sp14','j_sp1','j_sp16','j_sp18','j_sp6','j_sp15','j_sp12','j_sp2','j_sp27','j_sp9', // j_sp22(EXTINCTION, aoe-снос поля)→j_sp9(RUPTURE, Bolt5+trample) — 2026-08-06, по прямому запросу автора, тот же фикс, что у Tea (см. её комментарий в CLASSIC_TEA_DECK выше)
];


function _composeDeckList(f, cfg){
  return (f==='tea' ? CLASSIC_TEA_DECK : CLASSIC_JEET_DECK).slice();
}

function buildDeck(f, configKey) {
  const cfg = DECK_CONFIGS[configKey] || DECK_CONFIGS.classic;
  let d = _composeDeckList(f, cfg);
  // Unseen (2nd-player bonus card) is NOT part of the deck — it's granted
  // directly to whichever faction the dice-roll made the 2nd player, straight
  // into their hand right after the mulligan ends (grantUnseenBonus() in
  // ui.js). Keeping it out of the deck means it can never appear in — or be
  // discarded during — the mulligan itself. See CLAUDE.md "Version 1.01".
  return shuffleArr(d);
}

// Rush deckbuilder pool — 2026-07-24 (fix, по прямому запросу автора): раньше это было
// `_composeDeckList(f, DECK_CONFIGS.classic)` — буквально то же самое, что уходит в Classic.
// Это молча сломалось, когда classic-массивы архетипов стали "что видишь — то и в деке"
// (без slice, см. рефактор выше): раньше пул архетипа был ШИРЕ, чем срез в деку, и Rush
// через тот же _composeDeckList() случайно видел лишние карты сверху среза. Теперь массив
// = ровно то, что в Classic, и Rush через ту же функцию видел ТОЛЬКО те же карты, что и
// Classic — а весь ростер, что добавлялся в data.js весь день (десятки новых Traveler'ов),
// стал невидим для деккбилдера, хотя это ровно тот пул, ради которого его и наполняли.
// Правильная семантика: Classic — фиксированный кураторский пресет (всегда одна и та же
// дека), Rush — свободный выбор из ВСЕЙ коллекции. Теперь читает прямо из DEFS по фракции,
// не через _composeDeckList/classic вообще.
// 2026-07-24 (по прямому запросу автора): в Rush все спеллы доступны фиксированно по 3
// копии на фракцию, независимо от SPELL_COPIES (та таблица квот — только для Classic,
// Rush её больше не читает вообще для спеллов).
function getRushPool(f){
  // 2026-07-24 (баг, автор): забыл исключить neutral:true (UNSEEN) — та карта f:"jeet"
  // тегом, но по смыслу нейтральная/отложенная (см. историю в data.js), в деккбилдере
  // не должна светиться ни у одной фракции, пока по ней не будет отдельного решения.
  return Object.entries(DEFS)
    .filter(([key,d]) => d.f===f && !d.neutral)
    .map(([key,d]) => ({ key, max: d.spell ? 3 : 1 }));
}

// AI's automatic Rush deck (vsAI mode only — the AI never goes through the
// deckbuilder UI): a random RUSH_MIN-card sample of the same pool a human
// would be picking from, so the AI's deck is roughly "one plausible Rush
// build" rather than a separately hand-tuned preset.
function buildAiRushDeck(f){
  let slots = [];
  getRushPool(f).forEach(({key,max}) => { for(let i=0;i<max;i++) slots.push(key); });
  shuffleArr(slots);
  let d = slots.slice(0, RUSH_MIN);
  // No 'unseen' push here either — see buildDeck() above.
  return shuffleArr(d);
}

let UID=0;
function mkCard(key){
  const def=DEFS[key];
  if(!def)return null;
  UID++;
  return{id:'c'+UID,key,name:def.name,cost:def.cost,hp:def.hp,maxHp:def.hp,atk:def.atk,art:def.art,img:def.img||null,
    f:def.f,tags:[...(def.tags||[])],ab:def.ab||'',
    spell:!!def.spell,world:!!def.world,artifact:!!def.artifact,unique:!!def.unique,
    fullArt:!!def.fullArt,neutral:!!def.neutral,golden:!!def.golden,
    sleeping:false,exhausted:false,feared:false,burning:false,provokeBroken:false,atkBonus:0,tempAtkBonus:0,
    armor:0,shieldConsumed:false}; // Armor — see game.js dmgCard()/doCreature()/endTurn() for the actual mechanic
}
