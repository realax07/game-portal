// Curated playable samples, checked against publisher-catalog.json. Numbers and
// effects are adapted for this local game; these are NOT complete printed sets.
export const EXTRA_SETS=[];
export const EXTRA_CARDS=[];
function set(id,name,icon,rows){
  const source=`https://munchkin.game/products/games/munchkin/${id}/`;
  EXTRA_SETS.push({id,name,sub:id.replace(/^munchkin-?/,'').replaceAll('-',' '),icon,color:EXTRA_SETS.length%2?'green':'purple',source});
  rows.trim().split('\n').forEach((row,i)=>{
    const [en,ru,type,value,slot]=row.split('|'),n=Number(value)||0;
    const c={id:`${id}-${i}`,set:id,en,name:ru,type,icon:'star',source,adapted:true};
    if(type==='monster')Object.assign(c,{power:n,reward:Math.min(5,1+Math.floor(n/5)),icon:/dragon|wyrm|hydra/i.test(en)?'dragon':/cat|bird|duck|bunny|fowl|unicorn/i.test(en)?'bird':'troll',joke:'Монстр требует пересмотра трудового договора.'});
    if(type==='item')Object.assign(c,{bonus:n,slot:slot||'hand',hands:slot==='hand2'?2:1,icon:({head:'helmet',body:'armor',feet:'boots',steed:'dragon',hireling:'elf','class-aura':'star','race-aura':'elf'})[slot]||'sword'});
    if(slot==='hand2')c.slot='hand';
    if(type==='class'||type==='race')Object.assign(c,{bonus:0,slot:type,icon:type==='class'?'helmet':'elf',desc:en==='Warrior'?'Побеждает и при равной силе.':en==='Elf'?'Получает уровень за помощь в победном бою.':'Дополнительная идентичность. Особые способности в этой адаптации не действуют.'});
    if(type==='multiclass'||type==='multirace')Object.assign(c,{slot:type==='multiclass'?'class-mod':'race-mod',limit:n,icon:'star',desc:`Разрешает до ${n===99?'любого числа разных':n} ${type==='multiclass'?'классов':'рас'}. Нужна хотя бы одна соответствующая карта.`});
    if(type==='curse')Object.assign(c,{icon:'curse',desc:'Адаптация: соперник теряет один уровень, минимум до первого.'});
    if(type==='level')Object.assign(c,{icon:'star',desc:'Получи один уровень, максимум до девятого.'});
    if(type==='potion')Object.assign(c,{icon:'potion',bonus:n,desc:`Адаптация: +${n} к своей силе в одном бою. Одноразовая карта.`});
    if(type==='escape')Object.assign(c,{icon:'potion',desc:'Адаптация: автоматическая смывка из текущего боя.'});
    if(type==='enhancer')Object.assign(c,{icon:'curse',delta:n,desc:`Адаптация: ${n>0?'+':''}${n} к силе текущего монстра${n>0?', +1 сокровище за победу':''}. Одноразовая карта.`});
    if(type==='dungeon')Object.assign(c,{icon:'door',delta:n,desc:`Подземелье-событие: ${n>0?'+':''}${n} к силе следующих монстров, минимум 1. Действует до смены подземелья.`});
    if(type==='quest')Object.assign(c,{icon:'chest',slot:'quest',condition:slot,desc:slot==='gear'?'Адаптация задания: +1 сокровище при победе с головняком, бронёй, обувкой и оружием.':'Адаптация задания: +1 сокровище при победе с перевесом не меньше 5. Одно активное задание.'});
    EXTRA_CARDS.push(c);
  });
}
// The two core identity modifiers are available without enabling extra sets.
EXTRA_CARDS.push(
 {id:'super-munchkin',set:'base',name:'Суперманчкин',en:'Super Munchkin',type:'multiclass',slot:'class-mod',limit:2,icon:'star',desc:'Можно иметь два разных класса. Сначала нужен хотя бы один класс.'},
 {id:'half-breed',set:'base',name:'Полукровка',en:'Half-Breed',type:'multirace',slot:'race-mod',limit:2,icon:'elf',desc:'Можно иметь две разные расы. Сначала нужна хотя бы одна раса.'},
 ...[['wizard','Волшебник','Wizard'],['cleric-class','Клирик','Cleric'],['thief','Вор','Thief']].map(([id,name,en])=>({id,set:'base',name,en,type:'class',slot:'class',bonus:0,icon:'helmet',desc:'Класс. Особая способность в этой адаптации не действует.'})),
 ...[['dwarf','Дварф','Dwarf'],['halfling','Хафлинг','Halfling']].map(([id,name,en])=>({id,set:'base',name,en,type:'race',slot:'race',bonus:0,icon:'elf',desc:'Раса. Особая способность в этой адаптации не действует.'}))
);
set('munchkin-4-the-need-for-steed','Манчкин 4 · Тяга к коняге','♞',`
Dragon Steed|Драконий скакун|item|4|steed
Tiger Steed|Тигриный скакун|item|3|steed
Warrior Hireling|Наёмник-воин|item|2|hireling
Bipolar Bear|Биполярный медведь|monster|8
Hairy Potter|Волосатый Поттер|monster|12
Budget Armor|Бюджетная броня|item|1|body
Trick Riding Boots|Сапоги для трюков|item|2|feet
`);
set('munchkin-5-de-ranged','Манчкин 5 · Следопуты','♣',`
Ranger|Следопыт|class
Poultrygeist|Птицегейст|monster|8
Telemarketer|Телемаркетолог|monster|12
The Brothers Grimm|Братья Гримм|monster|16
Invisible Helmet|Невидимый шлем|item|2|head
Spandex Chainmail|Эластичная кольчуга|item|3|body
Short Sword|Короткий меч|item|2|hand
`);
set('munchkin-6-demented-dungeons','Манчкин 6 · Безбашенные подземелья','▥',`
Dungeon of Feeble Foes|Подземелье хилых противников|dungeon|-2
Dungeon of Militant Monsters|Подземелье воинственных монстров|dungeon|3
Dungeon of Extra Effort|Подземелье лишних усилий|dungeon|2
`);
set('munchkin-6.5-terrible-tombs','Манчкин 6,5 · Ужасные гробницы','☷',`
Catacombs|Катакомбы|dungeon|2
Wight Club|Мертвецкий клуб|dungeon|3
The House of Cards|Карточный дом|dungeon|-1
`);
set('munchkin-7-cheat-with-both-hands','Манчкин 7 · Двуручный чит','✌',`
1/3-Breed|Третьекровка|multirace|3
Chimera|Химера|multirace|99
Ultra Munchkin|Ультраманчкин|multiclass|3
Super Duper Munchkin|Супер-пуперманчкин|multiclass|99
Game Store Manager|Менеджер игрового магазина|monster|15
Sock Puppet|Носочная марионетка|monster|3
Potion of Ridiculous Size|Зелье нелепого размера|potion|5
`);
set('munchkin-8-half-horse-will-travel','Манчкин 8 · В хвост и в гриву','♘',`
Centaur|Кентавр|race
Lizard Guy|Ящеролюд|race
Unicorn Steed|Единорог-скакун|item|4|steed
Phoenix Steed|Феникс-скакун|item|5|steed
Midgard Serpent|Мидгардский змей|monster|18
Scaly Armor|Чешуйчатая броня|item|3|body
Mammalskin Boots|Меховые сапоги|item|2|feet
`);
set('munchkin-9-jurassic-snark','Манчкин 9 · Юрский стёб','♜',`
Tinysaurus Rex|Крошкозавр Рекс|monster|2
Velocirapper|Велоци-рэпер|monster|10
Necrosaurus|Некрозавр|monster|16
Bronto Steed|Бронто-скакун|item|3|steed
Dino Hireling|Дино-наёмник|item|2|hireling
Stego Armor|Стегоброня|item|3|body
Dino Tooth Dagger|Кинжал из динозуба|item|2|hand
`);
set('munchkin-the-guild','Гильдия','♟',`
The Kevinator|Кевинатор|monster|12
Zaboo's Mom|Мама Забу|monster|16
Munchkin Armor|Манчкинская броня|item|3|body
Pep Talk From Your Avatar (GUAL)|Мотивация от аватара|level
`);
set('munchkin-skullkickers','Пинатели черепов','☠',`
Ape With Horns|Рогатая обезьяна|monster|8
Corpse Giant|Трупный великан|monster|15
Axes of Evil|Топоры зла|item|4|hand2
Justice Pie|Пирог правосудия|potion|3
`);
set('munchkin-penny-arcade','Penny Arcade','▣',`
Deep Crow|Глубинный ворон|monster|14
Laser Squid Nemesis|Лазерный кальмар-злодей|monster|18
Hat of the Hotstepper|Шляпа горячего танцора|item|2|head
Inferior Boots|Так себе сапоги|item|1|feet
`);
set('munchkin-fairy-dust','Волшебная пыльца','✧',`
Sparkly Good Fairy|Сияющая добрая фея|monster|10
Pixie Potion|Зелье пикси|potion|3
Sparkler|Бенгальский огонь|potion|2
`);
set('munchkinomicon','Манчкиномикон','▤',`
Munchkinomicon|Манчкиномикон|item|3|hand
Eldritch Cleaver|Потусторонний тесак|potion|4
Power Through Fear|Сила страха|potion|3
`);
set('munchkin-monster-enhancers','Усилители монстров','↗',`
Invisible|Невидимый|enhancer|5
Lethal|Смертоносный|enhancer|10
Curse! Warranty Expires!|Проклятие! Гарантия истекла|curse
`);
set('munchkin-reloaded','Перезагрузка','↻',`
Master|Мастер|item|2|class-aura
Dark|Тёмный|item|2|race-aura
Reloaded Die|Перезаряженный кубик|potion|3
`);
set('munchkin-gets-promoted','Рекламная пауза','↑',`
John of the Dead|Джон мёртвых|monster|8
Zombie Santa|Зомби-Санта|monster|14
Ranger Hireling|Наёмник-следопыт|item|2|hireling
Get Promoted|Получи повышение|level
`);
set('munchkin-gets-promoted-2','Рекламная пауза 2','⇈',`
Book Wyrm|Книжный змей|monster|9
Angry Bards|Злые барды|monster|12
Club of Fighting|Бойцовская дубинка|item|3|hand
Go Up a Level|Получи уровень|level
`);
set('munchkin-easter-eggs','Пасхальные яйца','◒',`
Little Bunny 'Thulhu|Крольчонок Ктулху|monster|16
Quantum Lepus|Квантовый заяц|monster|8
Bunny Ears|Заячьи ушки|item|1|head
Bunny Slippers|Заячьи тапочки|item|2|feet
`);
set('munchkin-dragons','Драконы','♨',`
Hydrogen Dragon|Водородный дракон|monster|18
Dragon Queen|Королева драконов|monster|20
Magic Dragon|Волшебный дракон|monster|12
Your Feet Are Dragon|Драконьи ноги|item|3|feet
`);
set('munchkin-dragons-trike','Драконий трёхколёсник','♧',`
Bone Dragon|Костяной дракон|monster|16
Double Dragon|Двойной дракон|monster|20
Dragon Scale Armor|Доспех из драконьей чешуи|item|4|body
Dragon's Trike|Драконий трёхколёсник|item|3|steed
`);
set('munchkin-tricky-treats','Сладость или гадость','◈',`
Sparkly Vampire|Блестящий вампир|monster|10
Teen Werewolf|Подросток-оборотень|monster|8
Favorite Machete|Любимое мачете|item|3|hand
Helmet of Overprotection|Шлем гиперопеки|item|3|head
`);
set('munchkin-princesses','Принцессы','♕',`
Prince Charmless|Непрекрасный принц|monster|10
The Eighth Dwarf|Восьмой гном|monster|8
Glass Sneakers|Хрустальные кроссовки|item|2|feet
Tiara of Blinding|Ослепляющая тиара|item|3|head
`);
set('munchkin-love-shark-baby','Любовь и акулы','♡',`
Love Shark|Любовная акула|monster|12
Romanticore|Романтикора|monster|16
Amour Armour|Любовные латы|item|3|body
Cupid's Bow|Лук Купидона|item|3|hand2
`);
set('munchkin-kobolds-ate-my-baby','Кобольды съели моего младенца','♣',`
King Torg|Король Торг|monster|18
Chicken With Attitude|Курица с характером|monster|6
Beer Barrel Armor|Доспех из пивной бочки|item|3|body
Iron Skillet|Чугунная сковорода|item|2|hand
`);
set('munchkin-undead','Нежить','☠',`
Hampire|Хомпир|monster|6
Ghast from the Past|Призрак прошлого|monster|12
Hireling: Buster|Наёмник: Бастер|item|2|hireling
Death Mints|Мятные конфеты смерти|potion|3
`);
set('munchkin-kittens','Котики','♧',`
Great Cathulhu|Великий Котулху|monster|20
Crazy Cat Lady|Безумная кошатница|monster|14
Munchkin Cat|Кот-манчкин|monster|3
Catapult|Котапульта|item|4|hand2
Kitten Mittens|Котячьи варежки|item|2|hand
`);
set('munchkin-puppies','Собачки','♧',`
Doge|Доге|monster|6
Dogs of War|Псы войны|monster|15
Junkyard Dog|Дворовый пёс|monster|10
Aviator's Cap|Шлем авиатора|item|2|head
Bone of Contention|Кость раздора|item|3|hand
`);
set('munchkin-hipsters','Хипстеры','⌘',`
Indie Band|Инди-группа|monster|8
Lumberjerk|Дровосек-позёр|monster|12
Knit Cap|Вязаная шапочка|item|1|head
Skinny Denim Jeans|Узкие джинсы|item|2|body
Organic Health Potion|Органическое зелье здоровья|potion|3
`);
set('munchkin-knights','Рыцари','♞',`
Lance-A-Lot|Многокопейный рыцарь|monster|12
Fort Knight|Форт-рыцарь|monster|10
Sir Acha|Сэр Ача|monster|8
Knight Cap|Рыцарский колпак|item|2|head
`);
set('munchkin-marked-for-death','Метка смерти','☒',`
Joan d'Orc|Жанна д’Орк|monster|12
Soap Golem|Мыльный голем|monster|6
Boots of Two-Stepping|Сапоги двойного шага|item|2|feet
Lawn Mower|Газонокосилка|item|4|hand2
`);
set('munchkin-curses','Проклятия','☠',`
Curse! All Thumbs|Проклятие! Руки-крюки|curse
Curse! Flat Feet|Проклятие! Плоскостопие|curse
Curse! Dug Too Deep!|Проклятие! Слишком глубоко копнул|curse
Curse-stacean|Проклятый ракообразный|monster|10
`);
set('munchkin-valentines','Валентинки','♥',`
Heartbreaker|Сердцеед|monster|10
ValenTINY|Крошка-валентинка|enhancer|-5
Love Potion #8 1/2|Любовное зелье № 8½|potion|3
Write a Poem|Напиши стихотворение|level
`);
set('munchkin-clowns','Клоуны','♧',`
B0-Z0|Б0-З0|monster|15
Clownfish|Рыба-клоун|monster|6
Mime Sweeper|Мимоискатель|monster|10
Big Red Nose|Большой красный нос|item|2|head
Big Red Shoes|Большие красные ботинки|item|3|feet
`);
set('munchkin-dragons-four-more','Драконы: ещё четверо','♨',`
Drake|Дрейк|monster|8
Gummy Wyrm|Мармеладный змей|monster|4
Pen Dragdon|Дракон Пендрагон|monster|16
Poof|Пуф|monster|12
`);
set('munchkin-halloween-pack','Хэллоуин','☽',`
Curse! Born Under a Full Moon|Проклятие! Родился в полнолуние|curse
Minor League Vampire|Вампир низшей лиги|monster|5
Bob For Apples (GUAL)|Лови яблоки|level
Hand-Me-Down Costume|Костюм с чужого плеча|item|1|body
`);
set('munchkin-cheats','Читы','✌',`
Cheetah|Чит-а-гепард|monster|8
The Lawgibbon|Законогиббон|monster|12
Curse! De-Cheated!|Проклятие! Читы отключены|curse
Quick Cheat!|Быстрый чит|potion|4
`);
set('munchkin-fowl-play','Птичий беспредел','♧',`
Dead Duck|Мёртвая утка|monster|8
Duck of Boom|Утка взрыва|monster|14
Turkey With Stuffing|Индейка с начинкой|monster|10
Molotov Cocktail|Коктейль Молотова|potion|4
`);
set('munchkin-the-red-dragon-inn','Таверна «Красный дракон»','♨',`
Pooky the Vicious|Злобный Пуки|monster|10
The Lich King|Король-лич|monster|18
Dragon Breath Ale|Эль «Дыхание дракона»|potion|4
Omni-Sight Goggles|Очки всевидения|item|2|head
`);
set('munchkin-side-quests','Побочные задания','☷',`
Overkill|Перебор силы|quest|0|overkill
Fully Equipped|Полная экипировка|quest|0|gear
`);
set('munchkin-party-pack','Вечеринка','✦',`
Party Crasher|Незваный гость|monster|10
Party Pooper|Обломщик вечеринки|monster|12
Party Hat|Праздничный колпак|item|1|head
Party Dress|Праздничное платье|item|2|body
Party Shoes|Праздничные туфли|item|2|feet
`);
set('munchkin-unicorns','Единороги','♘',`
The Least Unicorn|Самый маленький единорог|monster|2
Monoceratops|Моноцератопс|monster|12
Lunacorn|Лунокорог|monster|16
Budget Unicorn Costume|Бюджетный костюм единорога|item|2|body
Unicorn Milk|Молоко единорога|potion|3
`);
set('munchkin-knights-four-more','Рыцари: ещё четверо','♞',`
One Knight in Bangkok|Один рыцарь в Бангкоке|monster|12
Silent Knight|Тихий рыцарь|monster|8
Sir Plus|Сэр Плюс|monster|16
Weak Knight|Слабый рыцарь|monster|2
`);
set('munchkin-something-fishy','Что-то рыбное','≋',`
Baby Shark|Акулёнок|monster|3
Sharkthulhu|Акултулху|monster|20
Marlin Brando|Марлин Брандо|monster|12
Scale Armor|Чешуйная броня|item|3|body
Spear Gun|Подводное ружьё|item|4|hand2
`);
set('munchkin-black-friday','Чёрная пятница','▣',`
Bargain Hunter|Охотник за скидками|monster|10
Curse! No Parking Place|Проклятие! Парковки нет|curse
Super Exclusive Promo|Суперэксклюзивная промка|potion|4
`);
set('munchkin-enhancers','Усиления','↗',`
Killer|Убийственный|enhancer|5
Underpowered|Слабоватый|enhancer|-5
Terrifyingly|Ужасающе|enhancer|10
Curse! De-hanced|Проклятие! Разусиление|curse
`);
set('munchkin-bosses','Боссы','♛',`
The Biggest Bad|Самое большое зло|enhancer|10
Weak Sauce Boss|Жиденький босс|enhancer|-5
Your Genetically Enhanced Clone|Твой генетически улучшенный клон|enhancer|5
`);
set('munchkin-petting-zoo','Контактный зоопарк','♣',`
Goat of All Time|Величайший козёл|monster|18
Attack Squirrel|Атакующая белка|monster|4
Guard Giraffe|Жираф-охранник|monster|12
Giant Tortoise Steed|Гигантская черепаха-скакун|item|3|steed
Indestructible Overalls|Неразрушимый комбинезон|item|3|body
`);
// Newer products without a separate published list: names below are cited in
// their publisher's product descriptions; source URLs are retained per card.
set('munchkin-10-time-warp','Манчкин 10 · Искривление времени','◷',`
Cleopatra|Клеопатра|monster|14
Pet Roc|Домашняя птица Рух|monster|12
Lucrezia Borgia|Лукреция Борджиа|monster|16
Mrs. O’Leary’s Cow|Корова миссис О’Лири|monster|10
Archimedes’ Screw|Архимедов винт|item|3|hand
Philosopher’s Stone|Философский камень|item|4|hand
Ming Vase|Ваза Мин|item|2|hand
`);
set('munchkin-not-my-monkeys','Не мои обезьяны','♧',`
Amazon Primate|Амазонский примат|monster|12
Baboom|Ба-бум|monster|16
Monkey Suit|Обезьяний костюм|item|2|body
`);
set('munchkin-warm-fuzzies','Тёплые пушистики','♣',`
Dust Bunnies|Пылевые кролики|monster|4
Pawsonal Trainer|Лапичный тренер|monster|10
Wolpertinger|Вольпертингер|monster|16
Bunchucks|Крольчаки|item|3|hand2
Fur Cloak|Меховой плащ|item|2|body
`);
set('munchkin-dead-and-deader','Мёртвые и ещё мертвее','☠',`
Talismantle|Талисмантия|item|3|body
Hex-Ray Specs|Очки проклятого зрения|item|2|head
Ectoplasma Rifle|Эктоплазменная винтовка|item|4|hand2
`);
set('munchkin-taken-for-granite','Принять за гранитное','▣',`
Sock Golem|Носочный голем|monster|5
Calcium Golem|Кальциевый голем|monster|10
Frost Golem|Морозный голем|monster|16
Hard Hat|Защитная каска|item|2|head
Automatic Chisel|Автоматическая стамеска|item|3|hand
`);
set('munchkin-the-floor-is-larva','Пол — это личинки','♧',`
Bug|Насекомое|race
Bed Bug|Постельный клоп|monster|12
DeviAnt|Извращённый муравей|monster|10
Wasp Spray|Спрей от ос|potion|4
`);
set('munchkin-pony-excess','Избыток пони','♞',`
Centaur of Attention|Кентавр внимания|item|4|steed
Rocking Horse|Рок-лошадка|monster|12
Lucky Horseshoe|Счастливая подкова|potion|3
`);
set('munchkin-goats','Козлы','♧',`
Baphomet|Бафомет|monster|18
More Hair Coat|Пальто побородатее|item|3|body
`);
set('munchkin-turtle-carnage','Черепашья резня','♧',`
Napping Turtle|Дремлющая черепаха|monster|4
Riga-Tortoise|Мёртвая черепаха|monster|14
Hot Rock|Горячий камень|item|2|hand
`);
set('munchkin-druids','Друиды','♣',`
Druid|Друид|class
Night Shade|Ночная тень|monster|12
Death Cap|Шляпка смерти|item|3|head
`);
set('munchkin-squids','Кальмары','≋',`
Cuttle Bone|Кость каракатицы|item|3|hand
Nautilus Shelm|Наутилусовый шлем|item|3|head
Squid Pro Quo|Кальмар за услугу|potion|4
`);
set('munchkin-rats','Крысы','♣',`
Soc-Rat-es|Сокрыс|monster|12
Weapon of Mouse Destruction|Оружие мышиного поражения|item|4|hand2
Win A Rat Race|Выиграй крысиные бега|level
`);
set('munchkin-snakes','Змеи','〰',`
King Snake|Королевский змей|monster|14
Pie-thon|Пироговый питон|monster|8
Boa and Arrow|Удав и стрелы|item|3|hand2
Asp-rin|Аспирин от аспида|potion|3
`);
