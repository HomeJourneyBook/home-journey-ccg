// nft-data/list-travelers.js
// Две справочные таблицы: 1) уникальные 1/1-легендарки, 2) рядовые travelers, уже введённые
// в игру (js/data.js). НЕ используется игровым рантаймом - чисто для сверки автором. Собрано
// 2026-07-27, использует nft-data/nft-registry.js как источник метадаты коллекции.
//
// Столбцы: Mint address | Имя в игре | Cost/HP/ATK | Tags | Текст способности | Заметки.
// В "Заметки" - расхождения/проблемы/неопознанное, если есть; иначе прочерк.

/*
===================================== ТАБЛИЦА 1: 1/1 (уникальные легендарки) =====================================

В игре сейчас 10 уников. Файлы арта нумерованы 001..011 (см. img-поле каждой карты) - НЕТ
карты с номером 006: похоже, существует 11-й 1/1 персонаж, ещё не введённый в игру. Само
название файла "11travelers.json" (см. UNCLASSIFIED_ADDRESS_LIST_36 в nft-registry.js)
теперь читается буквально - видимо, 11 travelers = 11 уникальных 1/1-персонажей коллекции,
из которых в игре введено пока 10.

Из тех же 36 адресов три принадлежат Aslex/Tuborg/Fireon (подтверждено автором) - но КАКОЙ
именно адрес какому имени соответствует, определить не удалось: нет способа прочитать
on-chain метадату по конкретному адресу (нет доступа к Solana RPC/эксплореру в этой среде),
а сами файлы full_mint.zip не содержат mint-адресов вообще. Итог: Mint address для всех 10
уников ниже - "не определён". Если пришлёшь адрес<->имя по каждому - впишу.

ЗАМЕТКА: в коллекции 1/1 персонаж называется "Fireon", в игре аналогичная по духу карта названа
"FAERON" - разное написание. Не факт, что это один и тот же персонаж (не подтверждено),
возможно переименование при вводе в игру - уточнить у автора.

| Mint address | Имя в игре | Cost/HP/ATK | Tags | Текст | Заметки |
|---|---|---|---|---|---|
| не определён | TEANTIST (t_tean) | 6/9/3 | stealth, heal:4 | Active Heal 4 and Clean. “Healed in silence.” | не определён (входит в список из 36, см. UNCLASSIFIED_ADDRESS_LIST_36) - если это Aslex/Tuborg, впиши прямо |
| не определён | ASLEX (t_aslex) | 6/7/3 | on_own_death_base:1 | “Elegy”: When your creature dies, Heal Base 1 HP. | не определён (входит в список из 36, см. UNCLASSIFIED_ADDRESS_LIST_36) - если это Aslex/Tuborg, впиши прямо |
| не определён | TUBORG (t_tuborg) | 7/7/3 | aura:armor:1, untamed | Aura: +1 Armor. “None pass unbruised.” | не определён (входит в список из 36, см. UNCLASSIFIED_ADDRESS_LIST_36) - если это Aslex/Tuborg, впиши прямо |
| не определён | FAERON (t_faeron) | 5/8/2 | burn, thorns:2, untamed, atk_vs_burning:1 | “Yet another one burned.” | возможно = "Fireon" из коллекции (разное написание) - не подтверждено |
| не определён | NABUNAGI (t_nab) | 8/8/2 | bushido, armor:1 | "Bushido": All attacks must target him. | не определён (входит в список из 36, см. UNCLASSIFIED_ADDRESS_LIST_36) - если это Aslex/Tuborg, впиши прямо |
| не определён | REAPER (j_reap) | 6/7/3 | on_own_death_base:1 | “Harvest”: When your creature dies, Heal Base 1 HP. | не определён (входит в список из 36, см. UNCLASSIFIED_ADDRESS_LIST_36) - если это Aslex/Tuborg, впиши прямо |
| не определён | RYVLEN (j_ryv) | 6/8/3 | enter_lose:1, draw_attack:1 | On play Lose 1. “Candles in Space” | не определён (входит в список из 36, см. UNCLASSIFIED_ADDRESS_LIST_36) - если это Aslex/Tuborg, впиши прямо |
| не определён | ABYSSWALKER (j_mal) | 7/7/3 | aura:armor:1, armor:2 | Aura: +1 Armor. “The dark strikes first.” | не определён (входит в список из 36, см. UNCLASSIFIED_ADDRESS_LIST_36) - если это Aslex/Tuborg, впиши прямо |
| не определён | PHLEGMOR (j_phleg) | 8/10/2 | raise:1 | On turn "Necromancy": Revive top graveyard card at 1 HP. | не определён (входит в список из 36, см. UNCLASSIFIED_ADDRESS_LIST_36) - если это Aslex/Tuborg, впиши прямо |
| не определён | SEEKER (j_vard) | 5/8/2 | invisible, fear, atk_vs_feared:1 | "Seek, and ye shall find." | не определён (входит в список из 36, см. UNCLASSIFIED_ADDRESS_LIST_36) - если это Aslex/Tuborg, впиши прямо |

Отсутствует в игре: 11-й 1/1 (номер файла арта 006 в последовательности) - имя и данные
неизвестны, ждём автора.

===================================== ТАБЛИЦА 2: рядовые travelers (в игре) =====================================

109 карт (все travelers, уже введённые в js/data.js). Mint address заполнен ТОЛЬКО для
номеров, что есть в ORBITON_CONVERSIONS (nft-registry.js) - для остальных адрес неизвестен,
связки номер->адрес для основной массы коллекции пока нет вообще.

| Mint address | Имя в игре | Cost/HP/ATK | Tags | Текст | Заметки |
|---|---|---|---|---|---|
| не определён | TRAVELER #0 (j_trvl0_w) | 2/3/1 | intercept, gtype:xui | Squad +1 ATK. | номер не найден в известной метадате коллекции — новая карта этой сессии, не сверена с NFT |
| не определён | TRAVELER #1 (t_trvl1_w) | 3/6/1 | provoke, death_heal:4, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #2 (j_trvl2_w) | 3/3/1 | bolt:1, untamed, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #3 (j_trvl3_w) | 3/4/2 | intercept, vampiric, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #4 (j_trvl4_w) | 3/3/1 | bolt:1, untamed, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #6 (t_trvl6_w) | 3/3/1 | bolt:1, enter_draw:1, gtype:umb | On play Draw 1. Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #7 (j_trvl7_w) | 2/2/3 | gtype:szg | Squad +1 maxHP. | — |
| 97BcZRMyTozaaiqJFkJdWjjxdrD4hdMMvfqovWeHfgei | TRAVELER #10 (t_trvl10_w) | 3/3/2 | heal:3, burn, gtype:orb | Active Heal 3 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Dreegan Red -> в игре gtype:orb (ожидаемо, это и есть конверсия) |
| не определён | TRAVELER #11 (t_trvl11_w) | 3/3/2 | pierce, death_heal:4, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #12 (j_trvl12_w) | 1/1/2 | gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #14 (t_trvl14_w) | 2/4/1 | provoke, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #17 (t_trvl17_w) | 3/3/2 | pierce, incarnation:4, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #18 (t_trvl18_w) | 2/2/1 | pierce, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #20 (j_trvl20_w) | 4/4/2 | bolt:1, vanguard, untamed, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #21 (t_trvl21_w) | 1/1/1 | bolt:1, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #22 (j_trvl22_w) | 3/3/2 | pierce, untamed, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #23 (j_trvl23_w) | 3/6/1 | provoke, vanguard, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #25 (j_trvl25_w) | 3/3/4 | untamed, gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #26 (t_trvl26_w) | 3/4/2 | intercept, death_armor:2, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #27 (j_trvl27_w) | 2/4/1 | provoke, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #28 (t_trvl28_w) | 2/2/3 | gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #30 (j_trvl30_w) | 3/3/2 | pierce, untamed, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #31 (t_trvl31_w) | 3/6/1 | provoke, burn, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #32 (t_trvl32_w) | 2/3/1 | intercept, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #33 (t_trvl33_w) | 1/1/2 | gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #34 (t_trvl34_w) | 3/3/4 | regen, gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #35 (t_trvl35_w) | 2/2/1 | pierce, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #36 (j_trvl36_w) | 3/6/1 | provoke, untamed, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #37 (j_trvl37_w) | 2/3/1 | intercept, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #38 (t_trvl38_w) | 3/3/2 | pierce, vampiric, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #39 (t_trvl39_w) | 2/3/1 | intercept, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #41 (j_trvl41_w) | 2/4/1 | provoke, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #42 (t_trvl42_w) | 2/3/1 | intercept, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #45 (t_trvl45_w) | 2/2/1 | bolt:1, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #49 (j_trvl49_w) | 2/2/3 | gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #50 (j_trvl50_w) | 2/3/1 | intercept, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #52 (t_trvl52_w) | 1/1/1 | bolt:1, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #53 (j_trvl53_w) | 3/3/1 | bolt:1, enter_lose:1, gtype:umb | On play Lose 1. Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #54 (j_trvl54_w) | 1/1/1 | bolt:1, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #55 (t_trvl55_w) | 2/2/3 | gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #56 (t_trvl56_w) | 3/3/4 | death_armor:2, gtype:szg | Squad +1 maxHP. | — |
| 21hv2cy9aeQeVdb43N7E68BiqATVqgmENRiyxrTWTQVy | TRAVELER #57 (t_trvl57_w) | 3/3/4 | burn, gtype:szg | Squad +1 maxHP. | Orbiton-конверсия: исходный Gate был Szarg Mono -> в игре gtype:szg (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to monoAnime (Mood)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| не определён | TRAVELER #58 (t_trvl58_w) | 2/4/1 | provoke, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #128 (j_trvl128_w) | 5/5/4 | pierce, draw_attack:1, incarnation:4, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #137 (t_trvl137_w) | 3/3/1 | bolt:1, shield, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #163 (j_trvl163_w) | 4/8/2 | provoke, enter_lose:1, untamed, gtype:drg | On play Lose 1. Squad +1 Armor. | — |
| 5LrBgCFHwsSdaAgbHqW4eHwcVa22571E3uPM1PVGsSTc | TRAVELER #170 (j_trvl170_w) | 1/1/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Xuthqir Pink -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to Mono (World)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| 6qLGgihtaGps9vd8v6xQcXWSfTtQKg8Z6YEwVzWpezFX | TRAVELER #218 (t_trvl218_w) | 2/2/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Szarg Blue -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to cross (Mood)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| не определён | TRAVELER #248 (j_trvl248_w) | 5/5/2 | bolt:1, shield, ward, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #250 (t_trvl250_w) | 5/5/6 | burn, death_bolt:4, gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #295 (t_trvl295_w) | 5/5/4 | pierce, burn, rage, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #320 (j_trvl320_w) | 4/4/3 | pierce, remember, untamed, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #348 (j_trvl348_w) | 1/1/1 | bolt:1, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| HfztdLB2MFjWSAfFhEBpbwjug5yV8up83Cm8HRZH2YS4 | TRAVELER #359 (j_trvl359_w) | 2/2/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Szarg Brown -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to blue body (Gate/art?)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| не определён | TRAVELER #372 (t_trvl372_w) | 4/4/2 | bolt:1, untamed, incarnation:4, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #387 (t_trvl387_w) | 5/5/2 | bolt:1, burn, remember, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #388 (t_trvl388_w) | 4/8/2 | provoke, untamed, enter_draw:1, gtype:drg | On play Draw 1. Squad +1 Armor. | — |
| HZyCgd9i58STbTLw3mtfmNZ5vcrasAqayYe5vA1p3pps | TRAVELER #398 (t_trvl398_w) | 4/4/2 | heal:3, vanguard, untamed, gtype:orb | Active Heal 3 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Szarg Pink -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to pinkAnime (Mood)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| не определён | TRAVELER #402 (t_trvl402_w) | 5/6/3 | intercept, regen, vampiric, gtype:xui | Squad +1 ATK. | — |
| DqYsuhJJ8VhJ22CUJxC4tWemB3ZJPQ2qYAyYHcHyKArv | TRAVELER #420 (t_trvl420_w) | 3/3/2 | heal:3, death_heal:4, gtype:orb | Active Heal 3 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Mechird Blue -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to Bamboo and brown body (World+Gate?)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| CoEeYAR52shWKHQhTfY1GxEYyvgkAYjPAxAiVYeqjwn5 | TRAVELER #429 (j_trvl429_w) | 1/1/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Umbasir Brown -> в игре gtype:orb (ожидаемо, это и есть конверсия) |
| 5Z4akh6J1LpsYF5RXtKyfZiKKBsZDjTffydXguSzBRjo | TRAVELER #433 (t_trvl433_w) | 1/1/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Mechird Blue -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to blueS (World)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически; mint-адрес отсутствует в текущем supply-снепшоте — вероятно burn+remint, адрес мог смениться |
| не определён | TRAVELER #434 (j_trvl434_w) | 4/4/5 | fear, incarnation:4, gtype:szg | Squad +1 maxHP. | — |
| DP4LrdFn7W3aztfharyhge5i4QrZ6E9iH858RRs3AiXU | TRAVELER #454 (j_trvl454_w) | 3/3/2 | heal:3, regen, gtype:orb | Active Heal 3 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Xuthqir Red -> в игре gtype:orb (ожидаемо, это и есть конверсия); mint-адрес отсутствует в текущем supply-снепшоте — вероятно burn+remint, адрес мог смениться |
| 3BpYhHUtsjFj1hk1Hu2K5vduBaHwCkwYLPEjCt7nNTZD | TRAVELER #457 (j_trvl457_w) | 2/2/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Dreegan Mono -> в игре gtype:orb (ожидаемо, это и есть конверсия) |
| не определён | TRAVELER #481 (j_trvl481_w) | 4/8/2 | provoke, untamed, death_bolt:4, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #495 (t_trvl495_w) | 4/4/3 | pierce, ward, death_heal:4, gtype:mch | Squad +1 ATK. | — |
| 3XNDW3sR93x7vN1h1BkH731Zox92xsDYJK4CQf4w7fr5 | TRAVELER #503 (t_trvl503_w) | 1/1/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Szarg Brown -> в игре gtype:orb (ожидаемо, это и есть конверсия) |
| 5utmDSRYsJPUM2oiCeJz3ftbhWVEVK6GMe4wRrocorMm | TRAVELER #523 (j_trvl523_w) | 3/3/2 | heal:3, fear, gtype:orb | Active Heal 3 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Umbasir Mono -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to skull (Mood)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически; mint-адрес отсутствует в текущем supply-снепшоте — вероятно burn+remint, адрес мог смениться |
| не определён | TRAVELER #550 (j_trvl550_w) | 4/4/2 | bolt:1, fear, death_armor:2, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #551 (j_trvl551_w) | 3/3/4 | incarnation:4, gtype:szg | Squad +1 maxHP. | — |
| 4KS7EX6Xq5gj3ooZ7wuv92689bKbLUFzxkU2xEde6dbB | TRAVELER #568 (j_trvl568_w) | 3/3/2 | heal:3, vanguard, gtype:orb | Active Heal 3 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Mechird Orange -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to sand and 6 (World+Mood)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| 8PAb8URQS85kyNMv5ovkgj1PA4oidEq4FYPggENjrmUS | TRAVELER #578 (j_trvl578_w) | 1/1/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Umbasir Red -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to pink body (Gate/art?)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| не определён | TRAVELER #579 (j_trvl579_w) | 3/4/2 | intercept, fear, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #583 (t_trvl583_w) | 4/4/2 | bolt:1, regen, death_heal:4, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #605 (t_trvl605_w) | 3/6/1 | provoke, shield, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #607 (t_trvl607_w) | 5/5/4 | pierce, draw_attack:1, remember, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #663 (j_trvl663_w) | 4/4/3 | pierce, fear, death_heal:4, gtype:mch | Squad +1 ATK. | — |
| EygRcYgEpK4AJU3d8PFz3Kt1858oEjKyiXCev8GWxJ3n | TRAVELER #692 (t_trvl692_w) | 3/3/2 | heal:3, burn, gtype:orb | Active Heal 3 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Umbasir Green -> в игре gtype:orb (ожидаемо, это и есть конверсия) |
| не определён | TRAVELER #694 (t_trvl694_w) | 3/3/4 | vanguard, gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #699 (t_trvl699_w) | 4/4/3 | pierce, death_armor:2, untamed, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #704 (j_trvl704_w) | 5/6/3 | intercept, fear, shield, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #720 (j_trvl720_w) | 3/4/2 | intercept, draw_attack:1, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #724 (j_trvl724_w) | 2/2/1 | pierce, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #727 (j_trvl727_w) | 3/3/2 | pierce, vanguard, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #730 (t_trvl730_w) | 3/3/1 | bolt:1, untamed, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #734 (j_trvl734_w) | 3/3/4 | remember, gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #740 (j_trvl740_w) | 1/1/2 | gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #775 (j_trvl775_w) | 3/6/1 | provoke, rage, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #804 (j_trvl804_w) | 3/3/2 | pierce, regen, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #806 (j_trvl806_w) | 4/5/3 | intercept, vanguard, regen, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #832 (t_trvl832_w) | 3/3/2 | pierce, ward, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #847 (t_trvl847_w) | 4/5/3 | intercept, ward, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #859 (j_trvl859_w) | 4/8/2 | provoke, fear, vanguard, gtype:drg | Squad +1 Armor. | — |
| не определён | TRAVELER #867 (j_trvl867_w) | 5/5/2 | heal:4, ward, shield, gtype:orb | Active Heal 4 and Clean. Squad: +2 Armor. | ⚠️ Gate в метадате (Szarg Mono) НЕ совпадает с игровым gtype:orb — не входит в известный список конверсии, требует проверки |
| BeL16c6cyXyPp8r2m9PWaA7sKavFe885PybLKh5rFwnq | TRAVELER #868 (t_trvl868_w) | 2/2/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Xuthqir Mono -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to monoS (World)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| не определён | TRAVELER #870 (t_trvl870_w) | 1/1/2 | gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #890 (t_trvl890_w) | 1/1/2 | gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #901 (j_trvl901_w) | 3/3/2 | pierce, ward, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #921 (t_trvl921_w) | 3/3/2 | pierce, burn, gtype:mch | Squad +1 ATK. | — |
| не определён | TRAVELER #934 (j_trvl934_w) | 2/2/1 | bolt:1, gtype:umb | Active Bolt 1. Squad Bolt 2. | — |
| не определён | TRAVELER #951 (t_trvl951_w) | 3/4/2 | intercept, regen, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #971 (j_trvl971_w) | 1/1/2 | gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #972 (t_trvl972_w) | 3/4/2 | intercept, burn, gtype:xui | Squad +1 ATK. | — |
| не определён | TRAVELER #1008 (j_trvl1008_w) | 3/3/4 | fear, gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #1015 (t_trvl1015_w) | 4/8/2 | provoke, regen, vanguard, gtype:drg | Squad +1 Armor. | — |
| 2CseMKKYVQc19CwXXV1Vw7zy8TjgCmheNa3vU1bCjsC2 | TRAVELER #1034 (t_trvl1034_w) | 1/1/1 | heal:2, gtype:orb | Active Heal 2 and Clean. Squad: +2 Armor. | Orbiton-конверсия: исходный Gate был Xuthqir Pink -> в игре gtype:orb (ожидаемо, это и есть конверсия); автор отметил трейт-изменение при конверсии: "change to greenS and triangle (World+Mood)" — актуальные Mood/World могут отличаться от atMint, сверка тегов не выполнялась автоматически |
| не определён | TRAVELER #1066 (t_trvl1066_w) | 4/4/5 | regen, vanguard, gtype:szg | Squad +1 maxHP. | — |
| не определён | TRAVELER #1079 (j_trvl1079_w) | 2/2/1 | pierce, gtype:mch | Squad +1 ATK. | — |
*/

module.exports = {};
