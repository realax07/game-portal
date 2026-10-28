// Mechanics transcribed from available card references, not invented from names.
// Source review is separate from implementation and retained as partial.
const source='https://github.com/ionagamed/munchkin/tree/master/logic/packs/pack1/doors';
const loss=n=>[{type:'levels',amount:n}];
const rows=[
 ['Amazon','Амазонка',8,2,{peacefulSex:'female',peacefulTreasure:1,badStuff:[{type:'loseClassesOrLevels',amount:3}],desc:'Не дерётся, если среди бойцов есть женщина: уходит, оставляя 1 сокровище. Непотребство: потеряй все классы; если их нет — 3 уровня.'}],
 ['Floating Nose','Летающий нос',10,3,{noEscape:true,bribeGold:200,nose:true,badStuff:[{type:'levels',amount:3}],desc:'Можно откупиться одной шмоткой от 200 золотых, даже из руки. Если проиграл, смывка невозможна: потеряй 3 уровня.'}],
 ['Lawyers','Адвокаты',6,2,{peacefulIdentity:'Thief',exchangeTreasures:2,badStuff:[{type:'othersTakeHand'}],desc:'Не дерутся с вором. Вор может сбросить 2 сокровища и взять 2 новых закрытых. Непотребство: остальные слева берут по закрытой карте из руки, остаток сбрасывается.'}],
 ['Pit Bull','Питбуль',2,1,{discardPoleEscape:true,badStuff:[{type:'levels',amount:2}],desc:'Для смывки можно бросить посох, жезл или шест. Непотребство: потеря 2 уровней.'}],
 ['Stoned Golem','Обдолбанный голем',14,4,{mayIgnore:true,mustFightIdentity:'Halfling',badStuff:[{type:'death'}],desc:'Можно пройти мимо без наград, кроме случаев, когда среди бойцов есть хафлинг. Непотребство: смерть.'}],
 ['Tongue Demon','Языческий демон',12,3,{against:[{identity:'Cleric',bonus:4}],entryDiscardItem:true,badStuff:[{type:'levels',amount:2,extraIdentity:'Elf',extraAmount:1}],desc:'+4 против клириков. При первоначальной встрече до боя сбрось одну свою шмотку. Если подкинут в бой, этот сброс не требуется. Непотребство: −2 уровня, эльфу −3.'}],
 ['Wannabe Vampire','Начинающий вампир',12,3,{clericDismiss:true,badStuff:[{type:'levels',amount:3}],desc:'Клирик в бою может прогнать его и забрать сокровища без уровня, после победы над всей группой. Непотребство: потеря 3 уровней.'}],
 ['Hippogriff','Гиппогриф',16,4,{levels:2,noPursuitBelow:3,badStuff:[{type:'othersTakeTreasure'}],desc:'Не преследует 1–3 уровень. Непотребство: остальные игроки, начиная справа, берут по сокровищу со стола или закрытому сокровищу из твоей руки. За убийство 2 уровня.'}],
 ['Insurance Salesman','Страховой агент',14,4,{bonusesOnly:true,badStuff:[{type:'payItems',gold:1000}],desc:'Уровни бойцов не считаются: только бонусы. Непотребство: потеряй шмотки на 1000 золотых или все, если их стоимость меньше.'}],
 ['Leperchaun','Лепрекон',4,2,{rulesSource:'https://repositorio.unb.br/bitstream/10482/38936/1/2020_HudsonCogoMoreira.pdf',against:[{identity:'Elf',bonus:5}],badStuff:[{type:'neighboursTakeItems'}],desc:'+5 против эльфов. Непотребство: соседи слева и справа выбирают по одной твоей шмотке из игры, обе сбрасываются.'}],
 ['Platycore','Платикор',6,2,{against:[{identity:'Wizard',bonus:6}],badStuff:[{type:'handOrLevels',amount:2}],rulesSource:'https://repositorio.unb.br/bitstream/10482/38936/1/2020_HudsonCogoMoreira.pdf',desc:'+6 против волшебников. Непотребство: выбери — сбросить всю руку или потерять 2 уровня.'}],
 ['Snails on Speed','Улитки на спидах',4,2,{escapeModifier:-2,badStuff:[{type:'loseCardsByDie'}],desc:'−2 к смывке. Непотребство: брось кубик и потеряй столько карт из руки или шмоток из игры, на свой выбор.'}],
 ['3,872 Orcs','3872 орка',10,3,{against:[{identity:'Dwarf',bonus:6}],badStuff:[{type:'orcStomp'}],desc:'+6 против дварфов. Непотребство: кубик 1–2 — смерть; иначе потеря уровней по кубику.'}],
 ['Bigfoot','Большеног',12,3,{againstAny:[{identities:['Dwarf','Halfling'],bonus:3}],badStuff:[{type:'loseGear',slots:['head']}],desc:'+3 против дварфов или хафлингов, однократно. Непотребство: потеря головняка.'}],
 ['Bullrog','Бульрог',18,5,{levels:2,noPursuitBelow:4,badStuff:[{type:'death'}],desc:'Не преследует 1–4 уровень. Непотребство: смерть. За убийство 2 уровня.'}],
 ['Crabs','Крабы',1,1,{noEscape:true,badStuff:[{type:'loseGear',slots:['body','feet'],belowWaist:true}],desc:'Смывка невозможна. Непотребство: потеря брони и всех шмоток ниже пояса.'}],
 ['Face Sucker','Лицесос',8,2,{against:[{identity:'Elf',bonus:6}],badStuff:[{type:'loseGear',slots:['head']},{type:'levels',amount:1}],desc:'+6 против эльфов. Непотребство: потеря головняка и 1 уровня.'}],
 ['Flying Frogs','Летучие лягушки',2,1,{escapeModifier:-1,badStuff:loss(2),desc:'−1 к смывке. Непотребство: потеря 2 уровней.'}],
 ['Gazebo','Беседка',8,2,{noHelp:true,badStuff:loss(3),desc:'Помощник запрещён, даже если беседку подкинули в уже начавшийся бой. Непотребство: потеря 3 уровней.'}],
 ['Gelatinous Octahedron','Желатиновый октаэдр',2,1,{escapeModifier:1,badStuff:[{type:'loseBigItems'}],desc:'+1 к смывке. Непотребство: потеря всех больших шмоток.'}],
 ['Ghoulfiends','Подружки-упыри',8,2,{levelsOnly:true,badStuff:[{type:'lowestLevel'}],rulesSource:'https://munchkin.game/gameplay/faq/',desc:'В бою помогают только уровни: шмотки и прочие положительные бонусы не считаются. Не нежить. Непотребство: твой уровень становится равным самому низкому за столом.'}],
 ['Harpies','Гарпии',4,2,{against:[{identity:'Wizard',bonus:5}],badStuff:loss(2),desc:'+5 против волшебников. Непотребство: потеря 2 уровней.'}],
 ['King Tut','Король Тут',16,4,{undead:true,levels:2,noPursuitBelow:3,escapeLoss:2,badStuff:[{type:'discardHand'},{type:'loseAllItems'}],desc:'Нежить. Не преследует 1–3 уровень. При смывке игроки выше 3 уровня теряют 2 уровня, даже убежав. Непотребство: потеря всей руки и всех шмоток.'}],
 ['Lame Goblin','Хромой гоблин',1,1,{escapeModifier:1,badStuff:loss(1),desc:'+1 к смывке. Непотребство: потеря 1 уровня.'}],
 ['Large Angry Chicken','Большая сердитая курица',2,1,{fireLevel:1,badStuff:loss(1),desc:'За убийство с огненной атакой — ещё 1 уровень. Непотребство: потеря 1 уровня.'}],
 ['Maul Rat','Крыса с кувалдой',1,1,{against:[{identity:'Cleric',bonus:3}],badStuff:loss(1),desc:'+3 против клириков. Непотребство: потеря 1 уровня.'}],
 ['Mr. Bones','Мистер Кости',2,1,{undead:true,escapeLoss:1,badStuff:loss(2),desc:'Нежить. При смывке потеряй 1 уровень, даже убежав. Непотребство: потеря ещё 2 уровней.'}],
 ['Pukachu','Пукачу',6,2,{unassistedLevel:1,badStuff:[{type:'discardHand'}],desc:'За убийство без помощника и без использования бонусов — ещё 1 уровень. Непотребство: сброс всей руки.'}],
 ['Shrieking Geek','Вопящий гик',6,2,{against:[{identity:'Warrior',bonus:6}],badStuff:[{type:'loseIdentities',kinds:['class','race']}],desc:'+6 против воинов. Непотребство: сброс всех рас и классов, стань человеком без класса.'}],
 ['Squidzilla','Кальмадзилла',18,4,{levels:2,against:[{identity:'Elf',bonus:4}],noPursuitBelow:4,pursuesIdentity:'Elf',badStuff:[{type:'death'}],desc:'+4 против эльфов. Не преследует 1–4 уровень, кроме эльфов. Непотребство: смерть. За убийство 2 уровня.'}],
 ['Undead Horse','Андедный конь',4,2,{undead:true,against:[{identity:'Dwarf',bonus:5}],badStuff:loss(2),desc:'Нежить. +5 против дварфов. Непотребство: потеря 2 уровней.'}],
 ['Unspeakably Awful Indescribable Horror','Невыразимо ужасный неописуемый ужас',14,4,{against:[{identity:'Warrior',bonus:4}],badStuff:[{type:'wizardOrDeath'}],desc:'+4 против воинов. Непотребство: волшебник теряет свой класс, остальные погибают.'}],
 ['Wight Brothers','Братья-могильщики',16,4,{undead:true,levels:2,noPursuitBelow:3,escapeLoss:2,badStuff:[{type:'setLevel',level:1}],desc:'Нежить. Не преследуют 1–3 уровень. При смывке игроки выше 3 уровня теряют 2 уровня, даже убежав. Непотребство: уровень становится первым. За убийство 2 уровня.'}]
];
export const BASE_MONSTERS=rows.map(([en,name,power,reward,extra])=>({id:'base-'+en.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),set:'base',en,name,type:'monster',icon:en==='Large Angry Chicken'||en==='Flying Frogs'?'bird':'troll',power,reward,levels:1,rulesStatus:'partial',rulesSource:source,rulesNote:'Механика реализована по доступным транскрипциям. Полная сверка печатного текста ещё требуется.',...extra}));
const finalMonsterSources={
 Amazon:'https://munchkin.game/gameplay/faq/',
 'Floating Nose':'https://gamegloriously.wordpress.com/2016/06/11/munchkin-deluxe-a-game-gloriously-review-part-1/',
 Lawyers:'https://munchkin.fandom.com/wiki/Lawyers',
 'Pit Bull':'https://munchkin.game/site-munchkin/assets/files/1157/xmaslite_rules.pdf',
 'Stoned Golem':'https://munchkin.game/gameplay/faq/',
 'Tongue Demon':'https://gamegloriously.wordpress.com/2016/06/11/munchkin-deluxe-a-game-gloriously-review-part-1/',
 'Wannabe Vampire':'https://gamegloriously.wordpress.com/2016/06/11/munchkin-deluxe-a-game-gloriously-review-part-1/'
};
for(const c of BASE_MONSTERS)if(finalMonsterSources[c.en])c.rulesSource=finalMonsterSources[c.en];
