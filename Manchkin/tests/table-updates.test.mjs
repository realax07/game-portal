import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,makeGame,startCombat,win,has,power,interfereWithEnhancer} from '../public/engine.js';
import {canSellCard,sellItem,discardHandCard,itemUsable,monsterModifiers} from '../public/card-effects.js';
import {useCombatPotion} from '../public/combat.js';
import {claimRewards,settleClaims} from '../public/combat-outcomes.js';
import {tableEffects} from '../public/table-state.js';
import {playLevelCard} from '../public/level-cards.js';
let uid=9000000;
const card=en=>{const c=CARDS.find(c=>c.en===en);assert.ok(c,en);return{...structuredClone(c),uid:uid++}};
function game(){const g=makeGame(['Искатель','Соперник','Третий'],['base'],'hotseat');delete g.pendingDivine;g.players.forEach(p=>{p.hand=[];p.equipment=[]});g.treasures=g.treasures.filter(c=>!c.immediate);return g}
test('a zero-gold item may be discarded, cannot be sold, and does not spend Halfling doubling',()=>{
 const g=game(),p=g.players[0],rat=card('Rat on a Stick');p.equipment=[card('Halfling')];p.hand=[rat];assert.equal(canSellCard(rat),false);assert.equal(sellItem(g,0,rat.uid).ok,false);assert.ok(!g.halflingSale);assert.equal(discardHandCard(g,0,rat.uid).ok,true);assert.equal(p.hand.length,0);assert.equal(g.discards.treasures.at(-1).uid,rat.uid);
});
test('positive-value potions and enhancers sell, discard into their own decks, and never buy level ten',()=>{
 const g=game(),p=g.players[0],potion=card('Magic Missile'),enhancer={...card('Magic Missile'),uid:uid++,type:'enhancer',deck:'doors',gold:800};p.level=8;p.gold=900;p.hand=[potion,enhancer];assert.equal(sellItem(g,0,potion.uid).gold,300);assert.equal(p.level,9);assert.equal(sellItem(g,0,enhancer.uid).ok,false);p.level=7;assert.equal(sellItem(g,0,enhancer.uid).gold,800);assert.equal(g.discards.doors.at(-1).uid,enhancer.uid);assert.equal(p.level,8);
});
test('sale and voluntary discard cannot bypass turn, combat, reaction or pending effect gates',()=>{
 for(const mode of ['combat','reaction','pendingCurse','pendingDivine','pendingEncounter','otherTurn']){const g=game(),c=card('Magic Missile');g.players[0].hand=[c];if(mode==='combat')g.phase='combat';else if(mode==='otherTurn')g.turn=1;else g[mode]={};assert.equal(sellItem(g,0,c.uid).ok,false,mode);assert.equal(discardHandCard(g,0,c.uid).ok,false,mode);assert.equal(g.players[0].hand.length,1)}
});
test('Human is recalculated for no race and every available multi-race capacity',()=>{
 const g=game(),p=g.players[0],pole=card('Swiss Army Polearm');assert.equal(has(p,'Human'),true);p.equipment=[card('Elf')];assert.equal(has(p,'Human'),false);p.equipment.push(card('Half-Breed'));assert.equal(has(p,'Human'),true);assert.equal(itemUsable(p,pole),true);assert.equal(monsterModifiers({...g,helper:null},{against:[{identity:'Human',bonus:4}]}),4);p.equipment.push(card('Dwarf'));assert.equal(has(p,'Human'),false);p.equipment.find(c=>c.slot==='race-mod').limit=3;assert.equal(has(p,'Human'),true);p.equipment.push(card('Halfling'));assert.equal(has(p,'Human'),false);p.equipment.find(c=>c.slot==='race-mod').limit=99;assert.equal(has(p,'Human'),true);
});
test('only a solo monster kill grants ordinary winning level; Elf remains an explicit card exception',()=>{
 for(const helper of [null,1]){const g=game();g.players[0].level=9;startCombat(g,card('Potted Plant'));g.helper=helper;win(g);assert.equal(g.players[0].level,helper===null?10:9);assert.equal(g.winner,helper===null?0:null)}
 const g=game();g.players[0].level=9;g.players[1].level=9;g.players[1].equipment=[card('Elf')];startCombat(g,card('Potted Plant'));g.helper=1;win(g);assert.equal(g.players[0].level,9);assert.equal(g.players[1].level,10);assert.equal(g.winner,1);
});
test('deferred kill rewards respect the helper at kill time and non-kill rewards cannot win',()=>{
 for(const [helper,kills,expected] of [[null,1,10],[1,1,9],[null,0,9]]){const g=game();g.players[0].level=9;g.helper=helper;claimRewards(g,{levels:1,kills});g.helper=null;settleClaims(g);assert.equal(g.players[0].level,expected)}
 const g=game(),c=card('Boil an Anthill (GUAL)');g.players[0].level=9;g.players[0].hand=[c];assert.equal(playLevelCard(g,0,c.uid).ok,false);
});
test('effect panel retains card sources, opposing sides and exact temporary modifier totals across save',()=>{
 const g=game(),p=g.players[0],curse={...card('Curse! Change Sex'),curseKey:'sex'};p.curses=[curse];startCombat(g,card('Potted Plant'));const potion=card('Magic Missile');p.hand=[potion];assert.equal(useCombatPotion(g,0,potion.uid).ok,true);const enemy=card('Magic Missile');g.players[1].hand=[enemy];useCombatPotion(g,1,enemy.uid,{side:'monsters'});const enhancer={...card('Magic Missile'),uid:uid++,type:'enhancer',delta:5};g.players[1].hand=[enhancer];interfereWithEnhancer(g,1,enhancer.uid,g.monster.uid);
 const restored=JSON.parse(JSON.stringify(g)),effects=tableEffects(restored);assert.equal(effects.entries.length,4);assert.equal(effects.heroes,potion.bonus-5);assert.equal(effects.foes,enemy.bonus+5);assert.equal(effects.entries.find(e=>e.card.uid===enemy.uid).actor,1);assert.equal(effects.entries.find(e=>e.card.uid===enemy.uid).side,'monsters');assert.equal(power(p),p.level);
 win(g);assert.equal(tableEffects(g).entries.length,0);
});
test('permanent race/class auras are visible without counting their equipment bonus a second time',()=>{
 const g=game(),aura={uid:uid++,en:'Test aura',name:'Усиление расы',type:'item',slot:'race-aura',bonus:3};g.players[1].equipment=[aura];const model=tableEffects(g);assert.equal(model.entries.length,1);assert.equal(model.entries[0].actor,1);assert.match(model.entries[0].detail,/уже учтён/);assert.equal(model.heroes,0);assert.equal(power(g.players[1]),g.players[1].level+3);
});
