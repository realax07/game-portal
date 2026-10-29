import test from 'node:test';import assert from 'node:assert/strict';
import {makeGame,draw,startCombat,endTurn,equip,canWin,win,runAway,addWanderingMonster,interfereWithEnhancer,beginReactions,passReaction,useAbility} from '../public/engine.js';
import {receiveCard} from '../public/decks.js';
import {chooseBotAction,chooseCurseResponse} from '../public/ai.js';
import {startCurse,cursePrompt,respondToCurse} from '../public/curses.js';
import {axePrompt,resolveAxe} from '../public/axe-specials.js';
import {mapChoices,resolveMap} from '../public/axe-effects.js';
import {specialOptions,playSpecialCard} from '../public/special-cards.js';
import {playLevelCard} from '../public/level-cards.js';
import {sellItem,useTreasure} from '../public/card-effects.js';
import {useCombatPotion,addMate} from '../public/combat.js';
import {hirelingOptions,assignHireling,forceHelper} from '../public/advanced-specials.js';
import {playMonsterAction,encounterPrompt,respondEncounter} from '../public/monster-actions.js';
import {respondDivine} from '../public/immediate-cards.js';
function settle(g){for(let n=0;n<500;n++){
 if(g.winner!==null)return;
 if(g.pendingAxe){const e=g.pendingAxe,p=axePrompt(g);let c=p.choices[0];if(e.kind==='exchange')c=p.choices.find(c=>c.uid==='done')||p.choices[0];if(e.kind==='globalCurse')c=p.choices.find(c=>c.uid==='pass');if(e.kind==='trojanWindow')c=p.choices.at(-1);assert.ok(resolveAxe(g,p.actor,c.uid).ok);continue}
 if(g.pendingMap){const p=mapChoices(g);assert.ok(resolveMap(g,p.actor,p.orders[0]).ok);continue}
 if(g.pendingCurse){const p=cursePrompt(g);if(p&&!p.done)assert.ok(respondToCurse(g,chooseCurseResponse(g,p)).ok);continue}
 if(g.pendingEncounter){const p=encounterPrompt(g);if(p)respondEncounter(g,p.cards.slice(0,p.count).map(c=>c.uid));continue}
 if(g.pendingDivine){respondDivine(g,g.pendingDivine.order[g.pendingDivine.index]);continue}
 return
 }assert.fail('A mandatory card decision did not finish')}
function door(g){const c=draw(g,'doors');if(!c){g.phase='done';return}if(c.type==='monster')startCombat(g,c);else{g.phase='loot';if(c.type==='curse')startCurse(g,c,g.turn,{faceUp:true});else receiveCard(g,g.players[g.turn],c)}}
function execute(g,a,actor=g.turn){const p=g.players[actor];if(a.type==='equip'){const c=p.hand.find(c=>c.uid===a.uid);return c&&equip(p,c,a.replaceUid).ok}
 if(a.type==='sell')return sellItem(g,actor,a.uid).ok;
 if(a.type==='ability'){const r=useAbility(g,actor,a.key,a);if(a.key==='steal')g.aiTheftUsed=true;if(r.faceUp){if(r.faceUp.type==='monster')startCombat(g,r.faceUp);else{g.phase='loot';receiveCard(g,p,r.faceUp)}}return r.ok}
 if(a.type==='special')return playSpecialCard(g,actor,a.uid,a).ok;
 if(a.type==='treasure')return useTreasure(g,actor,a.uid,a.targetUid).ok;
 if(a.type==='level')return playLevelCard(g,actor,a.uid,a.target??actor,a).ok;
 if(a.type==='hireling')return assignHireling(g,actor,a.id).ok;
 if(a.type==='force-help')return forceHelper(g,actor,a.target).ok;
 if(a.type==='monster-action')return playMonsterAction(g,actor,a.id).ok;
 if(a.type==='help'){g.helper=a.target;g.helpUsed=true;return true}
 if(a.type==='wander')return addWanderingMonster(g,actor,a.uid).ok;
 if(a.type==='enhance')return interfereWithEnhancer(g,actor,a.uid,a.targetUid).ok;
 if(a.type==='mate')return addMate(g,actor,a.uid,a.targetUid).ok;
 if(a.type==='hostile-potion')return useCombatPotion(g,actor,a.uid,{side:'monsters'}).ok;
 if(a.type==='door'){door(g);return true}
 if(a.type==='loot'){receiveCard(g,p,draw(g,'doors'));g.phase='done';return true}
 if(a.type==='play'||a.type==='trouble'){const c=p.hand.find(c=>c.uid===a.uid);if(!c)return false;if(c.type==='monster'){p.hand=p.hand.filter(x=>x.uid!==c.uid);startCombat(g,c);return true}if(c.type==='level')return playLevelCard(g,actor,c.uid,a.target??actor).ok;if(c.type==='curse')return startCurse(g,c,a.target??(actor+1)%g.players.length,{source:actor}).ok;if(c.type==='potion')return useCombatPotion(g,actor,c.uid).ok;if(c.type==='escape')return useTreasure(g,actor,c.uid).ok;if(specialOptions(g,actor,c))return playSpecialCard(g,actor,c.uid,a).ok;return false}
 if(a.type==='run'){runAway(g);return true}
 if(a.type==='fight'){beginReactions(g);for(let n=0;n<20&&g.reaction;n++){const other=g.reaction.order[g.reaction.index];execute(g,chooseBotAction(g,other,'react'),other);settle(g);if(g.reaction)passReaction(g)}if(canWin(g))win(g);return true}
 return a.type==='pass'
}
test('five seeded bot parties with the complete Axe finish without stalled decisions or invalid card actions',()=>{const saved=Math.random;try{for(let seed=1;seed<=5;seed++){let state=seed;Math.random=()=>((state=Math.imul(state,1664525)+1013904223)>>>0)/4294967296;const g=makeGame(['A','B','C','D','E'],['base','axe'],'bots');g.players[0].bot=true;let steps=0,turns=0;const trace=[];while(g.winner===null&&steps++<15000&&turns<400){settle(g);if(g.winner!==null)break;if(g.phase==='done'){endTurn(g);turns++;continue}const a=chooseBotAction(g,g.turn,g.phase==='door'?'prepare':g.phase);trace.push(g.turn+':'+g.phase+':'+a.type+':'+(g.players[g.turn].hand.find(c=>c.uid===a.uid)?.en||a.id||a.key||''));if(trace.length>12)trace.shift();const ok=execute(g,a);assert.ok(ok,`Illegal bot action: ${trace.join('; ')}`);if(!ok){if(g.phase==='combat')runAway(g);else if(g.phase==='loot'){g.phase='done'}else door(g)}assert.ok(g.players.every(p=>Number.isFinite(p.level)&&p.level>=1&&p.level<=10));}assert.notEqual(g.winner,null,`seed ${seed}: ${steps} steps, ${turns} turns, ${g.phase}, ${g.pendingAxe?.kind}, ${trace.join('; ')}`);assert.ok(steps<15000)}}finally{Math.random=saved}});
