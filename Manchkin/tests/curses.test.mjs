import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,makeGame,startCombat,combatStrength,win,runAway,upgradeSave,power} from '../public/engine.js';
import {startCurse,cursePrompt,respondToCurse,removePersistentCurse,activeCurses,diePenalty} from '../public/curses.js';
import {itemUsable} from '../public/card-effects.js';
import {chooseCurseResponse} from '../public/ai.js';
let uid=1e6;
const card=en=>{const c=CARDS.find(c=>c.en===en);assert.ok(c,en);return{...c,uid:++uid}};
const game=()=>{const g=makeGame(['A','B','C'],['base'],'hotseat');for(const p of g.players){p.hand=[];p.equipment=[];p.level=5}g.discards={doors:[],treasures:[]};delete g.pendingDivine;g.treasures=g.treasures.filter(c=>!c.immediate);return g};
function finish(g,choose=prompt=>({uid:prompt.cards[0]?.uid,pass:prompt.kind==='protection'})){
 for(let i=0;i<30;i++){const p=cursePrompt(g);if(!p||p.done)return p;const r=respondToCurse(g,choose(p));assert.ok(r.ok,r.reason);if(r.done)return r}throw Error('Curse did not finish');
}
const curse=(g,en,target=0)=>assert.equal(startCurse(g,card(en),target).ok,true);

test('named equipment curses target the matching gear and never remove a level instead',()=>{
 for(const [en,lost,kept] of [
  ['Curse! Lose the Armor You Are Wearing','Leather Armor','Horny Helmet'],
  ['Curse! Lose the Footgear You Are Wearing','Boots of Butt-Kicking','Horny Helmet'],
  ['Curse! Lose the Headgear You Are Wearing','Horny Helmet','Leather Armor'],
  ['Curse! Lose a Big Item','Huge Rock','Leather Armor'],
  ['Curse! Lose a Small Item','Leather Armor','Huge Rock']]){
  const g=game(),p=g.players[0];p.equipment=[card(lost),card(kept)];curse(g,en);finish(g);
  assert.deepEqual(p.equipment.map(c=>c.en),[kept]);assert.equal(p.level,5);
  assert.ok(g.discards.treasures.some(c=>c.en===lost));
 }
 const g=game();curse(g,'Curse! Lose the Armor You Are Wearing');finish(g);assert.equal(g.players[0].level,5);
});

test('Wishing Ring cancels before damage and may be supplied by another player',()=>{
 const g=game(),ring=card('Wishing Ring');g.players[1].hand=[ring];g.players[0].hand=[card('Curse! Duck of Doom')];const c=g.players[0].hand[0];
 assert.ok(startCurse(g,c,2,{source:0}).ok);assert.equal(g.players[0].hand.length,0);
 const p=cursePrompt(g);assert.equal(p.kind,'protection');assert.equal(p.actor,1);
 assert.equal(respondToCurse(g,{uid:ring.uid}).done,true);assert.equal(g.players[2].level,5);
 assert.equal(g.discards.doors.length,1);assert.equal(g.discards.treasures.length,1);
 assert.equal(respondToCurse(g,{uid:ring.uid}).ok,false);
});

test('lose/change identity handles multi-identities, discard order and invalidated items',()=>{
 const g=game(),p=g.players[0];p.equipment=[card('Elf'),card('Dwarf'),card('Half-Breed'),card('Bow with Ribbons')];
 curse(g,'Curse! Lose Your Race');finish(g);
 assert.deepEqual(p.equipment.map(c=>c.en),['Bow with Ribbons']);assert.equal(itemUsable(p,p.equipment[0]),false);
 p.equipment.push(card('Warrior'),card('Cleric'),card('Super Munchkin'));const replacement=card('Thief');g.discards.doors.push(replacement);
 curse(g,'Curse! Change Class');finish(g);assert.ok(p.equipment.some(c=>c.uid===replacement.uid));assert.ok(!p.equipment.some(c=>['Warrior','Cleric'].includes(c.en)));assert.ok(p.equipment.some(c=>c.en==='Super Munchkin'));
 curse(g,'Curse! Lose Your Class');finish(g);assert.ok(!p.equipment.some(c=>c.type==='class'||c.type==='multiclass'));
 const before=p.level;curse(g,'Curse! Lose Your Class');finish(g);assert.equal(p.level,before-1);
});

test('persistent curses affect combat and dice, survive saves, and clear at the correct time',()=>{
 let g=game();g.players[0].equipment=[card('Leather Armor'),card('Horny Helmet')];
 curse(g,'Curse! Change Sex');finish(g);assert.equal(g.players[0].sex,'female');
 curse(g,'Curse! Malign Mirror');finish(g);curse(g,'Curse! Chicken on Your Head');finish(g);
 g=upgradeSave(JSON.parse(JSON.stringify(g)));startCombat(g,card('Potted Plant'));
 assert.equal(combatStrength(g),1,'5 level + 1 armor - 5 sex penalty, helmet blocked by mirror');
 assert.equal(diePenalty(g.players[0]),-1);win(g);
 assert.deepEqual(activeCurses(g.players[0]).map(c=>c.curseKey),['chicken']);
 curse(g,'Curse! Lose the Headgear You Are Wearing');finish(g);assert.equal(activeCurses(g.players[0]).length,0);
});

test('an out-of-combat curse persists until participation, and Wishing Ring can lift it',()=>{
 const g=game();curse(g,'Curse! Malign Mirror',1);finish(g);startCombat(g,card('Potted Plant'));win(g);assert.equal(activeCurses(g.players[1]).length,1);
 const ring=card('Wishing Ring');g.players[0].hand=[ring];const c=activeCurses(g.players[1])[0];assert.ok(removePersistentCurse(g,0,ring.uid,1,c.uid).ok);assert.equal(activeCurses(g.players[1]).length,0);
});

test('Sandals protect only face-up door curses, and Chicken changes Run Away',()=>{
 const g=game(),p=g.players[0];p.equipment=[card('Sandals of Protection')];startCurse(g,card('Curse! Duck of Doom'),0,{faceUp:true});finish(g);assert.equal(p.level,5);
 curse(g,'Curse! Duck of Doom');finish(g);assert.equal(p.level,3);
 curse(g,'Curse! Chicken on Your Head');finish(g);startCombat(g,card('Drooling Slime'));const result=runAway(g,()=>5);assert.equal(result[0].escaped,false);
});

test('Income Tax asks each solvent player, removes all items plus a level from insolvent players',()=>{
 const g=game();g.players[0].equipment=[card('Bow with Ribbons')];g.players[1].equipment=[card('Leather Armor'),card('Mithril Armor')];g.players[2].equipment=[card('Horny Helmet')];
 curse(g,'Curse! Income Tax');let prompt=cursePrompt(g);assert.equal(prompt.kind,'taxInitial');assert.ok(respondToCurse(g,{uid:prompt.cards[0].uid}).ok);
 prompt=cursePrompt(g);assert.equal(prompt.minValue,800);assert.equal(prompt.actor,1);
 const before=JSON.stringify(g);assert.equal(respondToCurse(g,{uids:[prompt.cards[0].uid]}).ok,false);assert.equal(JSON.stringify(g),before,'invalid payment must not mutate the table');
 assert.ok(respondToCurse(g,{uids:prompt.cards.map(c=>c.uid)}).ok);finish(g);
 assert.equal(g.players[1].level,5);assert.equal(g.players[2].level,4);assert.equal(g.players[2].equipment.length,0);
});

test('Lose Two Cards draws only from hand in left-then-right order and preserves instance identity',()=>{
 const g=game(),one=card('Elf');g.players[0].hand=[one];curse(g,'Curse! Lose Two Cards');finish(g);
 assert.deepEqual(g.players[1].hand.map(c=>c.uid),[one.uid]);assert.equal(g.players[2].hand.length,0);assert.equal(g.players[0].hand.length,0);
});

test('pending curse choices resume across save without replaying earlier losses',()=>{
 let g=game();g.players[0].equipment=[card('Leather Armor'),card('Horny Helmet')];curse(g,'Curse! Lose a Small Item');const prompt=cursePrompt(g);assert.equal(prompt.cards.length,2);
 g=upgradeSave(JSON.parse(JSON.stringify(g)));assert.deepEqual(cursePrompt(g).cards.map(c=>c.uid),prompt.cards.map(c=>c.uid));finish(g);assert.equal(g.players[0].equipment.length,1);assert.equal(g.discards.treasures.length,1);
});

test('Truly Obnoxious Curse accounts for conditional bonuses and lets the victim break ties',()=>{
 const g=game(),p=g.players[0];p.equipment=[card('Elf'),card('Horny Helmet'),card('Leather Armor')];curse(g,'Truly Obnoxious Curse!');const prompt=cursePrompt(g);assert.deepEqual(prompt.cards.map(c=>c.en),['Horny Helmet']);finish(g);assert.ok(p.equipment.some(c=>c.en==='Leather Armor'));
});

test('bot curse responses are legal and never spend an opponent’s ring',()=>{
 const g=game();g.players[0].hand=[card('Wishing Ring')];curse(g,'Curse! Duck of Doom');let prompt=cursePrompt(g);const response=chooseCurseResponse(g,prompt);assert.equal(response.uid,prompt.cards[0].uid);assert.ok(respondToCurse(g,response).ok);
 g.players[0].equipment=[card('Leather Armor'),card('Horny Helmet')];curse(g,'Curse! Lose a Small Item');finish(g,prompt=>chooseCurseResponse(g,prompt));assert.deepEqual(g.players[0].equipment.map(c=>c.en),['Horny Helmet']);
});
