// Own summaries of checked printed effects. Sources are research records, not
// scans shipped with the game. Cards without checked text keep their sample rules.
const base='https://hobbygames.ru/download/rules/munchkin-base-start-list.pdf';
const faq='https://munchkin.game/gameplay/faq/';
const axe='https://munchkin.game/site-munchkin/assets/files/1320/munchkin_2_rules_30p.pdf';
const thesis='https://bdm.unb.br/bitstream/10483/6723/6/2011_JuliaCamposMMaia.pdf';
export const CHECKED_RULES={
 'Potted Plant':{power:1,reward:1,levels:1,neverPursues:true,elfTreasure:1,badStuff:[],desc:'Смывка без кубика. Если среди победителей есть эльф — ещё 1 сокровище.',source:'https://www.ebay.com/itm/354639341282'},
 'Drooling Slime':{power:1,reward:1,levels:1,against:[{identity:'Elf',bonus:4}],badStuff:[{type:'loseGear',slots:['feet'],otherwiseLevels:1}],desc:'+4 против эльфов. Непотребство: потеря обувки; если её нет — 1 уровня.',source:base},
 'Plutonium Dragon':{power:20,reward:5,levels:2,noPursuitBelow:5,death:true,badStuff:[{type:'death'}],desc:'Не преследует игроков 1–5 уровня. Непотребство: смерть. За убийство 2 уровня.',source:'https://repositorio.unb.br/bitstream/10482/38936/1/2020_HudsonCogoMoreira.pdf'},
 'Net Troll':{power:10,reward:3,levels:1,badStuff:[{type:'giveGearToLeaders'}],desc:'Непотребство: каждый игрок с наибольшим уровнем забирает у тебя по шмотке.',source:base},
 'Hydrant':{power:15,reward:4,levels:2,soloBonus:5,noPursuitBelow:2,badStuff:[{type:'levels',die:true}],desc:'+5, если дерёшься без помощника. Не преследует 1–2 уровень. Непотребство: потеря уровней по кубику.',source:thesis},
 'Tentacle Demon':{power:15,reward:4,levels:2,against:[{identity:'Cleric',bonus:5}],noPursuitBelow:3,death:true,badStuff:[{type:'death'}],desc:'+5 против клириков. Не преследует 1–3 уровень. Непотребство: смерть. За убийство 2 уровня.',source:'https://www.tradeinn.com/f/13979/139790548_2/edge-studio-juego-de-cartas-munchkin-2%3A-hacha-descomunal.webp'},
 'Teddy Bear':{power:5,reward:2,levels:1,against:[{identity:'Orc',bonus:5}],badStuff:[{type:'discardHand',drawIfMoreThanOne:1}],desc:'+5 против орков. Непотребство: сброс всей руки; если карт было больше одной, возьми 1 сокровище.',source:axe},
 'Grassy Gnoll':{power:7,reward:2,levels:1,against:[{identity:'Human',bonus:5}],badStuff:[{type:'levels',amount:3,potionsReduce:true}],desc:'+5 против людей. Непотребство: −3 уровня; можно уменьшить потерю на 1 за каждое сброшенное зелье.',source:thesis},
 'Tequila Mockingbird':{power:1,reward:1,levels:1,against:[{identity:'Bard',bonus:5}],badStuff:[{type:'discardHand',count:2}],desc:'+5 против бардов. Непотребство: сбрось 2 карты из руки на свой выбор.',source:axe},
 'Bad Ass':{power:5,reward:2,levels:1,against:[{identity:'Orc',bonus:5}],badStuff:[{type:'discardHand',types:['monster','enhancer'],reveal:true}],desc:'+5 против орков. Непотребство: покажи руку и сбрось монстров и усилители монстров.',source:thesis},
 'Auntie Paladin':{power:18,reward:4,levels:2,against:[{identity:'Cleric',bonus:5}],againstSex:{sex:'male',bonus:5},badStuff:[{type:'loseGear',slots:['body']},{type:'levels',amount:3}],desc:'+5 против клириков и +5 против мужчин; бонусы складываются. Непотребство: потеря брони и 3 уровней.',source:thesis},
 'Horny Helmet':{bonus:1,slot:'head',gold:600,identityBonuses:[{identity:'Elf',bonus:2}],desc:'+1 к силе; для эльфа +3. Головняк. 600 золотых.',source:base},
 'Boots of Butt-Kicking':{bonus:2,slot:'feet',gold:400,desc:'+2 к силе. Обувка. 400 золотых.',source:'https://munchkin.game/site-munchkin/assets/files/3915/munchkin_big_box_rules-2.pdf'},
 'Staff of Napalm':{bonus:5,hands:1,requires:['Wizard'],gold:800,fire:true,desc:'+5, только волшебнику. Одна рука. Огненная атака. 800 золотых.',source:base},
 'Chainsaw of Bloody Dismemberment':{bonus:3,hands:2,big:true,gold:600,desc:'+3 к силе. Две руки, большая шмотка. 600 золотых.',source:'https://www.sjgames.com/ill/img/retailerimages/Munchkin%20OTD/Game%20Support/Munchkin/Munchkin_Rigged_Demo.pdf'},
 'Unnatural Axe':{bonus:5,hands:1,requires:['Warrior'],big:true,gold:800,desc:'+5, только воину. Одна рука, большая шмотка. 800 золотых.',source:'https://munchkin.game/site-munchkin/assets/files/1320/munchkin2_backbox.jpg'},
 'Spiked Codpiece':{bonus:2,slot:'none',gold:600,sexBonuses:[{sex:'male',bonus:2}],desc:'+2 к силе; мужчине +4. Не занимает слот брони. 600 золотых. Текст сверён по транскрипциям карты.',source:'https://forum.mafiascum.net/viewtopic.php?sid=4ac6ecca575cbb05e5efa12e02393831&t=11317',rulesStatus:'partial'},
 'Chainmail Bikini':{bonus:3,slot:'body',gold:600,desc:'+3 к силе. Броня. 600 золотых.',source:'https://warehouse23.com/cdn/shop/products/samples.jpg?v=1722501722&width=515'},
 'Stab-A-Matic':{bonus:0,hands:1,gold:400,grantsBackstab:true,desc:'Одна рука. Даёт подрезку −2 любому владельцу; вору −3. Сбрось карту, один раз против каждого бойца. 400 золотых.',source:axe},
 'Rat on a Stick':{bonus:1,hands:1,gold:0,action:'ratEscape',desc:'+1, одна рука, без цены. Сбрось из игры, чтобы автоматически уйти от одного монстра 8 уровня или ниже.',source:'https://www.munchkin.game/gameplay/faq/changelog.html/'},
 'Potion of Idiotic Bravery':{bonus:2,gold:100,oneShot:true,desc:'Одноразовое: +2 любой стороне в бою. 100 золотых.',source:'https://www.sjgames.com/ill/img/retailerimages/Munchkin%20OTD/Game%20Support/Munchkin/Munchkin_Rigged_Demo.pdf'},
 'Dragon Steed':{bonus:5,gold:1000,big:true,slot:'steed',runAway:1,fire:true,noSteedEnhancers:true,desc:'+5 к силе и +1 к смывке. Огненный скакун. Усиления скакунов не действуют. 1000 золотых.',source:'https://warehouse23.com/products/munchkin-4-the-need-for-steed'},
 'Trick Riding Boots':{extraSteeds:1,desc:'Обувка. Разрешает одного дополнительного скакуна. Базовый бонус пока адаптирован.',source:faq,rulesStatus:'partial'},
 'Centaur of Attention':{bonus:2,gold:400,slot:'steed',action:'sacrificeSteedAll',desc:'+2. При нескольких монстрах можно пожертвовать скакуном для смывки от всех. 400 золотых.',source:'https://warehouse23.com/products/munchkin-pony-excess'},
 'Dark':{bonus:0,darkSabotage:true,desc:'Усиление расы. Если сыгранная тобой карта или способность помешала сопернику в бою и он смылся, получи уровень (до 9; можно до 10, если жертва умерла).',source:faq},
 'Reloaded Die':{type:'die',bonus:0,action:'reloadedDie',desc:'После чужого броска можешь выбрать результат 1–6. Здесь работает для смывки. На свой бросок не действует.',source:'https://www.sjgames.com/ill/img/2005/dicecards.jpg',rulesStatus:'partial'},
 'Munchkinomicon':{bonus:5,slot:'none',gold:666,desc:'+5 к силе. 666 золотых. Дополнительная колода заклинаний пока не реализована.',source:'https://munchkin.game/site-munchkin/assets/files/1381/mnomcard1.jpg',rulesStatus:'partial'},
 'Hydrogen Dragon':{fireDefeat:true,desc:'Огненная шмотка автоматически побеждает этого монстра. Остальные параметры пока адаптированы.',source:faq,rulesStatus:'partial'},
 "Dragon's Trike":{fire:true,desc:'Огненная атака; не действует против драконов из набора «Драконы». Базовые параметры пока адаптированы.',source:faq,rulesStatus:'partial'}
};
