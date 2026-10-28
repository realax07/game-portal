import {advancedOptions,playAdvanced} from './advanced-specials.js';
import {removeCombatMonster,finishWithoutKill} from './combat-outcomes.js';
import {discard} from './decks.js';
import {retainCombatCard} from './combat-cards.js';
export function specialOptions(g,actor,c){
 if(g.winner!==null||g.pendingEncounter||g.pendingDivine||g.pendingCurse||g.players[actor]?.dead)return null;
 const advanced=advancedOptions(g,actor,c);if(advanced)return advanced.targets.length?advanced:null;
 if(['outToLunch','magicLamp','pollymorph','friendship'].includes(c.effect)&&g.phase==='combat'&&!g.fleeingDeclared&&!g.mustRunAway){if(c.effect==='magicLamp'&&actor!==g.turn)return null;const targets=(g.monsters||[g.monster]).filter(Boolean).map(m=>({uid:m.uid,name:m.name}));return targets.length?{targets:['magicLamp','pollymorph'].includes(c.effect)?targets:[],text:'Убрать монстров'}:null}
 if(c.effect==='stealLevel'&&g.players[actor].level<9){const targets=g.players.flatMap((p,i)=>i!==actor&&!p.dead&&p.level>1?[{uid:i,name:p.name}]:[]);return targets.length?{targets,text:'Украсть уровень'}:null}
 if(c.effect==='doppleganger')return g.phase==='combat'&&actor===g.turn&&g.helper===null&&!(g.monsters||[g.monster]).some(m=>m?.levelsOnly)?{targets:[],text:'Позвать двойника'}:null;
 return null;
}
export function playSpecialCard(g,actor,uid,options={}){
 const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid);if(!c||!specialOptions(g,actor,c))return{ok:false,reason:'Эта карта сейчас недоступна.'};
 if(advancedOptions(g,actor,c))return playAdvanced(g,actor,c,options);
 if(['outToLunch','magicLamp','pollymorph','friendship'].includes(c.effect)){
  const monsters=(g.monsters||[g.monster]).filter(Boolean),target=monsters.find(m=>m.uid===options.targetUid);
  if(['magicLamp','pollymorph'].includes(c.effect)&&!target)return{ok:false,reason:'Выбери монстра.'};
  p.hand=p.hand.filter(x=>x.uid!==uid);retainCombatCard(g,c);
  if(target)removeCombatMonster(g,target.uid,{treasures:c.effect==='pollymorph'||monsters.length===1?target.reward:0});
  else{discard(g,monsters);g.monsters=[];g.monster=null;g.combatRevision=(g.combatRevision||0)+1;finishWithoutKill(g,{loot:c.effect==='outToLunch'?2:0,lootRoom:c.effect==='friendship'})}
  return{ok:true,text:`${p.name}: «${c.name}». Монстры ушли без уровней.`};
 }
 if(c.effect==='stealLevel'){const target=specialOptions(g,actor,c).targets.find(t=>t.uid===options.targetUid);if(!target)return{ok:false,reason:'Нужен другой игрок выше первого уровня.'};p.hand=p.hand.filter(x=>x.uid!==uid);discard(g,c);g.players[target.uid].level--;p.level++;g.combatRevision=(g.combatRevision||0)+1;return{ok:true,text:`${p.name} крадёт уровень у ${g.players[target.uid].name}.`}}
 if(c.effect==='doppleganger'){
  p.hand=p.hand.filter(x=>x.uid!==uid);retainCombatCard(g,c);g.dopplegangers??=[];g.dopplegangers.push({owner:actor,uid});g.combatRevision=(g.combatRevision||0)+1;return{ok:true,text:`${p.name} зовёт двойника: сила меняется вместе с оригиналом.`};
 }
 return{ok:false};
}
