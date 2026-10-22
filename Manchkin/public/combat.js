import {monsterModifiers,automaticEscape,badStuff,itemUsable,awardDarkAfterEscape} from './card-effects.js';
import {recordSabotage} from './traits.js';
import {discard} from './decks.js';
import {escapeBonus,has} from './traits.js';
// Combat is a group of monsters. g.monster is retained as the first member for
// old saves; all calculations go through these functions.
export function combatMonsters(g){return g.monsters?.length?g.monsters:g.monster?[g.monster]:[]}
export const monsterPower=g=>combatMonsters(g).reduce((n,m)=>n+(m.fireDefeat&&[g.players[g.turn],...(g.helper===null?[]:[g.players[g.helper]])].some(p=>p.equipment.some(c=>c.fire&&itemUsable(p,c)))?0:m.power+monsterModifiers(g,m)),0);
export const combatRewards=g=>({levels:combatMonsters(g).reduce((n,m)=>n+(m.levels||1),0),treasures:combatMonsters(g).reduce((n,m)=>n+m.reward,0)});
export function startCombat(g,card){g.abilityUses={};g.charmedLoot=0;g.illusionBonus=0;g.saboteurs=[];g.escapeResolved=false;const m={...card,printedPower:card.printedPower??card.power,power:Math.max(1,card.power+(g.dungeon?.delta||0))};g.monster=m;g.monsters=[m];g.phase='combat';g.reaction=null;g.combatRevision=(g.combatRevision||0)+1;return m}
export function wanderingOptions(g,actor){if(g.phase!=='combat'||actor===g.turn)return[];const p=g.players[actor];if(!p)return[];const wandering=p.hand.some(c=>c.type==='wandering');const undead=combatMonsters(g).some(m=>m.undead);return p.hand.filter(c=>c.type==='monster'&&(wandering||(c.undead&&undead)))}
export function addWanderingMonster(g,actor,monsterUid){
 const p=g.players[actor],m=wanderingOptions(g,actor).find(c=>c.uid===monsterUid);if(!m)return{ok:false,reason:'Нужны монстр и Бродячая тварь — либо нежить к другой нежити.'};
 const free=m.undead&&combatMonsters(g).some(c=>c.undead);const enabler=free?null:p.hand.find(c=>c.type==='wandering');
 discard(g,enabler);const consumed=[m.uid,...(enabler?[enabler.uid]:[])];p.hand=p.hand.filter(c=>!consumed.includes(c.uid));
 const added={...m,power:Math.max(1,m.power+(g.dungeon?.delta||0)),addedBy:actor};g.monsters=[...combatMonsters(g),added];g.monster=g.monsters[0];g.combatRevision=(g.combatRevision||0)+1;
 recordSabotage(g,actor);return{ok:true,monster:added,enabler,free};
}
export function interfereWithEnhancer(g,actor,uid,targetUid){
 if(g.phase!=='combat'||actor===g.turn)return{ok:false};const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid&&c.type==='enhancer'),m=combatMonsters(g).find(m=>m.uid===targetUid);if(!c||!m)return{ok:false};
 p.hand=p.hand.filter(x=>x.uid!==uid);discard(g,c);m.power=Math.max(1,m.power+c.delta);if(c.delta>0)m.reward++;g.combatRevision=(g.combatRevision||0)+1;recordSabotage(g,actor);return{ok:true,card:c,monster:m};
}
export function beginReactions(g,pending='fight'){
 if(g.phase!=='combat')return false;const order=g.players.map((_,i)=>(g.turn+i+1)%g.players.length).filter(i=>i!==g.turn);
 g.reaction={pending,order,index:0,revision:g.combatRevision||0};return true;
}
export const reactingPlayer=g=>g.reaction?.order[g.reaction.index]??null;
export function passReaction(g){if(!g.reaction)return null;g.reaction.index++;if(g.reaction.index<g.reaction.order.length)return null;const pending=g.reaction.pending;const changed=g.reaction.revision!==(g.combatRevision||0);g.reaction=null;return{pending,changed}}
// Resolve one monster at a time so later choices see cards already lost to Bad Stuff.
function escapeResult(g,actor,m,roll,bonus,automatic,options={}){const p=g.players[actor],escaped=automatic||roll+bonus>=5;const notes=escaped?'':badStuff(g,p,m,options);return{actor,monster:m,roll,bonus,automatic,escaped,death:!escaped&&!!p.dead,notes}}
function completeEscape(g,results){awardDarkAfterEscape(g,results.some(r=>r.death));discard(g,combatMonsters(g));g.charmedLoot=0;g.phase='done';g.reaction=null;return results}
export function runAway(g,rollDie=()=>1+Math.floor(Math.random()*6),options={}){const results=[];for(const actor of [g.turn,...(g.helper===null?[]:[g.helper])]){const p=g.players[actor];for(const m of combatMonsters(g)){const automatic=automaticEscape(p,m),roll=automatic?0:rollDie();const r=escapeResult(g,actor,m,roll,escapeBonus(p,m),automatic,{rollDie:options.badStuffRoll||rollDie,chooseCards:options.chooseCards});results.push(r);if(p.dead)break}}return completeEscape(g,results)}
export async function runAwayInteractive(g,choose,rollDie=()=>1+Math.floor(Math.random()*6),chooseBadStuff=null){
 const results=[];
 for(const actor of [g.turn,...(g.helper===null?[]:[g.helper])]){
  const p=g.players[actor];let flightSpent=0;
  for(const m of combatMonsters(g)){
   const automatic=automaticEscape(p,m);let roll=automatic?0:await rollDie(actor,m),bonus=escapeBonus(p,m),retry=false;
   while(!automatic&&roll+bonus<5){
    const max=has(p,'Wizard')?Math.min(3-flightSpent,p.hand.length):0,halfling=has(p,'Halfling')&&!retry&&p.hand.length>0;if(!max&&!halfling)break;
    const choice=await choose({actor,monster:m,roll,bonus,max,halfling,cards:[...p.hand]}),ids=choice?.uids||[];if(!ids.length||new Set(ids).size!==ids.length||!ids.every(id=>p.hand.some(c=>c.uid===id)))break;
    if(choice.key==='flight'&&ids.length<=max){const spent=p.hand.filter(c=>ids.includes(c.uid));p.hand=p.hand.filter(c=>!ids.includes(c.uid));discard(g,spent);bonus+=ids.length;flightSpent+=ids.length;continue}
    if(choice.key==='retry'&&halfling&&ids.length===1){const c=p.hand.find(c=>c.uid===ids[0]);p.hand=p.hand.filter(c=>c.uid!==ids[0]);discard(g,c);roll=await rollDie(actor,m);retry=true;continue}break;
   }
   // Ask before applying each effect, using the current hand after preceding monsters.
   const decisions=new Map();if(!automatic&&roll+bonus<5&&chooseBadStuff)for(const effect of m.badStuff||[]){if(effect.type==='discardHand'&&effect.count||effect.potionsReduce){const cards=effect.potionsReduce?p.hand.filter(c=>c.type==='potion'):[...p.hand],count=Math.min(effect.count||effect.amount,cards.length);if(count)decisions.set(effect,await chooseBadStuff({actor,monster:m,cards,count,optional:!!effect.potionsReduce}))}}
   let choiceIndex=0;const selections=[...decisions.values()];const r=escapeResult(g,actor,m,roll,bonus,automatic,{rollDie:()=>1+Math.floor(Math.random()*6),chooseCards:(cards,count,optional)=>selections[choiceIndex++]||(optional?[]:cards.slice(0,count).map(c=>c.uid))});results.push(r);if(p.dead)break;
  }
 }
 return completeEscape(g,results);
}
export function interfereWithPotion(g,actor,uid){
 if(g.phase!=='combat'||actor===g.turn)return{ok:false};const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid&&c.type==='potion');if(!c)return{ok:false};p.hand=p.hand.filter(c=>c.uid!==uid);discard(g,c);const bonus=c.bonus*(has(p,'Lizard Guy')?2:1);g.boost-=bonus;g.combatRevision=(g.combatRevision||0)+1;recordSabotage(g,actor);return{ok:true,bonus,card:c};
}
