import {assignBotProfiles} from './ai.js';
import {applyCardRules,characterPower} from './card-effects.js';
import {has,handLimit,traitBonus,TRAITS} from './traits.js';
import {shuffle,draw,discard,deal,takeTreasure,deckOf} from './decks.js';
export {has,handLimit,TRAITS} from './traits.js';
export {draw,discard,deal,deckOf} from './decks.js';
export {abilityOptions,useAbility,combatStrength} from './abilities.js';
import {combatStrength} from './abilities.js';
import {combatMonsters,monsterPower,combatRewards} from './combat.js';
export {combatMonsters,monsterPower,combatRewards,startCombat,wanderingOptions,addWanderingMonster,interfereWithEnhancer,beginReactions,reactingPlayer,passReaction,runAway,runAwayInteractive,interfereWithPotion} from './combat.js';
import {equipCard} from './equipment.js';
import {EXTRA_SETS,EXTRA_CARDS} from './catalog.js';
export {equipPlan,identityLimit,gearLayout,unequip} from './equipment.js';
export const SETS=[{id:'base',name:'Классический',sub:'Тот самый Манчкин',icon:'⚔',color:'orange'},{id:'axe',name:'Дикий топор',sub:'Манчкин 2 · Unnatural Axe',icon:'🪓',color:'green'},{id:'cleric',name:'Клирические ошибки',sub:'Манчкин 3 · Clerical Errors',icon:'✦',color:'purple'},...EXTRA_SETS];
export const DEFAULT_SETS=['base','axe','cleric'];
// Real card names; concise adapted effects and local artwork. Not full printed decks.
const c=(id,set,name,en,type,icon,extra={})=>({id,set,name,en,type,icon,...extra});
export const CARDS=[
c('plant','base','Плутониевый… цветок?','Potted Plant','monster','plant',{power:1,reward:1,joke:'Зато поливать больше не придётся.'}),
c('slime','base','Сочащаяся слизь','Drooling Slime','monster','slime',{power:1,reward:1,joke:'Кажется, это суп вчерашнего дня.'}),
c('rat','base','Крыс on a stick','Rat on a Stick','item','sword',{bonus:1,slot:'hand'}),
c('dragon','base','Плутониевый дракон','Plutonium Dragon','monster','dragon',{power:20,reward:5,levels:2,death:true,joke:'Радиационный фон — это его харизма.'}),
c('troll','base','Сетевой тролль','Net Troll','monster','troll',{power:10,reward:3,joke:'Уже написал, что ты неправильно играешь.'}),
c('boots','base','Башмаки могучего пенделя','Boots of Butt-Kicking','item','boots',{bonus:2,slot:'feet'}),
c('helmet','base','Рогатый шлем','Horny Helmet','item','helmet',{bonus:1,slot:'head'}),
c('napalm','base','Посох напалма','Staff of Napalm','item','sword',{bonus:5,slot:'hand'}),
c('saw','base','Бензопила кровавого расчленения','Chainsaw of Bloody Dismemberment','item','sword',{bonus:3,slot:'hand'}),
c('warrior','base','Воин','Warrior','class','helmet',{bonus:0,slot:'class',desc:'Побеждает и при равной силе.'}),
c('elf','base','Эльф','Elf','race','elf',{bonus:0,slot:'race',desc:'Получает уровень за помощь в победном бою.'}),
c('curse','base','Проклятие! Потеря уровня','Lose a Level','curse','curse',{desc:'Минус один уровень. Ниже первого не упадёшь.'}),
c('level','base','Получи уровень','Go Up a Level','level','star',{desc:'Поднимись на один уровень, но не до десятого.'}),
c('potion','base','Зелье идиотской храбрости','Potion of Idiotic Bravery','potion','potion',{bonus:2,desc:'+2 к силе в текущем бою. Одноразовое.'}),
c('hyd','axe','Гидрант','Hydrant','monster','troll',{power:9,reward:3,joke:'Пожарной безопасности тут не рады.'}),
c('tent','axe','Щупальцевый демон','Tentacle Demon','monster','tentacle',{power:12,reward:3,joke:'Объятия бесплатные. Терапия — нет.'}),
c('bear','axe','Плюшевый мишка','Teddy Bear','monster','troll',{power:5,reward:2,joke:'В детстве он казался поменьше.'}),
c('gnoll','axe','Травяной гнолл','Grassy Gnoll','monster','plant',{power:7,reward:2,joke:'Газон косит тебя.'}),
c('axe','axe','Дикий топор','Unnatural Axe','item','axe',{bonus:3,slot:'hand'}),
c('codpiece','axe','Шипастый гульфик','Spiked Codpiece','item','helmet',{bonus:2,slot:'body'}),
c('orc','axe','Орк','Orc','race','troll',{bonus:0,slot:'race',desc:'Зелёный — это состояние души.'}),
c('flight','axe','Зелье полёта','Potion of Flight','escape','potion',{desc:'Автоматическая смывка из боя без потерь.'}),
c('bird','cleric','Текиловая пересмешница','Tequila Mockingbird','monster','bird',{power:6,reward:2,joke:'Ещё по одной — и бросаем кубик.'}),
c('ass','cleric','Злобный осёл','Bad Ass','monster','troll',{power:11,reward:3,joke:'Упрямство — его основная характеристика.'}),
c('aunt','cleric','Тётушка Паладин','Auntie Paladin','monster','helmet',{power:18,reward:4,joke:'А когда уже нормальный класс выберешь?'}),
c('bikini','cleric','Кольчужное бикини','Chainmail Bikini','item','armor',{bonus:3,slot:'body'}),
c('stab','cleric','Протыкатор','Stab-A-Matic','item','sword',{bonus:4,slot:'hand'}),
c('gnome','cleric','Гном','Gnome','race','elf',{bonus:0,slot:'race',desc:'Маленький рост. Большие амбиции.'}),
c('bard','cleric','Бард','Bard','class','bird',{bonus:0,slot:'class',desc:'Музыкальное сопровождение сомнительных решений.'})];
CARDS.push(...EXTRA_CARDS);
for(const set of ['base','axe','cleric','munchkin-4-the-need-for-steed','munchkin-5-de-ranged','munchkin-7-cheat-with-both-hands','munchkin-9-jurassic-snark'])CARDS.push({id:`wandering-${set}`,set,name:'Бродячая тварь',en:'Wandering Monster',type:'wandering',icon:'door',desc:'В чужой бой: сыграй вместе с одним монстром из своей руки. Его сила и награды добавятся к остальным монстрам.'});
for(const c of CARDS)c.undead=c.type==='monster'&&(c.set==='munchkin-undead'||['Necrosaurus','Bone Dragon','The Lich King','Riga-Tortoise','John of the Dead','Zombie Santa','Ghast from the Past','Minor League Vampire','Sparkly Vampire','Corpse Giant'].includes(c.en));
for(const id of ['napalm','saw','axe'])CARDS.find(c=>c.id===id).hands=2;
// Russian names are descriptive translations, not a claim of official localization.
CARDS.find(c=>c.id==='plant').name='Горшечное растение';CARDS.find(c=>c.id==='rat').name='Крыса на палочке';
export {shuffle};
for(const c of CARDS){applyCardRules(c);if(c.slot==='hireling'){c.action='sacrificeHireling';c.desc=(c.desc||'Наёмник.')+' Можно пожертвовать для смывки от одного монстра.'}if(c.set==='munchkin-dragons'&&c.type==='monster'&&!c.fireDefeat)c.immuneFire=true;c.deck=deckOf(c);if(TRAITS[c.en])c.desc=TRAITS[c.en];if(c.power)c.printedPower=c.power}
export const power=characterPower;
export function makeGame(names,sets,mode){let uid=0;sets=[...new Set(['base',...sets.filter(id=>SETS.some(s=>s.id===id))])];const pool=CARDS.filter(c=>sets.includes(c.set));const copies=(arr,n)=>shuffle(Array.from({length:n},()=>arr).flat().map(c=>({...c,uid:++uid})));
const players=names.map((name,i)=>({name,level:1,hand:[],equipment:[],bot:mode==='bots'&&i>0,sex:i%2?'female':'male'}));assignBotProfiles(players);
const g={players,sets,mode,doors:copies(pool.filter(c=>c.deck==='doors'),5),treasures:copies(pool.filter(c=>c.deck==='treasures'),6),discards:{doors:[],treasures:[]},turn:0,round:1,phase:'door',monster:null,boost:0,helper:null,helpUsed:false,log:[{text:'Каждому: 4 двери + 4 сокровища. Первый уровень, человек, без класса. Дружба пока цела.',kind:'gold'}],uid,winner:null};players.forEach(p=>deal(g,p));return g}
export const equip=equipCard;
export function canWin(g){const strength=combatStrength(g),fighters=[g.players[g.turn],...(g.helper===null?[]:[g.players[g.helper]])];return strength>monsterPower(g)||(strength===monsterPower(g)&&fighters.some(p=>has(p,'Warrior')))}
export function win(g){const p=g.players[g.turn],rewards=combatRewards(g);let loot=rewards.treasures+(g.charmedLoot||0)+combatMonsters(g).reduce((n,m)=>n+(m.elfTreasure&&[p,...(g.helper===null?[]:[g.players[g.helper]])].some(x=>has(x,'Elf'))?m.elfTreasure:0),0);const quest=p.equipment.find(c=>c.type==='quest'),margin=combatStrength(g)-monsterPower(g);if(quest&&((quest.condition==='overkill'&&margin>=5)||(quest.condition==='gear'&&['head','body','feet','hand'].every(slot=>p.equipment.some(c=>c.slot===slot)))))loot++;
const awarded=loot;p.level=Math.min(10,p.level+rewards.levels+(has(p,'Orc')&&g.helper===null&&margin>10?1:0));if(g.helper!==null){const h=g.players[g.helper];if(!g.forcedHelper&&loot>0){takeTreasure(g,h,1);loot--}if(has(h,'Elf'))h.level=Math.min(10,h.level+combatMonsters(g).length)}takeTreasure(g,p,loot);discard(g,combatMonsters(g));g.phase='done';g.reaction=null;g.charmedLoot=0;if(p.level===10)g.winner=g.turn;else if(g.helper!==null&&g.players[g.helper].level===10)g.winner=g.helper;return awarded}
export function endTurn(g){const p=g.players[g.turn],lowest=Math.min(...g.players.map(p=>p.level)),recipients=g.players.filter((x,i)=>i!==g.turn&&x.level===lowest&&x.level<p.level);let n=0;while(p.hand.length>handLimit(p)){const card=p.hand.pop();if(recipients.length)recipients[n++%recipients.length].hand.push(card);else discard(g,card)}g.turn=(g.turn+1)%g.players.length;if(!g.turn)g.round++;g.phase='door';g.monster=null;g.monsters=[];g.reaction=null;g.boost=0;g.helper=null;g.helpUsed=false;g.forcedHelper=false;g.abilityUses={};g.halflingSale=false;g.lastDiscard=null;g.aiTheftUsed=false;g.saboteurs=[];g.revealedHands={};const next=g.players[g.turn];if(next.dead){deal(g,next);next.dead=false}}
export function upgradeSave(g){g.discards??={doors:[],treasures:[]};g.abilityUses??={};g.charmedLoot??=0;g.players.forEach((p,i)=>{p.sex??=i%2?'female':'male';if(p.bot&&!p.aiProfile)p.aiProfile='tactician';p.aiMemory??={}});const fighting=new Set(combatMonsters(g).map(c=>c.uid));for(const c of [...g.doors,...g.treasures,...g.discards.doors,...g.discards.treasures,...g.players.flatMap(p=>[...p.hand,...p.equipment]),...combatMonsters(g)]){const current=CARDS.find(x=>x.id===c.id);if(current){const adjustedPower=fighting.has(c.uid)&&c.type==='monster'?current.power+(c.power-(c.printedPower??c.power)):null;for(const key of ['bonus','hands','big','gold','requires','forbids','identityBonuses','sexBonuses','against','againstSex','soloBonus','badStuff','noPursuitBelow','neverPursues','elfTreasure','death','action','grantsBackstab','fire','immuneFire','fireDefeat','extraSteeds','runAway','noSteedEnhancers','darkSabotage','rulesStatus','rulesSource','rulesNote','desc','deck','undead','printedPower','type','slot','reward','levels']){if(current[key]!==undefined)c[key]=structuredClone(current[key]);else if(['requires','forbids','identityBonuses','sexBonuses','against','againstSex','badStuff','action'].includes(key))delete c[key]}if(current.type==='monster')c.power=adjustedPower??current.power}}return g}
