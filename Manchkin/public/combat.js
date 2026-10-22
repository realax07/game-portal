import {discard} from './decks.js';
import {escapeBonus,has} from './traits.js';
// Combat is a group of monsters. g.monster is retained as the first member for
// old saves; all calculations go through these functions.
export function combatMonsters(g){return g.monsters?.length?g.monsters:g.monster?[g.monster]:[]}
export const monsterPower=g=>combatMonsters(g).reduce((n,m)=>n+m.power,0);
export const combatRewards=g=>({levels:combatMonsters(g).reduce((n,m)=>n+(m.levels||1),0),treasures:combatMonsters(g).reduce((n,m)=>n+m.reward,0)});
export function startCombat(g,card){g.abilityUses={};g.charmedLoot=0;g.illusionBonus=0;const m={...card,printedPower:card.printedPower??card.power,power:Math.max(1,card.power+(g.dungeon?.delta||0))};g.monster=m;g.monsters=[m];g.phase='combat';g.reaction=null;g.combatRevision=(g.combatRevision||0)+1;return m}
export function wanderingOptions(g,actor){if(g.phase!=='combat'||actor===g.turn)return[];const p=g.players[actor];if(!p)return[];const wandering=p.hand.some(c=>c.type==='wandering');const undead=combatMonsters(g).some(m=>m.undead);return p.hand.filter(c=>c.type==='monster'&&(wandering||(c.undead&&undead)))}
export function addWanderingMonster(g,actor,monsterUid){
 const p=g.players[actor],m=wanderingOptions(g,actor).find(c=>c.uid===monsterUid);if(!m)return{ok:false,reason:'Нужны монстр и Бродячая тварь — либо нежить к другой нежити.'};
 const free=m.undead&&combatMonsters(g).some(c=>c.undead);const enabler=free?null:p.hand.find(c=>c.type==='wandering');
 discard(g,enabler);const consumed=[m.uid,...(enabler?[enabler.uid]:[])];p.hand=p.hand.filter(c=>!consumed.includes(c.uid));
 const added={...m,power:Math.max(1,m.power+(g.dungeon?.delta||0)),addedBy:actor};g.monsters=[...combatMonsters(g),added];g.monster=g.monsters[0];g.combatRevision=(g.combatRevision||0)+1;
 return{ok:true,monster:added,enabler,free};
}
export function interfereWithEnhancer(g,actor,uid,targetUid){
 if(g.phase!=='combat'||actor===g.turn)return{ok:false};const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid&&c.type==='enhancer'),m=combatMonsters(g).find(m=>m.uid===targetUid);if(!c||!m)return{ok:false};
 p.hand=p.hand.filter(x=>x.uid!==uid);discard(g,c);m.power=Math.max(1,m.power+c.delta);if(c.delta>0)m.reward++;g.combatRevision=(g.combatRevision||0)+1;return{ok:true,card:c,monster:m};
}
export function beginReactions(g,pending='fight'){
 if(g.phase!=='combat')return false;const order=g.players.map((_,i)=>(g.turn+i+1)%g.players.length).filter(i=>i!==g.turn);
 g.reaction={pending,order,index:0,revision:g.combatRevision||0};return true;
}
export const reactingPlayer=g=>g.reaction?.order[g.reaction.index]??null;
export function passReaction(g){if(!g.reaction)return null;g.reaction.index++;if(g.reaction.index<g.reaction.order.length)return null;const pending=g.reaction.pending;const changed=g.reaction.revision!==(g.combatRevision||0);g.reaction=null;return{pending,changed}}
// Run Away is rolled separately for each monster. Stop on death.
export function runAway(g,rollDie=()=>1+Math.floor(Math.random()*6)){
 const p=g.players[g.turn],results=[];
 for(const m of combatMonsters(g)){
  const roll=rollDie(),bonus=escapeBonus(p,m),escaped=roll+bonus>=5;results.push({monster:m,roll,bonus,escaped,death:!escaped&&!!m.death});
  if(!escaped){if(m.death){discard(g,p.hand,p.equipment.filter(c=>!['class','race','multiclass','multirace'].includes(c.type)));p.hand=[];p.equipment=p.equipment.filter(c=>['class','race','multiclass','multirace'].includes(c.type));p.dead=true;break}else p.level=Math.max(1,p.level-1)}
 }
 discard(g,combatMonsters(g));g.charmedLoot=0;g.phase='done';g.reaction=null;return results;
}
// Human choices happen after seeing the failed die roll. The synchronous path
// remains available for bots and deterministic engine tests.
export async function runAwayInteractive(g,choose,rollDie=()=>1+Math.floor(Math.random()*6)){
 const p=g.players[g.turn],rolls=[];let flightSpent=0;
 for(const m of combatMonsters(g)){
  let roll=rollDie(),bonus=escapeBonus(p,m),retry=false;
  for(;;){
   if(roll+bonus>=5)break;
   const max=has(p,'Wizard')?Math.min(3-flightSpent,p.hand.length):0,halfling=has(p,'Halfling')&&!retry&&p.hand.length>0;
   if(!max&&!halfling)break;
   const choice=await choose({monster:m,roll,bonus,max,halfling,cards:[...p.hand]});
   const ids=choice?.uids||[];
   if(!ids.length||new Set(ids).size!==ids.length||!ids.every(id=>p.hand.some(c=>c.uid===id)))break;
   if(choice.key==='flight'&&ids.length<=max){const spent=p.hand.filter(c=>ids.includes(c.uid));p.hand=p.hand.filter(c=>!ids.includes(c.uid));discard(g,spent);bonus+=ids.length;flightSpent+=ids.length;continue}
   if(choice.key==='retry'&&halfling&&ids.length===1){const c=p.hand.find(c=>c.uid===ids[0]);p.hand=p.hand.filter(c=>c.uid!==ids[0]);discard(g,c);roll=rollDie();retry=true;continue}break;
  }
  rolls.push({roll,bonus});if(roll+bonus<5&&m.death)break;
 }
 // Replay the chosen effective rolls through the common Bad Stuff handler.
 let i=0;const results=runAway(g,()=>{const r=rolls[i++];return r.roll+r.bonus-escapeBonus(p,combatMonsters(g)[i-1])});
 results.forEach((r,i)=>Object.assign(r,rolls[i]));return results;
}
export function interfereWithPotion(g,actor,uid){
 if(g.phase!=='combat'||actor===g.turn)return{ok:false};const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid&&c.type==='potion');if(!c)return{ok:false};p.hand=p.hand.filter(c=>c.uid!==uid);discard(g,c);const bonus=c.bonus*(has(p,'Lizard Guy')?2:1);g.boost-=bonus;g.combatRevision=(g.combatRevision||0)+1;return{ok:true,bonus,card:c};
}
