export const PACKS = {
 base:{name:'Происхождение видов',short:'Базовая игра',icon:'gecko',color:'green',cards:84},
 flight:{name:'Время летать',short:'Время летать',icon:'feather',color:'blue',cards:42},
 continents:{name:'Континенты',short:'Континенты',icon:'elephant',color:'ochre',cards:42},
 gift:{name:'Вариации',short:'Подарочный набор',icon:'butterfly',color:'purple',cards:18},
 plants:{name:'Растения',short:'Растения',icon:'fern',color:'green',cards:72},
 fungi:{name:'Трава и грибы',short:'Трава и грибы',icon:'mushroom',color:'purple',cards:32},
 immune:{name:'Иммунитет',short:'Иммунитет',icon:'heart-organ',color:'rose',cards:12},
 cycle:{name:'Жизненный цикл',short:'Жизненный цикл',icon:'butterfly',color:'ochre',cards:16}
};
const rows = [
 ['carnivore','Хищник','wolf-head','attack',1,'base','Вместо красной еды атакует другое животное. Успех приносит 2 синие фишки. Одна атака за ход; нельзя сочетать с падальщиком.'],
 ['fat','Жировой запас','squirrel','food',0,'base','Каждая копия хранит одну жёлтую фишку. Сытое животное запасает полученную еду; жир сохраняется между ходами и может стать синей едой.'],
 ['swimming','Водоплавающее','sea-turtle','defense',0,'base','Атака возможна только между двумя водоплавающими или двумя сухопутными животными. С Континентами отправляет в Океан и сбрасывается.'],
 ['large','Большой','elephant','defense',1,'base','Атаковать это животное может только большой хищник. Потребность в еде увеличена на 1.'],
 ['fast','Быстрое','rabbit','defense',0,'base','При атаке бросается кубик: 4–6 спасают животное. Бросок обязателен, даже при атаке своего животного.'],
 ['poison','Ядовитое','poison-bottle','defense',0,'base','Съевший животное хищник погибает в фазу вымирания. Отброшенный хвост не отравляет.'],
 ['camouflage','Камуфляж','chameleon-glyph','defense',0,'base','Защищает от атаки хищников без острого зрения.'],
 ['vision','Острое зрение','eye-target','attack',0,'base','Позволяет хищнику атаковать камуфлированную добычу.'],
 ['burrowing','Норное','rabbit','defense',0,'base','Накормленное животное нельзя атаковать. Непреобразованный жир сам по себе не даёт сытость.'],
 ['tail','Отбрасывание хвоста','gecko','defense',0,'base','В ответ на атаку сбрасывает выбранное свойство, кроме несбрасываемого. Животное живёт, хищник получает 1 синюю еду.'],
 ['mimicry','Мимикрия','butterfly','defense',0,'base','Первую атаку за ход перенаправляет на другое своё животное, доступное этому хищнику. Владелец выбирает жертву.'],
 ['scavenger','Падальщик','fishbone','food',0,'base','После успешного поедания 1 синюю еду получает один падальщик: сначала у владельца хищника, затем по кругу. Несовместим с хищником.'],
 ['parasite','Паразит','snake','negative',2,'base','Играется только на чужое животное. Увеличивает потребность в еде на 2. Можно сбросить при отбрасывании хвоста.'],
 ['piracy','Пиратство','crab','food',0,'base','Раз за ход крадёт 1 красную или синюю еду у ненакормленного животного. Дополнительное действие в свою очередь питания.'],
 ['communication','Взаимодействие','bird-twitter','pair',0,'base','Связь двух своих животных: когда одно получает красную еду, второе берёт красную из той же кормовой базы. Каждая связь срабатывает один раз в очередь.'],
 ['cooperation','Сотрудничество','butterfly','pair',0,'base','Когда одно животное пары получает красную или синюю еду, второе получает 1 синюю. Каждая связь срабатывает один раз в очередь.'],
 ['symbiosis','Симбиоз','fern','pair',0,'base','Первое выбранное животное — симбионт. Второе защищено от хищников, пока симбионт жив, и может есть только после насыщения симбионта.'],
 ['hibernation','Спячка','polar-bear','food',0,'base','Считает животное накормленным. Не работает два хода подряд и в последний ход. В спячке нельзя получать еду, в том числе запасать жир.'],
 ['grazing','Топотун','deer-head','food',0,'base','Дополнительно в каждую свою очередь питания уничтожает одну красную фишку в своей локации.'],
 ['flight','Полёт','feather','defense',0,'flight','Хищник не может атаковать, если у него столько же или больше свойств, чем у жертвы. С Континентами 1–2 свойства позволяют перелетать между материками.'],
 ['intellect','Интеллект','brain','attack',0,'flight','Один раз за ход позволяет игнорировать одно выбранное свойство жертвы до конца хода. Не отменяет удильщика и убежища.'],
 ['viviparous','Живорождение','heart-organ','food',1,'flight','Став накормленным, рождает животное с верха колоды. Новорождённое уже накормлено и появляется в локации родителя.'],
 ['ambush','Засада','saber-toothed-cat-head','attack',0,'flight','Хищник может атаковать вне очереди животное, берущее красную еду. При успехе еда остаётся на месте; нора и раковина не защищают.'],
 ['shell','Раковина','snail','defense',0,'flight','При атаке можно закрыться до конца хода: нельзя получать еду, кроме преобразования жира. После смерти раковина остаётся на столе и может быть занята.'],
 ['ink','Чернильное облако','squid','defense',0,'flight','Один раз за ход отменяет атаку. Хищник сможет повторить её в свою следующую очередь этого хода.'],
 ['metamorphosis','Метаморфоза','butterfly','food',0,'flight','Вместо основной еды сбрасывает выбранное свойство без прибавки к потребности и получает 1 синюю еду. Можно сбросить саму метаморфозу.'],
 ['specialA','Специализация A','hummingbird','food',0,'flight','Вместо основной еды получает 1 синюю, если нет другого животного с такой специализацией. С Континентами типы A/B объединяются внутри локации.'],
 ['specialB','Специализация B','fern','food',0,'flight','Аналог специализации A для другой экологической ниши. Одно животное не может иметь сразу оба типа.'],
 ['trematode','Трематода','snake','pair',1,'flight','Негативная парная карта на двух животных одного соперника; каждому +1 к еде. Нельзя сбросить свойством другой карты, кроме иммунитета.'],
 ['angler','Удильщик','seahorse','special',0,'flight','Играется как скрытое животное. При атаке простого животного владельца может вскрыться и атаковать напавшего, игнорируя одно свойство.'],
 ['migration','Миграция','bird-twitter','food',0,'continents','Вместо еды перемещает животных между территориями раз за ход. Можно переместить несколько животных. Межтерриториальные связи сбрасываются.'],
 ['sucker','Прилипала','fish-scales','food',0,'continents','По желанию владельца следует за мигрирующим животным из той же локации, включая чужое. Самостоятельно не мигрирует.'],
 ['neoplasm','Неоплазия','mushroom','negative',0,'continents','На чужое животное: при определении еды отключает следующее непарное свойство по порядку. Когда отключать больше нечего, животное гибнет.'],
 ['regeneration','Регенерация','gecko','defense',0,'continents','Допускает ещё только одно свойство без прибавки к еде. После поедания свойства остаются; животное восстанавливается из руки или колоды, без добора за него.'],
 ['recombination','Рекомбинация','dna1','pair',0,'continents','Раз за ход два своих связанных животных обмениваются выбранными непарными свойствами. Дубликат сбрасывается; использованные способности не обновляются.'],
 ['herding','Стадность','deer-head','defense',0,'continents','Защищает от атаки, если животных со стадностью в локации больше, чем всех хищников в ней.'],
 ['cnidocytes','Стрекательные клетки','squid','defense',0,'continents','Парализует атаковавшего хищника до следующего хода, даже при неудачной атаке. Все его свойства отключаются; потребность становится равна 1.'],
 ['edificator','Эдификатор','fern','food',0,'continents','В начале питания добавляет 2 красные фишки в кормовую базу своей локации.'],
 ['shy','Пугливое','rabbit','defense',0,'gift','После первой атаки в этом ходу больше не может быть атаковано. Первую атаку само по себе не отменяет.'],
 ['rstrategy','R-стратегия','frog','food',0,'gift','Можно играть на любое животное. Вместо карты за него владелец получает двух новых животных в начале следующего хода.'],
 ['warm','Теплокровность','heart-organ','food',2,'gift','В каждую свою очередь питания дополнительно берёт красную еду независимо от основного действия. Потребность +2.'],
 ['immune','Иммунитет','heart-organ','defense',1,'immune','Сбрасывает паразита, трематоду и неоплазию и запрещает их добавление. Потребность в еде +1.'],
 ['horns','Рога','deer-head','defense',0,'immune','При любой атаке обязательный бросок кубика: на 5–6 хищник немедленно погибает, а жертва выживает.'],
 ['unstable','Геномная нестабильность','dna1','negative',0,'immune','На чужое животное. Случайная карта из руки владельца становится новым свойством; если руки нет, сбрасывается свойство.'],
 ['spores','Споры','mushroom','food',0,'cycle','При голодной смерти в вымирание превращает все свои свойства в накормленных животных. Они не дают добора в этот ход. В последний ход не действует.'],
 ['cyst','Циста','snail','special',1,'cycle','Играется только как животное. При поедании превращается в свойство хищника; в вымирание циста становится новым накормленным животным. Потребность +1.'],
 ['mammal','Млекопитающее','elephant','food',0,'cycle','Каждый раз, получая красную или синюю еду, передаёт 1 синюю одному своему животному без свойств.'],
 ['anxious','Тревожное','rabbit','defense',0,'cycle','При атаке хищника получает 1 синюю еду.']
];
export const TRAITS=Object.fromEntries(rows.map(([id,name,icon,type,food,pack,description])=>[id,{id,name,icon,type,food,pack,description}]));
export const BASE_DECK=[['mimicry',null,4],['swimming',null,8],['poison',null,4],['fast',null,4],['piracy',null,4],['tail',null,4],['scavenger',null,4],['symbiosis',null,4],['parasite','carnivore',4],['parasite','fat',4],['large','carnivore',4],['large','fat',4],['communication','carnivore',4],['cooperation','carnivore',4],['cooperation','fat',4],['burrowing','fat',4],['camouflage','fat',4],['vision','fat',4],['grazing','fat',4],['hibernation','carnivore',4]];
// The additional pack collation is explicit, and independently auditable in the atlas.
export const DECKS={base:BASE_DECK,
 flight:[['flight','carnivore',2],['flight','specialA',2],['flight','specialB',2],['intellect','fat',2],['intellect','specialA',2],['ambush','specialB',2],['ambush','swimming',2],['angler',null,4],['ink',null,4],['shell',null,4],['metamorphosis','carnivore',2],['metamorphosis','specialA',2],['viviparous','specialB',2],['viviparous','swimming',2],['trematode','cooperation',4],['trematode','communication',2],['trematode','fat',2]],
 continents:[['herding','swimming',2],['herding','cooperation',4],['herding','carnivore',2],['migration','carnivore',4],['migration','swimming',4],['sucker','swimming',2],['sucker','cooperation',2],['regeneration','cooperation',2],['regeneration','swimming',2],['regeneration','carnivore',2],['cnidocytes','swimming',2],['cnidocytes','communication',2],['recombination','carnivore',2],['recombination','swimming',2],['edificator','carnivore',2],['edificator','swimming',2],['neoplasm','swimming',2],['neoplasm','communication',2]],
 gift:[['rstrategy',null,6],['warm','swimming',3],['warm','fat',3],['shy','swimming',3],['shy','carnivore',3]],
 immune:[['immune',null,4],['horns','carnivore',4],['unstable',null,4]],
 cycle:[['spores',null,4],['cyst','carnivore',4],['mammal','fat',4],['anxious','swimming',4]]};
export const LOCATIONS={pangaea:'Пангея',laurasia:'Лавразия',gondwana:'Гондвана',ocean:'Океан'};
export const PHASES={lobby:'Ожидание игроков',development:'Развитие',resources:'Кормовая база',feeding:'Питание',extinction:'Вымирание',finished:'Итоги экспедиции'};
const plantRows=[
 ['aquatic','Водное','sea-turtle','burrowing','Только водоплавающие животные могут брать красную еду с этого растения.'],
 ['tree','Дерево','fern','carnivore','Еда доступна большим и летающим животным. Добавляет одно убежище.'],
 ['spiky','Колючее','plant-roots','cooperation','Добавляет три убежища. Их можно брать независимо от пищевых ограничений.'],
 ['root','Корнеплод','plant-roots','fat','Красную еду могут брать только норные животные.'],
 ['medicinal','Лекарственное','sprout','carnivore','Получившее красную еду животное становится сытым; все свойства отключаются до конца питания.'],
 ['honey','Медонос','butterfly','large','Получатель красной еды берёт случайную карту у выбранного соперника с большей рукой.'],
 ['mycorrhiza','Микориза','mushroom','swimming','Связывает растения: вся цепь выживает, если хотя бы на одном есть еда. Пустые выжившие получают 1 еду в конце роста.'],
 ['nutritious','Питательное','wheat','swimming','Красная еда даёт дополнительную синюю. Питаться могут также хищники.'],
 ['plantParasite','Растение-паразит','fern',null,'Создаёт растение на хозяине с 0 еды. Можно переносить еду с хозяина, кроме последней. Выживает пустым, но гибнет с хозяином.']
];
for(const [id,name,icon,alt,description] of plantRows)TRAITS[id]={id,name,icon,type:'plant',food:0,pack:'plants',plant:true,description};
DECKS.plants=plantRows.map(([id,,,alt])=>[id,alt,4]);
TRAITS.transparent={id:'transparent',name:'Прозрачное',icon:'butterfly',type:'defense',food:0,pack:'fungi',description:'Пока на животном нет красных и синих фишек, хищник не может его атаковать.'};
TRAITS.insectivore={id:'insectivore',name:'Насекомоядное',icon:'frog',type:'attack',food:0,pack:'fungi',description:'При поедании животного без действующих свойств хищник получает 1 синюю вместо 2 и может снова атаковать в следующую очередь.'};
DECKS.fungi=[['transparent',null,4],['insectivore',null,4]];
export const FLORA={
 toadstool:{name:'Бледная поганка',type:'mushroom',mark:'toxin',description:'Даёт метку Яд и сбрасывает паразитов. Без Антидота носитель погибнет в вымирание.'},
 mold:{name:'Плесневый гриб',type:'mushroom',mark:'antidote',description:'Антидот защищает от Яда и отравления ядовитой добычей.'},
 madness:{name:'Безумная шляпка',type:'mushroom',mark:'madness',description:'Следующую очередь питания за вас проводит сосед справа, не видя вашу руку.'},
 rage:{name:'Бешеный мухомор',type:'mushroom',mark:'rage',description:'Вместо следующей очереди принудительная атака: жертва погибает, но еды атакующий не получает.'},
 insight:{name:'Гриб прозрения',type:'mushroom',description:'Сбросьте руку. Посмотрите руку соперника, верх одной колоды или скрытую карту животного.'},
 wing:{name:'Окрыляющий гриб',type:'mushroom',description:'Сбросьте все парные свойства животного и получите дополнительную синюю еду.'},
 sleep:{name:'Сон-трава',type:'grass',mark:'sleep',description:'Отключает все свойства животного до конца хода. Потребность в еде становится равна 1.'},
 tryn:{name:'Трын-трава',type:'grass',mark:'tryn',description:'Предотвращает получение новых меток последствий.'},
 dope:{name:'Дурман-трава',type:'grass',mark:'dope',description:'Нападающий хищник может игнорировать одно свойство этого животного.'},
 peace:{name:'Улыбнись-трава',type:'grass',mark:'peace',description:'Запрещает животному нападать и использовать Пиратство.'},
 purify:{name:'Очистительная трава',type:'grass',description:'Убирает всю еду, кроме только что полученной красной, и все метки последствий.'},
 passion:{name:'Страстоцвет',type:'grass',description:'Превратите одно своё свойство, кроме паразита, в новое животное.'}
};
export const MARKS={toxin:'Яд',antidote:'Антидот',madness:'Безумие',rage:'Бешенство',sleep:'Сон',tryn:'Трынь',dope:'Дурь',peace:'Пацифизм'};
export const SOURCES=[
 {name:'Правила подарочного издания, 16 страниц',url:'https://igrrai.ru/image/catalog/Pravilniy%20igry/Evoluciya%20Podarochnoe/evo-rules-giftset-210x290-ru-16p_scr_0.pdf'},
 {name:'Время летать — правила дополнения',url:'https://tesera.ru/images/items/37809/rules_evo_addon_screen.pdf'},
 {name:'Континенты — правила, II редакция',url:'https://www.igromaster.com/files/evolution_continents_rules.pdf'},
 {name:'Растения — правила издателя',url:'https://hobbygames.ru/download/rules/evo-plant_rus.pdf'},
 {name:'Трава и грибы — правила',url:'https://hobbygames.ru/download/rules/pravila_sayt_compressed.pdf'},
 {name:'Иммунитет — карточки и пояснения',url:'https://tesera.ru/game/evolyutsiya-immunitet/'},
 {name:'Жизненный цикл — карточки и пояснения',url:'https://tesera.ru/game/evolyutsiya-zhiznenny-tsikl/'},
 {name:'Состав базовой колоды (84 карты)',url:'https://tesera.ru/images/items/507746/Состав%20базовой%20колоды%20Эволюции.pdf'},
 {name:'Иконки и авторы — Game-icons.net, CC BY 3.0',url:'https://game-icons.net/about.html'}
];
