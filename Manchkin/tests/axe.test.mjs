import test from 'node:test';import assert from 'node:assert/strict';
import {CARDS,makeGame,equipPlan,upgradeSave,endTurn,startCombat,draw,canWin,win,runAway,addWanderingMonster,useAbility} from '../public/engine.js';
import {specialOptions} from '../public/special-cards.js';
import {AXE_SHARED_NAMES} from '../public/axe-cards.js';
import {PRINTED_COPIES} from '../public/deck-composition.js';
import {physicalCards} from '../public/immediate-cards.js';
import {beginMap,mapChoices,resolveMap} from '../public/axe-effects.js';
import {playLevelCard} from '../public/level-cards.js';
import {startCurse,cursePrompt,respondToCurse,removePersistentCurse} from '../public/curses.js';
import {discardHandCard,sellItem,itemBonus,badStuff,monsterModifiers} from '../public/card-effects.js';
let uid=9800000;const card=(en,set=null)=>{const c=CARDS.find(c=>c.en===en&&(!set||c.set===set));assert.ok(c,en);return{...structuredClone(c),uid:uid++}};
const game=()=>{const g=makeGame(['A','B'],['base','axe'],'hotseat');delete g.pendingDivine;g.players.forEach(p=>{p.hand=[];p.equipment=[]});g.discards={doors:[],treasures:[]};return g};
test('Axe includes its own copies of fourteen shared base cards, retaining handlers and printed quantities',()=>{
 for(const en of AXE_SHARED_NAMES){const a=card(en,'axe'),b=card(en,'base');assert.notEqual(a.id,b.id);assert.equal(a.sharedRuleFrom,b.id);for(const key of ['type','slot','effect','action','bonus','limit','requires'])assert.deepEqual(a[key],b[key],en+'/'+key);assert.equal(a.copies,PRINTED_COPIES.axe[en])}
 const g=makeGame(['A','B'],['base','axe'],'hotseat'),cards=physicalCards(g);for(const en of AXE_SHARED_NAMES)assert.equal(cards.filter(c=>c.set==='axe'&&c.en===en).length,PRINTED_COPIES.axe[en]);assert.ok(!cards.some(c=>c.en==='(Blank)'));
});
test('Navel offers one free level or two for at least three remaining cards, never the winning level',()=>{
 const g=game(),p=g.players[0],navel=card('Contemplate Your Navel (GUAL)');p.level=6;p.hand=[navel,card('Elf'),card('Warrior')];assert.equal(playLevelCard(g,0,navel.uid,0,{discardHand:true}).ok,false);assert.equal(p.hand.length,3);p.hand.push(card('Dwarf'));assert.equal(playLevelCard(g,0,navel.uid,0,{discardHand:true}).ok,true);assert.equal(p.level,8);assert.equal(p.hand.length,0);assert.equal(g.discards.doors.length,3);assert.equal(g.discards.treasures.length,1);
 const next=card('Contemplate Your Navel (GUAL)');p.hand=[next];assert.equal(playLevelCard(g,0,next.uid).ok,true);assert.equal(p.level,9);const last=card('Contemplate Your Navel (GUAL)');p.hand=[last];assert.equal(playLevelCard(g,0,last.uid).ok,false);assert.equal(g.winner,null);
});
test('Tiny Hands removes ordinary two-handed items in play, protects Cheat and does not discard cards from hand',()=>{
 const g=game(),p=g.players[0],normal=card('Chainsaw of Bloody Dismemberment'),cheated=card('Swiss Army Polearm'),held=card('Chainsaw of Bloody Dismemberment');cheated.cheatCard=card('Cheat!');p.equipment=[normal,cheated];p.hand=[held];const curse=card('Curse! Tiny Hands');startCurse(g,curse,0);assert.equal(cursePrompt(g).done,true);assert.deepEqual(p.equipment.map(c=>c.uid),[cheated.uid]);assert.deepEqual(p.hand.map(c=>c.uid),[held.uid]);assert.equal(equipPlan(p,held).ok,false);const ring=card('Wishing Ring');p.hand.push(ring);assert.equal(removePersistentCurse(g,0,ring.uid,0,curse.uid).ok,true);assert.ok(!p.curses.length);assert.equal(equipPlan(p,held).ok,true);
});
test('Tiny Hands can be cancelled before any item is lost and preserves Hireling exceptions',()=>{
 const g=game(),p=g.players[0],item=card('Chainsaw of Bloody Dismemberment'),ring=card('Wishing Ring');p.hand=[ring];p.equipment=[item];startCurse(g,card('Curse! Tiny Hands'),0);assert.equal(cursePrompt(g).kind,'protection');respondToCurse(g,{uid:ring.uid});assert.equal(p.equipment.length,1);p.hand=[];const hireling=card('Hireling');item.hirelingUid=hireling.uid;p.equipment.push(hireling);startCurse(g,card('Curse! Tiny Hands'),0);cursePrompt(g);assert.ok(p.equipment.includes(item));
});
test('Find a Map consumes the card before revealing, saves its private choice and returns all doors in order',()=>{
 const g=game(),p=g.players[0],map=card('Find A Map'),top=[card('Elf'),card('Curse! Duck of Doom'),card('Potted Plant')];p.hand=[map];g.doors=[...top].reverse();assert.equal(beginMap(g,0,map.uid).ok,true);assert.equal(p.hand.length,0);assert.equal(p.level,1);assert.equal(g.discards.doors.at(-1).uid,map.uid);const restored=upgradeSave(JSON.parse(JSON.stringify(g))),prompt=mapChoices(restored);assert.equal(prompt.orders.length,6);assert.deepEqual(prompt.cards.map(c=>c.uid),top.map(c=>c.uid));assert.equal(resolveMap(restored,1,prompt.orders[0]).ok,false);assert.equal(resolveMap(restored,0,[top[0].uid,top[0].uid,top[1].uid]).ok,false);
 const turn=restored.turn;endTurn(restored);assert.equal(restored.turn,turn);assert.equal(startCombat(restored,card('Potted Plant')),null);assert.equal(resolveMap(restored,0,[top[2].uid,top[1].uid,top[0].uid]).ok,true);assert.deepEqual([draw(restored,'doors'),draw(restored,'doors'),draw(restored,'doors')].map(c=>c.uid),[top[2].uid,top[1].uid,top[0].uid]);assert.equal(restored.players[0].level,1);
});
test('Map preview recycles an exhausted door discard without drawing itself; all other card actions wait',()=>{
 const g=game(),map=card('Find A Map'),a=card('Elf'),b=card('Dwarf'),c=card('Warrior'),item=card('Horny Helmet');g.doors=[a];g.discards.doors=[b,c];g.players[0].hand=[map,item];beginMap(g,0,map.uid);assert.deepEqual(new Set(mapChoices(g).cards.map(c=>c.uid)),new Set([a.uid,b.uid,c.uid]));assert.equal(sellItem(g,0,item.uid).ok,false);assert.equal(discardHandCard(g,0,item.uid).ok,false);assert.equal(startCurse(g,card('Curse! Duck of Doom'),0).ok,false);assert.equal(beginMap(g,0,map.uid).ok,false);
});

test('Axe weapons enforce race and hand restrictions; Skull Helmet changes its bonus with Orc identity',()=>{
 const g=game(),p=g.players[0];for(const en of ['Funny-Looking Sword','Slug Thrower','Tweezers of Terror']){const c=card(en);p.hand=[c];assert.equal(equipPlan(p,c).ok,false,en);p.equipment=[card(en==='Tweezers of Terror'?'Elf':'Orc')];assert.equal(equipPlan(p,c).ok,true,en);p.equipment=[]}
 const slug=card('Slug Thrower');p.hand=[slug];p.equipment=[card('Orc'),card('Rat on a Stick')];assert.deepEqual(equipPlan(p,slug).remove.map(c=>c.en),['Rat on a Stick']);const helm=card('Skull Helmet');assert.equal(itemBonus(p,helm),4);p.equipment=[];assert.equal(itemBonus(p,helm),2);
});
test('Squid sword gives four strength normally, but immediately forces escape from Squidzilla',()=>{
 const g=game(),p=g.players[0],sword=card('Sword of Slaying Everything Except Squid');p.equipment=[sword,card('Wizard')];p.hand=[card('Elf'),card('Dwarf'),card('Warrior'),card('Illusion'),card('Find A Map')];startCombat(g,card('Potted Plant'));assert.equal(itemBonus(p,sword,g),4);assert.equal(g.mustRunAway,false);startCombat(g,card('Squidzilla'));assert.equal(g.mustRunAway,true);assert.equal(g.fleeingDeclared,true);assert.equal(itemBonus(p,sword,g),0);assert.equal(canWin(g),false);assert.equal(win(g),0);assert.equal(useAbility(g,0,'charm',{targetUid:g.monster.uid}).ok,false);assert.equal(specialOptions(g,0,p.hand.find(c=>c.en==='Illusion')),null);assert.equal(beginMap(g,0,p.hand.find(c=>c.en==='Find A Map').uid).ok,false);const result=runAway(g,()=>6);assert.ok(result.every(r=>r.escaped));assert.equal(g.phase,'done');assert.equal(g.forcedEscapeReason,undefined);assert.equal(p.level,1);
});
test('Wandering Squidzilla also triggers sword escape; an unequipped sword does not',()=>{
 const g=game(),p=g.players[0],sword=card('Sword of Slaying Everything Except Squid');p.hand=[sword];p.carried=[{...sword,uid:uid++}];startCombat(g,card('Squidzilla'));assert.equal(g.mustRunAway,false);p.equipment=[sword];startCombat(g,card('Potted Plant'));const squid=card('Squidzilla');g.players[1].hand=[squid,card('Wandering Monster')];assert.equal(addWanderingMonster(g,1,squid.uid).ok,true);assert.equal(g.mustRunAway,true);assert.equal(g.monsters.length,2);assert.equal(runAway(g,()=>6).length,2);
 // A legacy combat record without names must not match undefined card metadata.
 const old=game();old.players[0].equipment=[{bonus:20}];old.phase='combat';old.monsters=[{power:1,reward:1}];assert.equal(canWin(old),true);
});
test('Axe coverage accounts for every printed card, separating four blanks from playable cards',async()=>{
 const {buildAxeAudit}=await import('../scripts/axe-audit.mjs');const audit=await buildAxeAudit();assert.equal(audit.expectedUnique,102);assert.equal(audit.expectedPlayableCopies,108);assert.equal(audit.printedCopies,112);assert.equal(audit.customizationBlanks.reduce((n,b)=>n+b.copies,0),4);assert.equal(audit.implementedDefinitions+audit.missing.length,102);assert.equal(audit.implementedCopies,CARDS.filter(c=>c.set==='axe').reduce((n,c)=>n+c.copies,0));assert.ok(audit.rows.every(r=>r.deck==='doors'||r.deck==='treasures'));assert.ok(!audit.missing.includes('(Blank)'));
});
test('Cat Girl rolls for hand cards only and lets the victim choose; an empty hand never costs equipment',()=>{
 const g=game(),p=g.players[0],cat=card('Cat Girl');p.hand=[card('Elf'),card('Dwarf'),card('Warrior')];p.equipment=[card('Orc'),card('Skull Helmet')];assert.equal(monsterModifiers(g,cat),5);const lost=p.hand.slice(1).map(c=>c.uid);badStuff(g,p,cat,{rollDie:()=>2,chooseCards:(cards,count)=>{assert.equal(count,2);assert.equal(cards.length,3);assert.ok(cards.every(c=>p.hand.includes(c)));return lost}});assert.deepEqual(p.hand.map(c=>c.en),['Elf']);assert.equal(p.equipment.length,2);badStuff(g,p,cat,{rollDie:()=>6});assert.equal(p.hand.length,0);badStuff(g,p,cat,{rollDie:()=>6});assert.equal(p.equipment.length,2);
});
test('M.T. Suit adds a single bonus for Warrior/Thief, including helper, and loses exactly three levels',()=>{
 const g=game(),m=card('M.T. Suit');assert.ok(m.undead);g.players[0].level=6;g.players[0].equipment=[card('Warrior'),card('Thief')];g.players[1].equipment=[card('Thief')];g.helper=1;assert.equal(monsterModifiers(g,m),5);badStuff(g,g.players[0],m);assert.equal(g.players[0].level,3);
});
test('Slotless Axe items stack, Familiar requires Wizard, and Promise cannot grant level ten',()=>{
 const g=game(),p=g.players[0],teeth=card('Scary False Teeth'),familiar=card('Familiar');p.hand=[teeth,familiar];p.equipment=[card('Skull Helmet')];assert.deepEqual(equipPlan(p,teeth),{ok:true,remove:[]});assert.equal(equipPlan(p,familiar).ok,false);p.equipment.push(card('Wizard'));assert.deepEqual(equipPlan(p,familiar),{ok:true,remove:[]});const level=card("Promise The GM You'll Stop Telling Him About Your Character (GUAL)");p.hand=[level];p.level=8;assert.equal(playLevelCard(g,0,level.uid).ok,true);assert.equal(p.level,9);const next=card(level.en);p.hand=[next];assert.equal(playLevelCard(g,0,next.uid).ok,false);
});
