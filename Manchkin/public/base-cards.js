import {CURSES} from './curses.js';
// Independently expressed mechanics. Transcription sources and outstanding
// full-text checks are recorded separately from working engine behavior.
const research='https://github.com/ionagamed/munchkin/tree/master/logic/packs/pack1';
export const BASE_ADDITIONS=[];
const add=(en,name,type,extra)=>BASE_ADDITIONS.push({id:'base-'+en.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),set:'base',en,name,type,icon:'sword',rulesStatus:'partial',rulesSource:research,rulesNote:'Механика реализована по доступным транскрипциям. Полная сверка печатного текста ещё требуется.',...extra});
const ruCurses={
 'Curse! Duck of Doom':'Проклятие! Утка рока',
 'Curse! Lose a Big Item':'Проклятие! Потеря большой шмотки',
 'Curse! Lose a Small Item':'Проклятие! Потеря мелкой шмотки',
 'Curse! Lose the Armor You Are Wearing':'Проклятие! Потеря броника',
 'Curse! Lose the Footgear You Are Wearing':'Проклятие! Потеря обувки',
 'Curse! Lose the Headgear You Are Wearing':'Проклятие! Потеря головняка',
 'Curse! Lose Your Class':'Проклятие! Потеря класса',
 'Curse! Lose Your Race':'Проклятие! Потеря расы',
 'Curse! Change Class':'Проклятие! Смена класса',
 'Curse! Change Race':'Проклятие! Смена расы',
 'Curse! Change Sex':'Проклятие! Смена пола',
 'Curse! Chicken on Your Head':'Проклятие! Курица на голове',
 'Curse! Malign Mirror':'Проклятие! Коварное зеркало',
 'Truly Obnoxious Curse!':'Неприлично страшное проклятие!',
 'Curse! Lose Two Cards':'Проклятие! Потеря двух карт',
 'Curse! Income Tax':'Проклятие! Подоходный налог'
};
for(const [en,name] of Object.entries(ruCurses))add(en,name,'curse',{icon:'curse',desc:CURSES[en].desc});
// Items with numeric bonuses and explicit restrictions. Complex treasures are
// added only after their separate actions exist, never as generic +N cards.
const gear=[
 ['Bad-Ass Bandana','Крутая бандана',3,'head',400,{requires:['Human']}],
 ['Boots of Running Really Fast','Сапоги очень быстрого бега',0,'feet',400,{runAway:2}],
 ['Bow with Ribbons','Бантиковый лук',4,'hand',800,{hands:2,requires:['Elf']}],
 ['Broad Sword','Широкий меч',3,'hand',400,{sexOnly:'female'}],
 ['Buckler of Swashing','Щит лихого фехтовальщика',2,'hand',400,{}],
 ['Cheese Grater of Peace','Тёрка мира',3,'hand',600,{requires:['Cleric']}],
 ['Cloak of Obscurity','Плащ незаметности',4,'none',600,{requires:['Thief']}],
 ['Dagger of Treachery','Кинжал предательства',3,'hand',400,{requires:['Thief']}],
 ['Eleven-Foot Pole','Трёхметровый шест',1,'hand',200,{hands:2}],
 ['Flaming Armor','Пылающий броник',2,'body',600,{fire:true}],
 ["Gentleman's Club",'Дубина джентльмена',3,'hand',400,{sexOnly:'male'}],
 ['Hammer of Kneecapping','Молот коленодробления',4,'hand',600,{requires:['Dwarf']}],
 ['Helm of Courage','Шлем отваги',1,'head',200,{}],
 ['Huge Rock','Огромный камень',3,'hand',0,{hands:2,big:true}],
 ['Leather Armor','Кожаный броник',1,'body',200,{}],
 ['Mace of Sharpness','Острая булава',4,'hand',600,{requires:['Cleric']}],
 ['Mithril Armor','Мифриловый броник',3,'body',600,{big:true,forbids:['Wizard']}],
 ['Pantyhose of Giant Strength','Колготки великанской силы',3,'none',600,{forbids:['Warrior'],belowWaist:true}],
 ['Pointy Hat of Power','Остроконечная шляпа силы',3,'head',400,{requires:['Wizard']}],
 ['Rapier of Unfairness','Рапира нечестности',3,'hand',600,{requires:['Elf'],rulesSource:'https://munchkin.fandom.com/wiki/Rapier_of_Unfairness'}],
 ['Sandals of Protection','Сандалии защиты',0,'feet',700,{protectDoorCurses:true}],
 ['Limburger and Anchovy Sandwich','Сэндвич с сыром и анчоусами',3,'none',400,{requires:['Halfling']}],
 ['Shield of Ubiquity','Щит повсеместности',4,'hand',600,{big:true,requires:['Warrior']}],
 ['Short Wide Armor','Короткий широкий броник',3,'body',400,{requires:['Dwarf']}],
 ['Singing & Dancing Sword','Поющий и пляшущий меч',2,'none',400,{forbids:['Thief'],rulesSource:'https://munchkin.fandom.com/wiki/Singing_%26_Dancing_Sword'}],
 ['Slimy Armor','Склизкий броник',1,'body',200,{}],
 ['Spiky Knees','Колючие коленки',1,'none',200,{belowWaist:true}],
 ['Stepladder','Стремянка',3,'none',400,{big:true,requires:['Halfling']}],
 ['Swiss Army Polearm','Швейцарская алебарда',4,'hand',600,{big:true,hands:2,requires:['Human']}]
];
const identities={Human:'человек',Elf:'эльф',Dwarf:'дварф',Halfling:'хафлинг',Cleric:'клирик',Thief:'вор',Wizard:'волшебник',Warrior:'воин'};
for(const [en,name,bonus,slot,gold,extra] of gear){const parts=[`Бонус +${bonus}.`,slot==='hand'?`${extra.hands||1} рук.`:({head:'Головняк.',body:'Броня.',feet:'Обувка.',none:'Не занимает обычные слоты.'})[slot],extra.big?'Большая шмотка.':'',extra.requires?`Только ${extra.requires.map(x=>identities[x]).join(' / ')}.`:'',extra.forbids?`Недоступно: ${extra.forbids.map(x=>identities[x]).join(', ')}.`:'',extra.sexOnly?`Только для ${extra.sexOnly==='female'?'женского':'мужского'} персонажа.`:'',extra.runAway?`+${extra.runAway} к смывке.`:'',extra.protectDoorCurses?'Защищает от проклятий при вышибании двери; не от проклятий из чужой руки.':'',`${gold} золотых.`];add(en,name,'item',{bonus,slot,gold,hands:slot==='hand'?extra.hands||1:0,icon:({head:'helmet',body:'armor',feet:'boots'})[slot]||'sword',desc:parts.filter(Boolean).join(' '),...extra})}
add('Wishing Ring','Кольцо желания','special',{icon:'star',effect:'wishingRing',gold:500,isItem:true,deck:'treasures',desc:'Отмени одно проклятие до его разрешения или сними одно продолжающееся проклятие с любого игрока. Одноразовая шмотка.'});
for(const [en,name] of [
 ['1,000 Gold Pieces (GUAL)','1000 голдов'],
 ['Boil an Anthill (GUAL)','Заварить муравейник'],
 ['Bribe GM With Food (GUAL)','Подкупить мастера едой'],
 ['Convenient Addition Error (GUAL)','Удобная ошибка в подсчётах'],
 ['Invoke Obscure Rules (GUAL)','Сослаться на туманные правила'],
 ['Potion of General Studliness (GUAL)','Зелье всеобщей крутизны']
])add(en,name,'level',{icon:'star',desc:'Дай себе или другому живому игроку 1 уровень. Можно во время боя, но нельзя дать победный уровень.'});
for(const [en,name,delta,treasureDelta] of [
 ['Ancient','Древний',10,2],['Baby','Маленький',-5,-1],['Enraged','Разъярённый',5,1],['Humongous','Громадный',10,2],['Intelligent','Разумный',5,1]
])add(en,name,'enhancer',{icon:'curse',delta,treasureDelta,deck:'doors',desc:`${delta>0?'+':''}${delta} к силе выбранного монстра; ${treasureDelta>0?'+':''}${treasureDelta} сокровищ (не меньше одного). Работает и на его пару. Одноразовая дверь.`});
for(const [en,name,bonus,gold,extra] of [
 ['Cotion of Ponfusion','Путаница в бутылке',3,100,{}],
 ['Electric Radioactive Acid Potion','Электрорадиоактивное кислотное зелье',5,200,{}],
 ['Flaming Poison Potion','Зелье пылающего яда',3,100,{fire:true}],
 ['Freezing Explosive Potion','Зелье морозного взрыва',3,100,{}],
 ['Magic Missile','Волшебная ракета',5,300,{}],
 ['Nasty-Tasting Sports Drink','Отвратительный спортивный напиток',2,200,{}],
 ['Pretty Balloons','Красивые воздушные шарики',5,0,{}],
 ['Sleep Potion','Сонное зелье',2,100,{}],
 ['Yuppie Water','Эльфийская водичка',2,100,{perIdentity:'Elf',allowedMonsters:false}]
])add(en,name,'potion',{icon:'potion',bonus,gold,isItem:true,desc:extra.perIdentity?'В одном бою каждый эльф на стороне искателей получает +2. Не усиливает монстров. Одноразовая шмотка.':`+${bonus} одной из сторон боя. ${extra.fire?'Огненная атака. ':''}Одноразовая шмотка. ${gold} золотых.`,...extra});
add('Really Impressive Title','Действительно впечатляющий титул','title',{icon:'star',bonus:3,slot:'none',deck:'treasures',desc:'+3 к силе. Не шмотка: не занимает места и не продаётся. Можно разыграть во время боя.'});
add('Sneaky Bastard Sword','Подлый ублюдочный меч','item',{icon:'sword',bonus:2,slot:'hand',hands:1,gold:400,desc:'+2 к силе. Одна рука. 400 золотых.'});
add('Tuba of Charm','Чарующая дуда','item',{icon:'bird',bonus:0,slot:'hand',hands:1,big:true,gold:300,runAway:3,escapeTreasure:1,rulesSource:'https://hobbygames.ru/download/rules/munchkin-base-new-2026-rules.pdf',desc:'+3 к смывке. Если успешно смоешься из боя — возьми 1 сокровище, максимум один раз за ход. Одна рука, большая шмотка. 300 золотых.'});
add('Mate','Гадкая парочка','mate',{icon:'troll',deck:'doors',desc:'Добавь пару выбранному монстру: тот же монстр с его усилителями. Последующие усилители действуют на обоих. Удалять и смываться нужно от каждого отдельно.'});
add('Doppleganger','Двойник','special',{icon:'elf',effect:'doppleganger',isItem:true,gold:300,deck:'treasures',desc:'В своём одиночном бою удвой свою боевую силу. Двойник меняется вместе с тобой. Другого игрока в помощники взять нельзя. Одноразовая шмотка.'});
add('Whine at the GM (GUAL)','Поплакаться мастеру','level',{icon:'star',levelCondition:'notHighest',desc:'Дай 1 уровень игроку, который не является лидером по уровню и не делит первое место. Можно во время боя; максимум до девятого.'});
add('Mutilate the Bodies (GUAL)','Поглумиться над телами','level',{icon:'star',levelCondition:'afterCombat',desc:'Сразу после завершения любого боя дай себе или другому живому игроку 1 уровень, максимум до девятого.'});
add('Kill the Hireling (GUAL)','Убить наёмника','level',{icon:'star',levelCondition:'hireling',desc:'Сбрось одного наёмника в игре, в том числе чужого, и дай 1 уровень себе или другому живому игроку. Если наёмников нет, сыграть нельзя. Максимум до девятого.'});
add('Steal a Level','Украсть уровень','special',{icon:'star',effect:'stealLevel',deck:'treasures',desc:'Выбери другого живого игрока выше первого уровня: он теряет 1 уровень, ты получаешь 1. Нельзя получить победный уровень.'});

add('Out to Lunch','Ушли на обед','special',{icon:'chest',effect:'outToLunch',deck:'doors',desc:'В любом бою сбрось всех монстров. Главный боец получает 2 сокровища вместо обычных наград. Уровни не даются.'});
add('Magic Lamp','Волшебная лампа','special',{icon:'potion',effect:'magicLamp',isItem:true,gold:500,desc:'Только в своём бою: убери одного монстра без уровня. Его сокровища получаешь, только если он был единственным монстром. Одноразовая шмотка.'});
add('Pollymorph Potion','Зелье попугая','special',{icon:'bird',effect:'pollymorph',isItem:true,gold:1300,desc:'Убери одного монстра без уровня. Его сокровища достанутся бойцам, если они победят всех остальных монстров. Одноразовая шмотка.'});
add('Friendship Potion','Зелье дружбы','special',{icon:'potion',effect:'friendship',isItem:true,gold:200,desc:'Сбрось всех монстров из боя без уровней и сокровищ. Главный боец может обыскать комнату, но не искать новые неприятности. Одноразовая шмотка.'});
add('Loaded Die','Читёрский кубик','special',{icon:'star',action:'loadedDie',isItem:true,gold:300,rulesSource:'https://munchkin.game/gameplay/errata/',desc:'После своего броска замени выпавшее число любым от 1 до 6. Чужой бросок менять нельзя. Одноразовая шмотка.'});
// Final base-card tranche. Rules are paraphrased; sources/edition notes in the ledger.
add('Cheat!','Чит!','special',{icon:'star',effect:'cheat',deck:'doors',desc:'Вне своего боя прикрепи к одной своей шмотке. Для неё игнорируются ограничения расы, класса, пола, рук, размера и слота. Чит сбрасывается вместе со шмоткой.'});
add('Divine Intervention','Божественное вмешательство','special',{icon:'star',effect:'divine',immediate:true,deck:'doors',desc:'Сразу при получении все клирики получают уровень, включая победный. При начальной раздаче можно сначала стать клириком из руки.'});
add('Help Me Out Here!','Помоги чем можешь!','special',{icon:'sword',effect:'helpMe',deck:'doors',desc:'В своём проигрываемом бою забери чужую шмотку из игры, если её немедленное использование превращает поражение в победу. Можно сбросить свои вещи, освобождая места.'});
add('Illusion','Иллюзия','special',{icon:'curse',effect:'illusionSwap',deck:'doors',desc:'Замени одного монстра вместе с его усилителями монстром из своей руки. Остальные монстры, включая пару, остаются в бою.'});
add('Hireling','Наёмничек','hireling',{icon:'elf',bonus:1,slot:'hireling',deck:'treasures',desc:'+1 к силе. Несёт одну шмотку, игнорируя её ограничения. При потере наёмника шмотка тоже теряется. Можно пожертвовать им для смывки от одного монстра.'});
add('Hoard!','Клад!','special',{icon:'chest',effect:'hoard',immediate:true,desc:'Сразу при получении возьми ещё 3 сокровища. Эту карту сбрось после получения новых карт.'});
add('Flask of Glue','Флакон клея','special',{icon:'potion',effect:'glue',isItem:true,gold:100,desc:'После успешной смывки заставь игрока бросить кубик заново, даже если он уходил автоматически. Одноразовая шмотка.'});
add('Instant Wall','Мгновенная стена','special',{icon:'door',action:'instantWall',isItem:true,gold:300,desc:'До броска: один или оба согласных бойца автоматически смываются из боя, от всех доступных монстров. Не заставляет убегать против воли. Одноразовая шмотка.'});
add('Invisibility Potion','Зелье невидимости','special',{icon:'potion',effect:'invisibility',isItem:true,gold:200,desc:'После неудачного броска смывки автоматически уходишь от этого монстра. Не отменяет запрет смывки. Одноразовая шмотка.'});
add('Kneepads of Allure','Наколенники развода','item',{icon:'boots',bonus:0,slot:'none',gold:600,forbids:['Cleric'],forceHelp:true,desc:'Кроме клирика. В проигрываемом бою можно заставить игрока более высокого уровня помочь бесплатно. Нельзя принудить к бою за свой победный уровень.'});
add('Potion of Halitosis','Зелье дурного дыхания','potion',{icon:'potion',bonus:2,isItem:true,gold:100,effect:'killNose',desc:'+2 любой стороне боя либо мгновенно убей Летающий нос. Награды за убитого носа даются после победы над всей группой. Одноразовая шмотка.'});
add('Transferral Potion','Зелье передачи','special',{icon:'potion',effect:'transferCombat',isItem:true,gold:300,desc:'Передай весь бой другому живому игроку. Он решает бой и получает его последствия. Исходный игрок после этого может обыскать комнату.'});
add('Wand of Dowsing','Лозоходная палочка','special',{icon:'sword',effect:'dowsing',isItem:true,gold:1100,desc:'Возьми в руку одну карту из любого сброса. Можно в бою; сама палочка сбрасывается после извлечения карты. Мгновенные эффекты срабатывают сразу.'});
const finalBaseEffects=new Set(['cheat','divine','helpMe','illusionSwap','hoard','glue','invisibility','killNose','transferCombat','dowsing']);
for(const c of BASE_ADDITIONS)if(finalBaseEffects.has(c.effect)||['Hireling','Instant Wall','Kneepads of Allure'].includes(c.en)){c.rulesSource='https://munchkin.game/gameplay/faq/';c.rulesNote='Реализованы отдельный эффект и проверки взаимодействий. Различия редакций и непроверенные тексты отмечены в reference/rules/base-progress.md.'}
