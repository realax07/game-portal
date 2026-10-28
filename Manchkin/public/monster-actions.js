import {targetsIdentity} from './card-effects.js';
import {has} from './traits.js';
import {ownedItems,detach} from './item-links.js';
import {discard,deckOf,takeTreasure} from './decks.js';
import {removeCombatMonster} from './combat-outcomes.js';
import {guaranteeEscape} from './escape-state.js';
export function syncPeacefulMonsters(g){
 if(g.phase!=='combat'||g.fleeingDeclared||g.pendingEncounter)return;
 const fighters=[g.turn,...(g.helper===null?[]:[g.helper])];
 for(const m of [...(g.monsters||[])]){
  if(m.peacefulSex&&fighters.some(i=>g.players[i].sex===m.peacefulSex)){g.log?.unshift({text:`${m.name} не дерётся и оставляет одно сокровище.`,kind:'gold'});removeCombatMonster(g,m.uid,{treasures:m.peacefulTreasure||0})}
  else if(m.peacefulIdentity&&fighters.some(i=>has(g.players[i],m.peacefulIdentity))){const actor=fighters.find(i=>has(g.players[i],m.peacefulIdentity));const cards=[...g.players[actor].hand,...g.players[actor].equipment,...(g.players[actor].carried||[])].filter(c=>deckOf(c)==='treasures');if(cards.length>=2)g.pendingEncounter={kind:'lawyers',actor,monster:m};removeCombatMonster(g,m.uid);}
 }
}
export function encounterPrompt(g){const e=g.pendingEncounter;if(!e)return null;const p=g.players[e.actor];const cards=e.kind==='lawyers'?[...p.hand,...p.equipment,...(p.carried||[])].filter(c=>deckOf(c)==='treasures'):ownedItems(p);if(e.kind!=='lawyers'&&!cards.length){delete g.pendingEncounter;return null}return{...e,cards,count:e.kind==='lawyers'?2:1,optional:e.kind==='lawyers'}}
export function respondEncounter(g,uids=[]){const prompt=encounterPrompt(g);if(!prompt)return{ok:true};const ids=[...new Set(uids)],cards=prompt.cards.filter(c=>ids.includes(c.uid));if(cards.length!==prompt.count&&!(prompt.optional&&!ids.length))return{ok:false};const p=g.players[prompt.actor];for(const c of cards)detach(p,c.uid);discard(g,cards);delete g.pendingEncounter;if(prompt.kind==='lawyers'&&cards.length)takeTreasure(g,p,2);return{ok:true}}
export function monsterActions(g,actor){
 if(g.phase!=='combat'||g.pendingEncounter||g.pendingDivine||g.mustRunAway||g.fleeingDeclared||![g.turn,g.helper].includes(actor))return[];
 const p=g.players[actor],fighters=[g.turn,...(g.helper===null?[]:[g.helper])],out=[];
 for(const m of g.monsters||[]){
  if(m.mayIgnore&&!fighters.some(i=>targetsIdentity(g.players[i],m.mustFightIdentity)))out.push({id:`ignore:${m.uid}`,key:'ignore',monster:m,name:`Пройти мимо: ${m.name}`});
  if(m.clericDismiss&&has(p,'Cleric'))out.push({id:`cleric:${m.uid}`,key:'cleric',monster:m,name:`Прогнать: ${m.name}`});
  if(m.bribeGold)for(const c of ownedItems(p).filter(c=>(c.gold??0)>=m.bribeGold))out.push({id:`bribe:${m.uid}:${c.uid}`,key:'bribe',monster:m,card:c,name:`Откупиться от ${m.name}: ${c.name}`});
 }
 return out;
}
export function playMonsterAction(g,actor,id){const a=monsterActions(g,actor).find(a=>a.id===id);if(!a)return{ok:false};if(a.card)discard(g,detach(g.players[actor],a.card.uid));removeCombatMonster(g,a.monster.uid,{treasures:a.key==='cleric'?a.monster.reward:0});return{ok:true,text:`${g.players[actor].name}: ${a.name}. Без уровня.`}}
export function poleEscapeOptions(g,actor,m){return m.discardPoleEscape?ownedItems(g.players[actor]).filter(c=>/wand|pole|staff/i.test(c.en||'')):[]}
export function tossPole(g,actor,m,uid){const c=poleEscapeOptions(g,actor,m).find(c=>c.uid===uid);if(!c)return{ok:false};discard(g,detach(g.players[actor],uid));guaranteeEscape(g,actor,[m]);return{ok:true}}
