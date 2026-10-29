import {helperAllowed,canInterfere,blockedTreasure,afflicted} from './axe-mechanics.js';
import {resolveEscapeCards} from './escape-cards.js';
import {syncPeacefulMonsters} from './monster-actions.js';
import {returnAfterCombat} from './combat-outcomes.js';
import {markCombatEnd} from './combat-events.js';
import {hasEscapeGuarantee} from './escape-state.js';
import {retainCombatCard,finishCombatCards} from './combat-cards.js';
import {awardEscapeTreasure} from './escape-rewards.js';
import {addCombatBonus,monsterSideBoost} from './combat-bonuses.js';
import {diePenalty,finishCombatCurses} from './curses.js';
import {characterPower,itemBonus,monsterModifiers,automaticEscape,badStuff,badStuffInteractive,itemUsable,canUsePotion,awardDarkAfterEscape} from './card-effects.js';
import {recordSabotage} from './traits.js';
import {discard} from './decks.js';
import {escapeBonus,has} from './traits.js';
// Combat is a group of monsters. g.monster is retained as the first member for
// old saves; all calculations go through these functions.
export function combatMonsters(g){return g.monsters?.length?g.monsters:g.monster?[g.monster]:[]}
export const monsterPower=g=>monsterSideBoost(g)+combatMonsters(g).reduce((n,m)=>n+(m.fireDefeat&&[g.players[g.turn],...(g.helper===null?[]:[g.players[g.helper]])].some(p=>p.equipment.some(c=>c.fire&&itemUsable(p,c)))?0:m.power+monsterModifiers(g,m)),0);
export function combatRewards(g){
 const fighters=[g.players[g.turn],...(g.helper===null?[]:[g.players[g.helper]])];
 const fire=fighters.some(p=>p.equipment.some(c=>c.fire&&itemUsable(p,c)&&itemBonus(p,c,g)>0))||(g.bonusEntries||[]).some(e=>e.fire&&e.amount>0);
 const unassisted=g.helper===null&&characterPower(g.players[g.turn],g)<=g.players[g.turn].level&&(g.boost||0)<=0&&!(g.bonusEntries||[]).some(e=>e.amount>0);
 return{levels:combatMonsters(g).reduce((n,m)=>n+(m.levels??1)+(m.fireLevel&&fire?m.fireLevel:0)+(m.unassistedLevel&&unassisted?m.unassistedLevel:0),0),treasures:combatMonsters(g).reduce((n,m)=>n+m.reward,0)};
}
export function startCombat(g,card){if((g.pendingAxe||g.pendingMap))return null;finishCombatCards(g);g.combatSerial=(g.combatSerial||0)+1;g.siegeDecisions={};g.lootRoomOnly=false;g.dopplegangers=[];g.abilityUses={};g.bonusEntries=[];g.boost=0;g.mustRunAway=false;delete g.forcedEscapeReason;g.fleeingDeclared=false;g.escapeGuarantees={};g.unconditionalEscapes={};g.charmedLoot=0;g.rewardClaims=[];g.illusionBonus=0;g.saboteurs=[];g.escapeResolved=false;const m={...card,printedPower:card.printedPower??card.power,power:Math.max(1,card.power+(g.dungeon?.delta||0))};g.monster=m;g.monsters=[m];g.phase='combat';g.reaction=null;g.combatRevision=(g.combatRevision||0)+1;if(m.entryDiscardItem)g.pendingEncounter={kind:'tongue',actor:g.turn,monster:m};syncPeacefulMonsters(g);return m}
export function wanderingOptions(g,actor){if(g.phase!=='combat'||g.fleeingDeclared)return[];const p=g.players[actor];if(!p)return[];const wandering=p.hand.some(c=>c.type==='wandering');const undead=combatMonsters(g).some(m=>m.undead),convert=p.hand.some(c=>c.makeUndead);return p.hand.filter(c=>c.type==='monster'&&(wandering||undead&&(c.undead||convert)))}
export function addWanderingMonster(g,actor,monsterUid){
 const p=g.players[actor],m=wanderingOptions(g,actor).find(c=>c.uid===monsterUid);if(!m)return{ok:false,reason:'Нужны монстр и Бродячая тварь — либо нежить к другой нежити.'};
 const free=m.undead&&combatMonsters(g).some(c=>c.undead);const enabler=free?null:p.hand.find(c=>c.type==='wandering')||p.hand.find(c=>c.makeUndead);const converted=!!enabler?.makeUndead;
 if(enabler)retainCombatCard(g,enabler,converted?[m.uid]:null,converted?{actor,side:'monsters',amount:enabler.delta}:{actor,pairUid:m.uid});const consumed=[m.uid,...(enabler?[enabler.uid]:[])];p.hand=p.hand.filter(c=>!consumed.includes(c.uid));
 const added={...m,power:Math.max(1,m.power+(g.dungeon?.delta||0))+(converted?enabler.delta:0),reward:m.reward+(converted?enabler.treasureDelta:0),...(converted?{undead:true,originalUndead:false}:{}),addedBy:actor};g.monsters=[...combatMonsters(g),added];if(added.noHelp){if(g.helper!==null)finishCombatCurses(g,[g.helper]);g.helper=null;g.forcedHelper=false}g.monster=g.monsters[0];g.combatRevision=(g.combatRevision||0)+1;
 syncPeacefulMonsters(g);recordSabotage(g,actor);return{ok:true,monster:added,enabler,free};
}
export function interfereWithEnhancer(g,actor,uid,targetUid){
 if(g.phase!=='combat'||g.pendingAxe||((g.pendingAxe||g.pendingMap)||g.pendingCurse)||g.fleeingDeclared)return{ok:false};const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid&&c.type==='enhancer'),m=combatMonsters(g).find(m=>m.uid===targetUid);if(!c||!m||p.dead||!canInterfere(g,actor,'enhancer')||c.makeUndead&&m.undead||(c.incompatible||[]).some(en=>(g.combatCards||[]).some(e=>e.card.en===en))||c.en==='Enraged'&&(g.combatCards||[]).some(e=>['Friendly','Sleeping'].includes(e.card.en)))return{ok:false};
 p.hand=p.hand.filter(x=>x.uid!==uid);const group=m.mateGroup?combatMonsters(g).filter(x=>x.mateGroup===m.mateGroup):[m];
 retainCombatCard(g,c,group.map(m=>m.uid),{actor,side:'monsters',amount:c.delta});for(const target of group){const delta=c.en==='Humongous'&&target.fungus?25:c.delta;target.power+=delta;if(c.en==='Humongous')target.humongous=true;if(c.makeUndead){target.originalUndead=!!target.undead;target.undead=true}if(c.noTreasure)target.noTreasure=true;target.reward=target.noTreasure?0:Math.max(1,target.reward+(c.treasureDelta??(c.delta>0?1:0)));target.enhancementDelta=(target.enhancementDelta||0)+c.delta}
 g.combatRevision=(g.combatRevision||0)+1;if(c.delta>0)recordSabotage(g,actor);return{ok:true,card:c,monster:m};
}
export function addMate(g,actor,uid,targetUid){
 if(g.phase!=='combat'||((g.pendingAxe||g.pendingMap)||g.pendingCurse)||g.fleeingDeclared)return{ok:false};const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid&&c.type==='mate'),m=combatMonsters(g).find(m=>m.uid===targetUid);if(!c||!m||p.dead||!canInterfere(g,actor))return{ok:false,reason:'Нужны карта пары и монстр в бою.'};
 p.hand=p.hand.filter(x=>x.uid!==uid);const group=m.mateGroup??m.uid;m.mateGroup=group;const mate={...structuredClone(m),uid:c.uid,discardAs:structuredClone(c),mateGroup:group};for(const entry of g.combatCards||[])if(entry.targets?.includes(m.uid))entry.targets.push(mate.uid);g.monsters=[...combatMonsters(g),mate];g.monster=g.monsters[0];g.combatRevision=(g.combatRevision||0)+1;recordSabotage(g,actor);return{ok:true,card:c,monster:mate};
}
export function beginReactions(g,pending='fight'){
 if((g.pendingAxe||g.pendingMap)||g.pendingEncounter||g.pendingDivine)return false;
 if(g.phase!=='combat'&&!(pending==='aftermath'&&(g.phase==='done'||g.phase==='loot'&&g.lootRoomOnly)))return false;const order=g.players.map((_,i)=>(g.turn+i+1)%g.players.length).filter(i=>i!==g.turn);
 g.reaction={pending,order,index:0,revision:g.combatRevision||0};return true;
}
export const reactingPlayer=g=>g.reaction?.order[g.reaction.index]??null;
export function passReaction(g){if(!g.reaction)return null;g.reaction.index++;if(g.reaction.index<g.reaction.order.length)return null;const pending=g.reaction.pending;const changed=g.reaction.revision!==(g.combatRevision||0);g.reaction=null;return{pending,changed}}
// Resolve one monster at a time so later choices see cards already lost to Bad Stuff.
function escapeResult(g,actor,m,roll,bonus,automatic,options={}){const p=g.players[actor],escaped=automatic||!m.noEscape&&roll+bonus>=5;const notes=escaped?'':badStuff(g,p,m,options);return{actor,monster:m,roll,bonus,automatic,escaped,death:!escaped&&!!p.dead,notes}}
function completeEscape(g,results){for(const actor of new Set(results.map(r=>r.actor)))awardEscapeTreasure(g,actor,results);awardDarkAfterEscape(g,results.some(r=>r.death));discard(g,combatMonsters(g));finishCombatCards(g);finishCombatCurses(g);g.charmedLoot=0;g.rewardClaims=[];markCombatEnd(g);g.phase='done';g.mustRunAway=false;delete g.forcedEscapeReason;g.fleeingDeclared=false;g.escapeGuarantees={};g.unconditionalEscapes={};g.reaction=null;returnAfterCombat(g);return results}
export function runAway(g,rollDie=()=>1+Math.floor(Math.random()*6),options={}){g.fleeingDeclared=true;const results=[];for(const actor of [g.turn,...(g.helper===null?[]:[g.helper])]){const p=g.players[actor];for(const m of combatMonsters(g)){const pursuitFree=automaticEscape(p,m),automatic=pursuitFree||hasEscapeGuarantee(g,actor,m);if(m.escapeLoss&&!pursuitFree)p.level=Math.max(1,p.level-m.escapeLoss);const roll=automatic||m.noEscape?0:rollDie();const r=escapeResult(g,actor,m,roll,escapeBonus(p,m)+diePenalty(p)-p.equipment.filter(c=>c.siege&&g.siegeDecisions?.[c.uid]&&!c.cursedThingy).length,automatic,{rollDie:options.badStuffRoll||rollDie,chooseCards:options.chooseCards});results.push(r);if(p.dead)break}}return completeEscape(g,results)}
export async function runAwayInteractive(g,choose,rollDie=()=>1+Math.floor(Math.random()*6),chooseBadStuff=null,beforeRoll=null,afterRoll=null){
 g.fleeingDeclared=true;const results=[];
 for(const actor of [g.turn,...(g.helper===null?[]:[g.helper])]){
  const p=g.players[actor];let flightSpent=0;
  for(const m of combatMonsters(g)){
   if(beforeRoll&&!automaticEscape(p,m)&&!hasEscapeGuarantee(g,actor,m))await beforeRoll({actor,monster:m});
   const pursuitFree=automaticEscape(p,m),automatic=pursuitFree||hasEscapeGuarantee(g,actor,m);if(m.escapeLoss&&!pursuitFree)p.level=Math.max(1,p.level-m.escapeLoss);let roll=automatic||m.noEscape?0:await rollDie(actor,m),bonus=escapeBonus(p,m)+diePenalty(p)-p.equipment.filter(c=>c.siege&&g.siegeDecisions?.[c.uid]&&!c.cursedThingy).length,retry=false;
   while(!automatic&&!m.noEscape&&roll+bonus<5){
    const max=has(p,'Wizard')?Math.min(3-flightSpent,p.hand.length):0,halfling=has(p,'Halfling')&&!retry&&p.hand.length>0;if(!max&&!halfling)break;
    const choice=await choose({actor,monster:m,roll,bonus,max,halfling,cards:[...p.hand]}),ids=choice?.uids||[];if(!ids.length||new Set(ids).size!==ids.length||!ids.every(id=>p.hand.some(c=>c.uid===id)))break;
    if(choice.key==='flight'&&ids.length<=max){const spent=p.hand.filter(c=>ids.includes(c.uid));p.hand=p.hand.filter(c=>!ids.includes(c.uid));discard(g,spent);bonus+=ids.length;flightSpent+=ids.length;continue}
    if(choice.key==='retry'&&halfling&&ids.length===1){const c=p.hand.find(c=>c.uid===ids[0]);p.hand=p.hand.filter(c=>c.uid!==ids[0]);discard(g,c);roll=await rollDie(actor,m);retry=true;continue}break;
   }
   const outcome=await resolveEscapeCards(g,{actor,monster:m,roll,bonus,automatic,escaped:automatic||!m.noEscape&&roll+bonus>=5},afterRoll,rollDie);
   const {escaped}=outcome;
   const notes=escaped?'':await badStuffInteractive(g,p,m,{choose:chooseBadStuff,rollDie});
   results.push({...outcome,death:!escaped&&!!p.dead,notes});if(p.dead)break;
  }
 }
 return completeEscape(g,results);
}
export function useCombatPotion(g,actor,uid,{side='fighters',target=g.turn}={}){
 if(g.phase!=='combat'||((g.pendingAxe||g.pendingMap)||g.pendingCurse)||g.fleeingDeclared||!['fighters','monsters'].includes(side))return{ok:false,reason:'Одноразовый бонус доступен только во время боя.'};
 const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid&&c.type==='potion');if(!c||p.dead||side==='fighters'&&![g.turn,g.helper].includes(target))return{ok:false,reason:'Нет карты или подходящей цели.'};
 if(!canUsePotion(g,actor,c))return{ok:false,reason:'Дождевик защищает бой от зелий посторонних.'};
 const eligible=[g.turn,...(g.helper===null?[]:[g.helper])].filter(i=>!c.perIdentity||has(g.players[i],c.perIdentity));if(c.allowedMonsters===false&&side==='monsters'||c.perIdentity&&!eligible.length)return{ok:false,reason:'Нужен эльф на стороне искателей.'};p.hand=p.hand.filter(x=>x.uid!==uid);const bonus=c.bonus*(side==='monsters'&&has(p,'Lizard Guy')?2:1)*(c.perIdentity?eligible.length:1);retainCombatCard(g,c,null,{actor,side,amount:bonus});if(c.perIdentity){for(const i of eligible)addCombatBonus(g,c.bonus,{actor,target:i,kind:'item',fire:!!c.fire,cardUid:c.uid})}else addCombatBonus(g,side==='monsters'?-bonus:bonus,{actor,target,kind:side==='monsters'?'monster':'item',fire:!!c.fire,cardUid:c.uid});if(c.fire&&side==='fighters')g.fireUsed=true;g.combatRevision=(g.combatRevision||0)+1;if(side==='monsters')recordSabotage(g,actor);return{ok:true,bonus,card:c};
}
export function interfereWithPotion(g,actor,uid){if(actor===g.turn)return{ok:false};return useCombatPotion(g,actor,uid,{side:'monsters'})}
