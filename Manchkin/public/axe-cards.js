import {AXE_REST} from './axe-rest-cards.js';
// First-edition Unnatural Axe, using the publisher's post-2010 card list.
// Blank customization cards are inventoried separately, not dealt as no-op cards.
export const AXE_SOURCE='https://munchkin.game/products/games/munchkin/munchkin-2-unnatural-axe/';
export const AXE_SHARED_NAMES=[
 'Cheat!','Cleric','Curse! Lose a Big Item','Curse! Lose a Small Item',
 'Dwarf','Elf','Half-Breed','Halfling','Super Munchkin','Thief','Warrior','Wizard',
 'Loaded Die','Wishing Ring'
];
export function appendAxeSharedCards(cards,copies){
 for(const en of AXE_SHARED_NAMES){
  if(cards.some(c=>c.set==='axe'&&c.en===en))continue;
  const base=cards.find(c=>c.set==='base'&&c.en===en);if(!base)throw Error('Missing shared base rule: '+en);
  cards.push({...structuredClone(base),id:'axe-copy-'+base.id,set:'axe',copies:copies.axe[en],membershipSource:AXE_SOURCE,sharedRuleFrom:base.id});
 }
}
export const AXE_ADDITIONS=[
 {id:'axe-contemplate-navel',en:'Contemplate Your Navel (GUAL)',name:'Созерцай свой пупок',type:'level',deck:'treasures',icon:'star',levelCondition:'navel',rulesStatus:'verified',rulesSource:'https://munchkin.game/gameplay/faq/changelog.html/',desc:'Дай 1 уровень. Можно вместо этого сбросить всю оставшуюся руку (минимум 3 карты), чтобы дать 2 уровня. Победный уровень не даёт.'},
 {id:'axe-tiny-hands',en:'Curse! Tiny Hands',name:'Проклятие! Крошечные ручки',type:'curse',deck:'doors',icon:'curse',rulesStatus:'verified',rulesSource:AXE_SOURCE,desc:'Нельзя носить шмотки, требующие больше одной руки. Такие вещи из игры сбрасываются. Чит или прикрепление к наёмнику сохраняют исключение. Действует до снятия проклятия.'},
 {id:'axe-find-map',en:'Find A Map',name:'Найди карту',type:'special',deck:'doors',icon:'door',effect:'peekDoors',rulesStatus:'partial',rulesSource:'https://www.woap.info/games_tournament/games_tournaments/Games/Munchkin/Munchkin%20Card%20Summary.pdf',rulesNote:'Порядок трёх дверей сверён по исследовательской таблице. Вид колоды подтверждён официальной поправкой 2010 года; фотография полного печатного текста ещё нужна.',desc:'Посмотри три верхние карты колоды дверей и верни в выбранном порядке. Карты не берутся в руку и их эффекты не разыгрываются.'}
].map(c=>({...c,set:'axe'}));
// Direct play-by-post transcriptions; retain partial status until a current
// printing is visually checked. Explicit restrictions are not guessed from art.
const gearSources={
 'Funny-Looking Sword':'https://forum.mafiascum.net/viewtopic.php?sid=4ac6ecca575cbb05e5efa12e02393831&t=11317',
 'Slug Thrower':'https://forum.mafiascum.net/viewtopic.php?f=63&t=14085',
 'Tweezers of Terror':'https://forum.mafiascum.net/viewtopic.php?f=63&start=375&t=11317',
 'Skull Helmet':'https://forum.mafiascum.net/viewtopic.php?f=63&start=375&t=11317',
 'Sword of Slaying Everything Except Squid':'https://forum.mafiascum.net/viewtopic.php?sid=4ac6ecca575cbb05e5efa12e02393831&t=11317'
};
for(const [en,name,bonus,slot,hands,gold,extra] of [
 ['Funny-Looking Sword','Странно выглядящий меч',4,'hand',1,600,{requires:['Orc']}],
 ['Slug Thrower','Слизнемёт',5,'hand',2,800,{requires:['Orc']}],
 ['Tweezers of Terror','Пинцет ужаса',3,'hand',1,400,{requires:['Elf']}],
 ['Skull Helmet','Черепной шлем',2,'head',0,400,{identityBonuses:[{identity:'Orc',bonus:2}]}],
 ['Sword of Slaying Everything Except Squid','Меч убийства всего, кроме кальмаров',4,'hand',1,800,{forceRunFrom:'Squidzilla',noBonusAgainst:'Squidzilla'}]
])AXE_ADDITIONS.push({id:'axe-'+en.toLowerCase().replace(/[^a-z0-9]+/g,'-'),en,name,set:'axe',type:'item',deck:'treasures',icon:slot==='head'?'helmet':'sword',bonus,slot,...(hands?{hands}:{}),gold,...extra,rulesStatus:'partial',rulesSource:gearSources[en],rulesNote:'Параметры и особенности реализованы по прямой транскрипции старого издания; сверка фотографии актуальной карты ещё требуется.',desc:`+${bonus} к силе. ${slot==='head'?'Головняк':hands===2?'Две руки':'Одна рука'}. ${extra.requires?'Только '+({Orc:'орку',Elf:'эльфу'}[extra.requires[0]])+'. ':extra.identityBonuses?'Для орка бонус +4. ':extra.forceRunFrom?'Против Кальмадзиллы бонус не действует; при его появлении сразу нужно смываться. ':''}${gold} золотых.`});
const leagueSource='https://forum.mafiascum.net/viewtopic.php?sid=64bac7b43c04706c5305c390d3185db7&t=12480';
AXE_ADDITIONS.push(
 {id:'axe-scary-false-teeth',en:'Scary False Teeth',name:'Жуткие вставные зубы',type:'item',icon:'troll',bonus:1,slot:'none',gold:200,rulesSource:gearSources['Skull Helmet'],desc:'+1 к силе. Не занимают слот снаряжения. 200 золотых.'},
 {id:'axe-familiar',en:'Familiar',name:'Фамильяр',type:'item',icon:'bird',bonus:3,slot:'none',gold:400,requires:['Wizard'],rulesSource:leagueSource,desc:'+3 к силе. Только волшебнику. Не занимает слот снаряжения. 400 золотых.'},
 {id:'axe-promise-gm',en:"Promise The GM You'll Stop Telling Him About Your Character (GUAL)",name:'Обещай мастеру больше не рассказывать о своём персонаже',type:'level',icon:'star',rulesSource:leagueSource,desc:'Дай 1 уровень любому игроку. Победный уровень не даёт.'},
 {id:'axe-mt-suit',en:'M.T. Suit',name:'Пустой костюм',type:'monster',icon:'troll',power:11,reward:3,levels:1,undead:true,againstAny:[{identities:['Warrior','Thief'],bonus:5}],badStuff:[{type:'levels',amount:3}],rulesSource:leagueSource,desc:'Нежить. +5 против воина или вора, однократно. Непотребство: потеряй 3 уровня.'},
 {id:'axe-cat-girl',en:'Cat Girl',name:'Девушка-кошка',type:'monster',icon:'troll',power:9,reward:3,levels:1,against:[{identity:'Orc',bonus:5}],badStuff:[{type:'loseCardsByDie',handOnly:true}],rulesSource:'https://bdm.unb.br/bitstream/10483/6723/6/2011_JuliaCamposMMaia.pdf',desc:'+5 против орков. Непотребство: брось кубик и сбрось столько карт из руки на свой выбор; если карт меньше, сбрось всю руку.'}
);
AXE_ADDITIONS.push(
 {id:'axe-raincoat',en:'Raincoat',name:'Дождевик',type:'item',icon:'armor',bonus:0,slot:'body',gold:100,overSlot:true,blockOutsidePotions:true,rulesSource:gearSources['Funny-Looking Sword'],desc:'Можно носить поверх другой брони. Посторонние не могут применять зелья в твоём бою; бойцы могут применять их на любую сторону. При потере основной брони теряется и дождевик. 100 золотых.'},
 {id:'axe-knight-light',en:'Knight Light',name:'Рыцарский фонарик',type:'item',icon:'helmet',bonus:2,slot:'head',gold:400,overSlot:true,rulesSource:gearSources['Skull Helmet'],desc:'+2 к силе. Можно носить поверх другого головняка. Если теряешь основной головняк, фонарик тоже теряется. 400 золотых.'},
 {id:'axe-fake-beard',en:'Fake Beard',name:'Фальшивая борода',type:'item',icon:'dwarf',bonus:0,slot:'none',gold:100,itemIdentity:'Dwarf',rulesSource:leagueSource,desc:'Позволяет пользоваться вещами только для дварфов. Монстры реагируют на тебя как на дварфа. Не даёт других способностей дварфа. 100 золотых.'},
 {id:'axe-baby-oil',en:'Baby Oil',name:'Детское масло',type:'escape',icon:'potion',isItem:true,gold:300,action:'babyOil',rulesSource:gearSources['Skull Helmet'],desc:'Автоматическая смывка одного или двух бойцов от всех монстров, даже если обычная смывка невозможна. За второго бойца — с его согласия. Одноразовое. 300 золотых.'}
);
AXE_ADDITIONS.push(...AXE_REST);
for(const c of AXE_ADDITIONS){c.set='axe';c.deck??=c.type==='monster'?'doors':'treasures';c.rulesStatus??='partial';c.rulesNote??='Эффект реализован по доступному печатному изображению или прямой транскрипции; сверка актуального издания остаётся в очереди.'}
