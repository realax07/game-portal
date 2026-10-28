import {physicalCards} from '../public/immediate-cards.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CARDS,LEGACY_CARDS,SETS,makeGame,upgradeSave,startCombat,combatStrength,monsterPower,combatRewards,win,runAway,discard,canWin} from '../public/engine.js';
import {addMate,interfereWithEnhancer,useCombatPotion} from '../public/combat.js';
import {badStuff,itemUsable} from '../public/card-effects.js';
import {startCurse,cursePrompt,respondToCurse} from '../public/curses.js';
import {playLevelCard} from '../public/level-cards.js';
let uid=2e6;
const card=en=>{const c=CARDS.find(c=>c.en===en);assert.ok(c,en);return{...structuredClone(c),uid:++uid}};
const game=()=>{const g=makeGame(['A','B','C'],['base'],'hotseat');for(const p of g.players){p.hand=[];p.equipment=[];p.level=5}g.discards={doors:[],treasures:[]};delete g.pendingDivine;g.treasures=g.treasures.filter(c=>!c.immediate);return g};
const cards=physicalCards;

test('new decks use explicit printed multiplicities and never multiply entire pools',async()=>{
 for(const selection of [['base'],['base','axe','cleric'],SETS.map(s=>s.id)]){
  const g=makeGame(['A','B','C','D','E'],selection,'bots'),pool=cards(g);
  for(const c of CARDS.filter(c=>g.sets.includes(c.set)))assert.equal(pool.filter(x=>x.id===c.id).length,c.copies??1,c.en);
  assert.equal(pool.length,CARDS.filter(c=>g.sets.includes(c.set)).reduce((n,c)=>n+(c.copies??1),0));
  assert.ok(g.players.every(p=>p.lastDeal.doors===4&&p.lastDeal.treasures===4));assert.equal(g.catalogVersion,2);
 }
 const g=makeGame(['A'],['base'],'hotseat'),pool=cards(g);assert.equal(pool.filter(c=>c.en==='Cleric').length,3);assert.equal(pool.filter(c=>c.en==='Wishing Ring').length,2);assert.equal(pool.filter(c=>c.en==='Plutonium Dragon').length,1);
 assert.ok(!pool.some(c=>c.en==='Go Up a Level'));
});

test('old sample level cards remain playable in saves without rewriting UID or deck order',()=>{
 const g=game();delete g.catalogVersion;g.players[0].hand=[{...LEGACY_CARDS[0],uid:++uid}];const original=cards(g).map(c=>c.uid);const migrated=upgradeSave(JSON.parse(JSON.stringify(g)));assert.equal(migrated.catalogVersion,1);assert.deepEqual(cards(migrated).map(c=>c.uid),original);assert.ok(playLevelCard(migrated,0,migrated.players[0].hand[0].uid).ok);
});

test('monster enhancers modify rewards individually, support negative strength, and reset on discard',()=>{
 const g=game(),m=card('Potted Plant');startCombat(g,m);const ancient=card('Ancient'),baby=card('Baby');g.players[1].hand=[ancient,baby];
 assert.ok(interfereWithEnhancer(g,1,ancient.uid,m.uid).ok);assert.equal(monsterPower(g),11);assert.equal(combatRewards(g).treasures,3);
 assert.ok(interfereWithEnhancer(g,1,baby.uid,m.uid).ok);assert.equal(monsterPower(g),6);assert.equal(combatRewards(g).treasures,2);
 const saved=upgradeSave(JSON.parse(JSON.stringify(g)));assert.equal(saved.monster.reward,2);assert.equal(saved.monster.power,6);
 discard(g,g.monsters);const restored=g.discards.doors.find(c=>c.uid===m.uid);assert.equal(restored.power,1);assert.equal(restored.reward,1);
 const h=game(),plant=card('Potted Plant'),small=card('Baby');startCombat(h,plant);h.players[1].hand=[small];interfereWithEnhancer(h,1,small.uid,plant.uid);assert.equal(monsterPower(h),-4);assert.equal(combatRewards(h).treasures,1);
});

test('Mate copies a monster and mirrors past/future enhancers without inventing a discard card',()=>{
 const g=game(),m=card('Drooling Slime'),mate=card('Mate'),ancient=card('Ancient'),baby=card('Baby');startCombat(g,m);g.players[1].hand=[ancient,mate,baby];
 interfereWithEnhancer(g,1,ancient.uid,m.uid);assert.ok(addMate(g,1,mate.uid,m.uid).ok);assert.equal(g.monsters.length,2);assert.equal(monsterPower(g),22);assert.equal(combatRewards(g).treasures,6);
 interfereWithEnhancer(g,1,baby.uid,mate.uid);assert.deepEqual(g.monsters.map(c=>c.power),[6,6]);assert.equal(combatRewards(g).treasures,4);
 discard(g,g.monsters);assert.equal(g.discards.doors.filter(c=>c.en==='Mate').length,1);assert.equal(g.discards.doors.filter(c=>c.en==='Drooling Slime').length,1);assert.equal(g.discards.doors.find(c=>c.en==='Mate').uid,mate.uid);
});

test('Lame Goblin and Flying Frogs change escape odds; Crabs cannot be escaped on a six',()=>{
 const g=game();startCombat(g,card('Lame Goblin'));assert.equal(runAway(g,()=>4)[0].escaped,true);
 const h=game();startCombat(h,card('Flying Frogs'));assert.equal(runAway(h,()=>5)[0].escaped,false);assert.equal(h.players[0].level,3);
 const k=game();k.players[0].equipment=[card('Leather Armor'),card('Boots of Butt-Kicking'),card('Spiky Knees'),card('Horny Helmet')];startCombat(k,card('Crabs'));const r=runAway(k,()=>{throw Error('Crabs permit no escape roll')});assert.equal(r[0].escaped,false);assert.deepEqual(k.players[0].equipment.map(c=>c.en),['Horny Helmet']);
});

test('no-pursuit checks happen before escape-level losses, independently for each fighter',()=>{
 const g=game();g.players[0].level=3;g.players[1].level=4;startCombat(g,card('King Tut'));g.helper=1;const r=runAway(g,()=>6);assert.equal(r[0].automatic,true);assert.equal(g.players[0].level,3);assert.equal(r[1].automatic,false);assert.equal(g.players[1].level,2);
 const h=game();startCombat(h,card('Wight Brothers'));runAway(h,()=>1);assert.equal(h.players[0].level,1);
});

test('Gazebo evicts a helper and Ghoulfiends ignore positive bonuses without erasing hostile potions',()=>{
 const g=game();startCombat(g,card('Gazebo'));g.helper=1;combatStrength(g);assert.equal(g.helper,null);
 const h=game();h.players[0].equipment=[card('Staff of Napalm'),card('Wizard')];startCombat(h,card('Ghoulfiends'));
 const friendly=card('Magic Missile'),hostile=card('Potion of Idiotic Bravery');h.players[0].hand=[friendly];h.players[1].hand=[hostile];useCombatPotion(h,0,friendly.uid);useCombatPotion(h,1,hostile.uid,{side:'monsters'});assert.equal(combatStrength(h),5,'only levels count on the player side');assert.equal(monsterPower(h),10,'hostile +2 applies to the monsters');assert.equal(h.monster.undead,false);
});

test('Half-Breed shields racial disadvantages and a free race slot enables Human-only items',()=>{
 const g=game(),p=g.players[0];p.level=4;p.equipment=[card('Elf'),card('Half-Breed')];assert.equal(itemUsable(p,card('Swiss Army Polearm')),true);startCombat(g,card('Squidzilla'));assert.equal(monsterPower(g),18);assert.equal(runAway(g,()=>1)[0].automatic,true);
 const h=game();h.players[0].equipment=[card('Dwarf'),card('Halfling'),card('Half-Breed')];startCombat(h,card('Bigfoot'));assert.equal(monsterPower(h),15,'racial alternatives do not double the bonus');
});

test('Orc may replace a curse with one lost level, but never at level one',()=>{
 const g=game(),p=g.players[0];p.equipment=[card('Orc')];startCurse(g,card('Curse! Duck of Doom'),0);assert.equal(cursePrompt(g).kind,'orc');assert.equal(respondToCurse(g,{uid:'orc'}).done,true);assert.equal(p.level,4);
 p.level=1;startCurse(g,card('Curse! Duck of Doom'),0);const r=cursePrompt(g);assert.equal(r.done,true);assert.equal(p.level,1);
});

test('Orcs can kill on a bad die and Horror removes only Wizard instead of killing a multiclass wizard',()=>{
 const g=game();g.players[0].level=8;badStuff(g,g.players[0],card('3,872 Orcs'),{rollDie:()=>4});assert.equal(g.players[0].level,4);badStuff(g,g.players[0],card('3,872 Orcs'),{rollDie:()=>2});assert.equal(g.players[0].dead,true);
 const h=game(),p=h.players[0];p.equipment=[card('Wizard'),card('Warrior'),card('Super Munchkin')];badStuff(h,p,card('Unspeakably Awful Indescribable Horror'));assert.ok(!p.dead);assert.deepEqual(p.equipment.map(c=>c.en),['Warrior','Super Munchkin']);
});

test('Pukachu and a fire-defeated Chicken grant their distinct conditional extra levels',()=>{
 const g=game();g.players[0].level=7;startCombat(g,card('Pukachu'));assert.equal(combatRewards(g).levels,2);g.players[0].equipment=[card('Horny Helmet')];assert.equal(combatRewards(g).levels,1);
 const h=game();h.players[0].equipment=[card('Flaming Armor')];startCombat(h,card('Large Angry Chicken'));assert.equal(combatRewards(h).levels,2);win(h);assert.equal(h.players[0].level,7);
});

test('Yuppie Water benefits each fighting Elf, is blocked by each target’s mirror, and cannot buff monsters',()=>{
 const g=game();g.players[0].equipment=[card('Elf')];g.players[1].equipment=[card('Elf')];startCombat(g,card('Potted Plant'));g.helper=1;const water=card('Yuppie Water');g.players[2].hand=[water];const before=combatStrength(g);assert.equal(useCombatPotion(g,2,water.uid,{side:'monsters'}).ok,false);assert.equal(g.players[2].hand.length,1);assert.ok(useCombatPotion(g,2,water.uid).ok);assert.equal(combatStrength(g),before+4);
 startCurse(g,card('Curse! Malign Mirror'),0);cursePrompt(g);assert.equal(combatStrength(g),before+2);
});

test('Tuba awards at most one treasure per turn after successful flight from a group',()=>{
 const g=game(),p=g.players[0];p.equipment=[card('Tuba of Charm')];startCombat(g,card('Flying Frogs'));g.monsters.push(card('Lame Goblin'));runAway(g,()=>6);assert.equal(p.hand.length,1);
 startCombat(g,card('Lame Goblin'));runAway(g,()=>6);assert.equal(p.hand.length,1);g.round++;startCombat(g,card('Lame Goblin'));runAway(g,()=>6);assert.equal(p.hand.length,2);
});

test('real GUAL cards can change another fighter’s level in combat and cannot grant the winning level',()=>{
 const g=game();startCombat(g,card('Potted Plant'));const c=card('Bribe GM With Food (GUAL)');g.players[1].hand=[c];assert.ok(playLevelCard(g,1,c.uid,0).ok);assert.equal(g.players[0].level,6);
 const other=card('1,000 Gold Pieces (GUAL)');g.players[1].hand=[other];g.players[0].level=9;const before=JSON.stringify(g);assert.equal(playLevelCard(g,1,other.uid,0).ok,false);assert.equal(JSON.stringify(g),before);
});

test('Doppleganger tracks changing player strength, doubles backstabs, and does not double monster potions',async()=>{
 const {playSpecialCard}=await import('../public/special-cards.js');const g=game();g.players[0].equipment=[card('Warrior')];startCombat(g,card('Net Troll'));
 const d=card('Doppleganger'),pot=card('Magic Missile');g.players[0].hand=[d];g.players[1].hand=[pot];assert.ok(playSpecialCard(g,0,d.uid).ok);assert.equal(combatStrength(g),10);assert.equal(canWin(g),true);
 useCombatPotion(g,1,pot.uid,{side:'monsters'});assert.equal(combatStrength(g),10);assert.equal(monsterPower(g),15);assert.equal(canWin(g),false);
 g.players[0].level++;assert.equal(combatStrength(g),12);assert.equal(g.discards.treasures.length,0,'active one-shots must not be retrievable from discard yet');
 g.players[0].equipment.push(card('Staff of Napalm'),card('Wizard'));assert.equal(combatStrength(g),22);win(g);assert.equal(g.discards.treasures.filter(c=>c.uid===d.uid||c.uid===pot.uid).length,2);assert.equal(g.combatCards.length,0);
});

test('removing the last monster in a Mate group releases its shared enhancers exactly once',()=>{
 const g=game(),m=card('Drooling Slime'),mate=card('Mate'),boost=card('Ancient');startCombat(g,m);g.players[1].hand=[mate,boost];addMate(g,1,mate.uid,m.uid);interfereWithEnhancer(g,1,boost.uid,m.uid);
 assert.equal(g.discards.doors.length,0);discard(g,g.monsters[0]);assert.equal(g.discards.doors.some(c=>c.uid===boost.uid),false);discard(g,g.monsters[1]);assert.equal(g.discards.doors.filter(c=>c.uid===boost.uid).length,1);
});

test('an automatic escape is personal, cannot turn into a kill, and does not exempt the helper',async()=>{
 const {useTreasure}=await import('../public/card-effects.js');const g=game(),rat=card('Rat on a Stick');g.players[0].equipment=[rat];startCombat(g,card('Drooling Slime'));g.monsters.push(card('Net Troll'));g.helper=1;const before=g.players[0].level;assert.ok(useTreasure(g,0,rat.uid,g.monsters[0].uid).ok);assert.equal(canWin(g),false);assert.equal(win(g),0);let rolls=0;const r=runAway(g,()=>{rolls++;return 1});assert.equal(r.length,4);assert.equal(rolls,3);assert.equal(r.find(r=>r.actor===0).automatic,true);assert.ok(r.filter(r=>r.actor===1).every(r=>!r.automatic));assert.equal(g.players[0].level,before);assert.equal(g.phase,'done');
});

test('conditional level cards respect leaders, an actual combat, and a real hireling cost',async()=>{
 const {levelTargets}=await import('../public/level-cards.js');const g=game(),whine=card('Whine at the GM (GUAL)'),mutilate=card('Mutilate the Bodies (GUAL)'),kill=card('Kill the Hireling (GUAL)');g.players[0].hand=[whine,mutilate,kill];g.players[1].level=6;assert.deepEqual(levelTargets(g,0,whine),[0,2]);assert.equal(playLevelCard(g,0,mutilate.uid).ok,false);assert.equal(playLevelCard(g,0,kill.uid).ok,false);
 startCombat(g,card('Potted Plant'));win(g);assert.ok(playLevelCard(g,0,mutilate.uid,2).ok);g.players[1].equipment=[{uid:++uid,type:'item',slot:'hireling',bonus:1,name:'Наёмник',deck:'doors'}];const hireling=g.players[1].equipment[0];g.players[1].equipment.push({...card('Broad Sword'),hirelingUid:hireling.uid});assert.ok(playLevelCard(g,0,kill.uid,0,{hirelingUid:hireling.uid}).ok);assert.equal(g.players[1].equipment.length,0);
});

test('Steal a Level conserves levels and rejects a first-level victim or winning level atomically',async()=>{
 const {playSpecialCard}=await import('../public/special-cards.js');const g=game(),c=card('Steal a Level');g.players[0].hand=[c];g.players[1].level=1;const before=JSON.stringify(g);assert.equal(playSpecialCard(g,0,c.uid,{targetUid:1}).ok,false);assert.equal(JSON.stringify(g),before);g.players[1].level=6;assert.ok(playSpecialCard(g,0,c.uid,{targetUid:1}).ok);assert.equal(g.players[0].level,6);assert.equal(g.players[1].level,5);
 const d=card('Steal a Level');g.players[0].hand=[d];g.players[0].level=9;assert.equal(playSpecialCard(g,0,d.uid,{targetUid:1}).ok,false);assert.equal(g.players[1].level,5);
});

test('Platycore permits either losing the whole hand or two levels',async()=>{
 const {badStuffInteractive}=await import('../public/card-effects.js');const g=game(),p=g.players[0];p.hand=[card('Wizard'),card('Elf')];await badStuffInteractive(g,p,card('Platycore'),{choose:async prompt=>{assert.equal(prompt.kind,'alternative');return 'hand'}});assert.equal(p.hand.length,0);assert.equal(p.level,5);
 p.hand=[card('Wizard')];badStuff(g,p,card('Platycore'),{chooseDecision:()=> 'levels'});assert.equal(p.level,3);assert.equal(p.hand.length,1);
});

test('Snails roll once for Bad Stuff and let the victim mix hand cards and items, never identities in play',async()=>{
 const {badStuffInteractive}=await import('../public/card-effects.js');const g=game(),p=g.players[0],sword=card('Broad Sword'),spell=card('Magic Missile'),wizard=card('Wizard');p.equipment=[wizard,sword];p.hand=[spell];let rolls=0;await badStuffInteractive(g,p,card('Snails on Speed'),{rollDie:async()=>{rolls++;return 2},choose:async prompt=>{assert.equal(prompt.count,2);assert.equal(prompt.cards.some(c=>c.uid===wizard.uid),false);return[sword.uid,spell.uid]}});assert.equal(rolls,1);assert.deepEqual(p.equipment.map(c=>c.en),['Wizard']);assert.equal(p.hand.length,0);
});

test('Leperchaun neighbours choose sequentially but cards go to discard, not their hands',async()=>{
 const {badStuffInteractive}=await import('../public/card-effects.js');const g=game(),p=g.players[0],a=card('Broad Sword'),b=card('Leather Armor');p.equipment=[a,b];const actors=[];await badStuffInteractive(g,p,card('Leperchaun'),{choose:async prompt=>{actors.push(prompt.actor);assert.equal(prompt.cards.length,3-actors.length);return[prompt.cards[0].uid]}});assert.deepEqual(actors,[1,2]);assert.equal(p.equipment.length,0);assert.equal(g.discards.treasures.length,2);assert.equal(g.players[1].hand.length,0);assert.equal(g.players[2].hand.length,0);
});

test('Insurance Salesman ignores fighter levels, and the victim chooses a sufficient payment without losing a level',async()=>{
 const {badStuffInteractive}=await import('../public/card-effects.js');const g=game(),p=g.players[0];p.equipment=[card('Wizard'),card('Staff of Napalm')];startCombat(g,card('Insurance Salesman'));assert.equal(combatStrength(g),5);g.helper=1;g.players[1].equipment=[card('Really Impressive Title')];assert.equal(combatStrength(g),8);
 const ring=card('Wishing Ring'),cloak=card('Cloak of Obscurity');p.hand=[ring,cloak];await badStuffInteractive(g,p,g.monster,{choose:async prompt=>{assert.equal(prompt.minValue,1000);return[ring.uid,cloak.uid]}});assert.equal(p.level,5);assert.equal(p.hand.length,0);assert.ok(p.equipment.some(c=>c.en==='Staff of Napalm'));
});

test('Hippogriff takes treasures in right-first order and never offers hidden names or Door cards',async()=>{
 const {badStuffInteractive}=await import('../public/card-effects.js');const g=game(),p=g.players[0],spell=card('Magic Missile'),wizard=card('Wizard'),sword=card('Broad Sword');p.hand=[wizard,spell];p.equipment=[sword];const actors=[];await badStuffInteractive(g,p,card('Hippogriff'),{choose:async prompt=>{actors.push(prompt.actor);assert.equal(prompt.cards.some(c=>c.uid===wizard.uid||c.name===spell.name),false);return[prompt.cards.find(c=>typeof c.uid==='string')?.uid??prompt.cards[0].uid]}});assert.deepEqual(actors,[2,1]);assert.equal(g.players[2].hand[0].uid,spell.uid);assert.equal(g.players[1].hand[0].uid,sword.uid);assert.deepEqual(p.hand.map(c=>c.uid),[wizard.uid]);
});

test('Magic Lamp works only on the owner’s turn and gives no treasure for removing one of several monsters',async()=>{
 const {playSpecialCard}=await import('../public/special-cards.js');const g=game(),lamp=card('Magic Lamp');startCombat(g,card('Net Troll'));g.monsters.push(card('Potted Plant'));g.players[1].hand=[lamp];assert.equal(playSpecialCard(g,1,lamp.uid,{targetUid:g.monster.uid}).ok,false);g.players[1].hand=[];g.players[0].hand=[lamp];assert.ok(playSpecialCard(g,0,lamp.uid,{targetUid:g.monster.uid}).ok);assert.equal(g.charmedLoot,0);win(g);assert.equal(g.players[0].level,6);assert.equal(g.players[0].hand.length,1);
 const h=game(),l=card('Magic Lamp');startCombat(h,card('Net Troll'));h.players[0].hand=[l];playSpecialCard(h,0,l.uid,{targetUid:h.monster.uid});assert.equal(h.phase,'done');assert.equal(h.players[0].level,5);assert.equal(h.players[0].hand.length,3);
});

test('Pollymorph defers treasure until all other monsters are defeated and forfeits it on flight',async()=>{
 const {playSpecialCard}=await import('../public/special-cards.js');for(const flee of [false,true]){const g=game(),potion=card('Pollymorph Potion');startCombat(g,card('Net Troll'));g.monsters.push(card('Potted Plant'));g.players[0].hand=[potion];playSpecialCard(g,0,potion.uid,{targetUid:g.monster.uid});assert.equal(g.players[0].hand.length,0);assert.equal(g.charmedLoot,3);if(flee){runAway(g,()=>6);assert.equal(g.players[0].hand.length,0);assert.equal(g.players[0].level,5)}else{assert.equal(win(g),4);assert.equal(g.players[0].level,6)}}
});

test('Out to Lunch and Friendship end a whole group without kill rewards; Friendship permits only room looting',async()=>{
 const {playSpecialCard}=await import('../public/special-cards.js');for(const name of ['Out to Lunch','Friendship Potion']){const g=game(),c=card(name);startCombat(g,card('Net Troll'));g.monsters.push(card('Potted Plant'));g.players[1].hand=[c];playSpecialCard(g,1,c.uid);assert.equal(g.monsters.length,0);assert.equal(g.players[0].level,5);assert.equal(g.players[0].hand.length,name==='Out to Lunch'?2:0);assert.equal(g.phase,name==='Out to Lunch'?'done':'loot');assert.equal(g.lootRoomOnly,name==='Friendship Potion');assert.equal(g.discards.doors.filter(c=>c.type==='monster').length,2)}
});

test('Wizard helper may charm, but the treasure belongs to the party and gives an Elf no kill level',async()=>{
 const {useAbility}=await import('../public/abilities.js');const g=game();startCombat(g,card('Net Troll'));g.helper=1;g.players[1].equipment=[card('Wizard'),card('Elf')];g.players[1].hand=[card('Magic Missile'),card('Broad Sword'),card('Wishing Ring')];g.reaction={order:[1],index:0,pending:'fight',revision:0};const r=useAbility(g,1,'charm',{targetUid:g.monster.uid});assert.ok(r.ok);assert.equal(g.phase,'done');assert.equal(g.players[0].hand.length,2);assert.equal(g.players[1].hand.length,1);assert.equal(g.players[1].level,5);
});

test('Loaded and Reloaded Dice only affect the correct player and allow the owner to counter a changed roll',async()=>{
 const {rollWithInterference}=await import('../public/card-effects.js');const g=game(),one=card('Loaded Die'),two=card('Loaded Die'),reload={uid:++uid,name:'Reload',type:'special',action:'reloadedDie',deck:'treasures'};g.players[0].hand=[one,two];g.players[1].hand=[reload,card('Loaded Die')];const seen=[];const result=await rollWithInterference(g,0,2,async prompt=>{seen.push(prompt);assert.ok(prompt.cards.every(c=>c.action===(prompt.actor===0?'loadedDie':'reloadedDie')));return{uid:prompt.cards[0].uid,value:prompt.actor===0?6:1}});assert.equal(result,6);assert.equal(g.players[1].hand.length,1);assert.equal(seen.length,3);
});

test('fire potion bonuses cannot bypass a monster’s fire immunity',()=>{const g=game(),c=card('Flaming Poison Potion');startCombat(g,card('Magic Dragon'));g.players[0].hand=[c];const initial=combatStrength(g);useCombatPotion(g,0,c.uid);assert.equal(combatStrength(g),initial)});

test('bot Loaded Die avoids Orc death instead of blindly choosing one for Bad Stuff',async()=>{const {chooseDieResponse}=await import('../public/ai.js');const g=game(),die=card('Loaded Die'),monster=card('3,872 Orcs');g.players[0].bot=true;assert.equal(chooseDieResponse(g,{actor:0,roller:0,result:1,cards:[die],monster,purpose:'badStuff'}).value,3);g.players[0].curses=[{curseKey:'chicken'}];assert.equal(chooseDieResponse(g,{actor:0,roller:0,result:2,cards:[die],monster,purpose:'badStuff'}).value,4)});

test('Mutilate remains legal immediately after Friendship and neighbours get an aftermath window',async()=>{const {playSpecialCard}=await import('../public/special-cards.js');const {levelTargets}=await import('../public/level-cards.js');const {beginReactions,passReaction}=await import('../public/combat.js');const g=game(),friend=card('Friendship Potion'),mutilate=card('Mutilate the Bodies (GUAL)');startCombat(g,card('Net Troll'));g.players[1].hand=[friend,mutilate];playSpecialCard(g,1,friend.uid);assert.equal(g.phase,'loot');assert.ok(levelTargets(g,1,mutilate).includes(1));assert.equal(beginReactions(g,'aftermath'),true);assert.equal(g.reaction.order[0],1);assert.ok(playLevelCard(g,1,mutilate.uid).ok);passReaction(g);assert.equal(passReaction(g).pending,'aftermath');assert.equal(g.phase,'loot')});
