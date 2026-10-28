import {ownedItems,permanentItem,detach} from './item-links.js';
import {discard,receiveCard} from './decks.js';
import {equipPlan} from './equipment.js';
import {itemUsable} from './card-effects.js';
import {combatStrength} from './abilities.js';
import {monsterPower,combatMonsters,combatRewards} from './combat.js';
import {removeCombatMonster,claimRewards} from './combat-outcomes.js';
import {retainCombatCard} from './combat-cards.js';
import {has} from './traits.js';
import {finishCombatCurses} from './curses.js';
const won=g=>combatStrength(g)>monsterPower(g)||combatStrength(g)===monsterPower(g)&&[g.turn,g.helper].filter(i=>i!==null).some(i=>has(g.players[i],'Warrior'));
export function kneepadTargets(g,actor){if(actor!==g.turn||g.phase!=='combat'||g.helper!==null||g.fleeingDeclared||g.pendingEncounter||won(g)||g.players[actor].level+combatRewards(g).levels+(g.rewardClaims||[]).filter(r=>r.owner===actor).reduce((n,r)=>n+r.levels,0)>=10||combatMonsters(g).some(m=>m.noHelp)||(g.dopplegangers||[]).length)return[];const p=g.players[actor];if(!p.equipment.some(c=>c.forceHelp&&itemUsable(p,c)))return[];return g.players.flatMap((p,i)=>i!==actor&&!p.dead&&p.level>g.players[actor].level?[{uid:i,name:p.name}]:[])}
export function forceHelper(g,actor,target){if(!kneepadTargets(g,actor).some(t=>t.uid===target))return{ok:false};g.helper=target;g.helpUsed=true;g.forcedHelper=true;g.combatRevision=(g.combatRevision||0)+1;return{ok:true,text:`${g.players[target].name} вынужден помогать бесплатно.`}}
function helpTargets(g,actor){
 if(actor!==g.turn||g.phase!=='combat'||g.fleeingDeclared||won(g))return[];const p=g.players[actor],out=[];
 for(let owner=0;owner<g.players.length;owner++)if(owner!==actor&&!g.players[owner].dead)for(const item of [...g.players[owner].equipment,...(g.players[owner].carried||[])].filter(permanentItem)){
  if(!itemUsable(p,item))continue;
  const blockers=p.equipment.filter(c=>permanentItem(c)&&!c.cheatCard&&!c.hirelingUid&&(c.slot===item.slot&&c.slot!=='none'||item.big&&c.big));
  let candidate=null;
  for(let mask=0;mask<2**Math.min(12,blockers.length);mask++){
   const dropped=blockers.filter((_,i)=>mask&(1<<i));const sim=structuredClone(g),s=sim.players[actor];s.equipment=s.equipment.filter(c=>!dropped.some(x=>x.uid===c.uid));s.hand.push(structuredClone(item));const plan=equipPlan(s,item);if(!plan.ok)continue;const all=[...dropped,...plan.remove];s.equipment=s.equipment.filter(c=>!plan.remove.some(x=>x.uid===c.uid));s.equipment.push(item);sim.players[owner].equipment=sim.players[owner].equipment.filter(c=>c.uid!==item.uid);sim.players[owner].carried=(sim.players[owner].carried||[]).filter(c=>c.uid!==item.uid);
   let forced=null;let winning=won(sim);if(!winning&&item.forceHelp){for(const t of kneepadTargets(sim,actor)){const copy=structuredClone(sim);copy.helper=t.uid;if(won(copy)){winning=true;forced=t.uid;break}}}
   if(winning&&(!candidate||all.length<candidate.dropUids.length))candidate={uid:item.uid,name:`${g.players[owner].name}: ${item.name}${all.length?' (сбросить: '+all.map(c=>c.name).join(', ')+')':''}`,owner,dropUids:all.map(c=>c.uid),forced};
  }if(candidate)out.push(candidate);
 }
 return out;
}
export function advancedOptions(g,actor,c){
 const p=g.players[actor],combat=g.phase==='combat'&&!g.fleeingDeclared&&!g.mustRunAway;
 if(c.effect==='cheat'&&g.phase!=='combat'&&actor===g.turn)return{targets:ownedItems(p).filter(c=>permanentItem(c)&&!c.cheatCard&&!c.hirelingUid).map(c=>({uid:c.uid,name:c.name})),text:'Прикрепить чит'};
 if(c.effect==='dowsing')return{targets:[...(g.discards?.doors||[]),...(g.discards?.treasures||[])].map(c=>({uid:c.uid,name:c.name})),text:'Взять из сброса'};
 if(c.effect==='illusionSwap'&&combat)return{targets:combatMonsters(g).flatMap(m=>p.hand.filter(c=>c.type==='monster').map(c=>({uid:`${m.uid}:${c.uid}`,targetUid:m.uid,replacementUid:c.uid,name:`${m.name} → ${c.name}`}))),text:'Заменить монстра'};
 if(c.effect==='transferCombat'&&combat)return{targets:g.players.flatMap((p,i)=>i!==g.turn&&!p.dead?[{uid:i,name:p.name}]:[]),text:'Передать бой'};
 if(c.effect==='killNose'&&combat)return{targets:combatMonsters(g).filter(m=>m.en==='Floating Nose').map(m=>({uid:m.uid,name:`Убить: ${m.name}`})),text:'Мгновенно убить нос'};
 if(c.effect==='helpMe')return{targets:helpTargets(g,actor),text:'Забрать решающую шмотку'};
 return null;
}
export function playAdvanced(g,actor,c,options){
 const p=g.players[actor],offered=advancedOptions(g,actor,c),target=offered?.targets.find(t=>String(t.uid)===String(options.choiceUid??options.targetUid)||t.targetUid===options.targetUid&&t.replacementUid===options.replacementUid);if(!target)return{ok:false,reason:'Нет подходящей цели.'};
 if(c.effect==='cheat'){
  const item=detach(p,target.uid);p.hand=p.hand.filter(x=>x.uid!==c.uid);item.cheatCard=structuredClone(c);p.equipment.push(item);
 }else if(c.effect==='dowsing'){
  const pile=['doors','treasures'].find(k=>g.discards[k].some(c=>c.uid===target.uid)),card=g.discards[pile].find(c=>c.uid===target.uid);g.discards[pile]=g.discards[pile].filter(c=>c.uid!==card.uid);p.hand=p.hand.filter(x=>x.uid!==c.uid);receiveCard(g,p,card);discard(g,c);
 }else if(c.effect==='illusionSwap'){
  const old=combatMonsters(g).find(m=>m.uid===target.targetUid),replacement=p.hand.find(c=>c.uid===target.replacementUid);p.hand=p.hand.filter(x=>x.uid!==c.uid&&x.uid!==replacement.uid);retainCombatCard(g,c);
  g.monsters=combatMonsters(g).map(m=>m.uid===old.uid?{...replacement,power:replacement.power+(g.dungeon?.delta||0),addedBy:actor}:m);g.monster=g.monsters[0];discard(g,old);
 }else if(c.effect==='transferCombat'){
  p.hand=p.hand.filter(x=>x.uid!==c.uid);retainCombatCard(g,c);if(g.charmedLoot){claimRewards(g,{treasures:g.charmedLoot});g.charmedLoot=0}finishCombatCurses(g);const previous=g.turn;for(const entry of g.bonusEntries||[])if(entry.kind==='item'&&[previous,g.helper].includes(entry.target))entry.target=target.uid;const personal=(g.bonusEntries||[]).filter(e=>e.kind==='ability');g.boost-=personal.reduce((n,e)=>n+e.amount,0);g.bonusEntries=(g.bonusEntries||[]).filter(e=>e.kind!=='ability');g.returnTurn??=g.turn;g.turn=target.uid;g.helper=null;g.helpUsed=false;g.forcedHelper=false;g.dopplegangers=[];g.reaction=null;g.abilityUses={};
 }else if(c.effect==='killNose'){
  const m=combatMonsters(g).find(m=>m.uid===target.uid);p.hand=p.hand.filter(x=>x.uid!==c.uid);retainCombatCard(g,c);removeCombatMonster(g,m.uid,{treasures:m.reward,levels:m.levels||1,killed:true});
 }else if(c.effect==='helpMe'){
  const item=detach(g.players[target.owner],target.uid),dropped=p.equipment.filter(c=>target.dropUids.includes(c.uid));p.equipment=p.equipment.filter(c=>!target.dropUids.includes(c.uid));discard(g,dropped);p.hand=p.hand.filter(x=>x.uid!==c.uid);delete item.hirelingUid;p.equipment.push(item);retainCombatCard(g,c);if(target.forced!==null)forceHelper(g,actor,target.forced);
 }else return{ok:false};
 g.combatRevision=(g.combatRevision||0)+1;return{ok:true,text:`${p.name}: «${c.name}» → ${target.name}.`};
}
export function hirelingOptions(g,actor){const p=g.players[actor];if(g.phase==='combat'||actor!==g.turn)return[];return p.equipment.filter(c=>c.slot==='hireling').flatMap(h=>ownedItems(p).filter(c=>permanentItem(c)&&!c.hirelingUid&&!c.cheatCard).map(c=>({id:`${h.uid}:${c.uid}`,hirelingUid:h.uid,itemUid:c.uid,name:`${h.name} несёт ${c.name}`})))}
export function assignHireling(g,actor,id){const o=hirelingOptions(g,actor).find(o=>o.id===id);if(!o)return{ok:false};const p=g.players[actor],item=detach(p,o.itemUid),old=p.equipment.filter(c=>c.hirelingUid===o.hirelingUid);p.equipment=p.equipment.filter(c=>!old.includes(c));for(const c of old){delete c.hirelingUid;p.hand.push(c)}item.hirelingUid=o.hirelingUid;p.equipment.push(item);return{ok:true,text:o.name}}
