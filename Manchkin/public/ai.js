import {equipPlan,equipCard} from './equipment.js';
import {abilityOptions,abilityCosts,combatStrength} from './abilities.js';
import {combatMonsters,monsterPower,combatRewards,wanderingOptions} from './combat.js';
import {has} from './traits.js';
import {treasureActions} from './card-effects.js';
import {canWin,power} from './engine.js';
// Profiles affect actual decisions; random selection is persisted in the save.
export const BOT_PROFILES=[
 {id:'berserker',name:'Берсерк',icon:'⚔',desc:'Ищет драки, смело тратит усиления и предпочитает воинов.',risk:3,spend:.9,spite:.55,help:.2,hunt:.95,trade:.2,steal:.2,prefer:['Warrior','Orc','Druid']},
 {id:'survivor',name:'Осторожный',icon:'🛡',desc:'Бережёт уровни и способы смывки. В опасный бой идёт только с запасом.',risk:0,spend:.4,spite:.15,help:.25,hunt:.1,trade:.45,steal:0,prefer:['Elf','Wizard','Dwarf']},
 {id:'merchant',name:'Торгаш',icon:'◈',desc:'Превращает лишние вещи в уровни, копит ценные карты и ценит хафлингов.',risk:1,spend:.25,spite:.25,help:.5,hunt:.35,trade:1,steal:.15,prefer:['Halfling','Bard','Dwarf']},
 {id:'tactician',name:'Тактик',icon:'♜',desc:'Считает перевес и тратит самые дешёвые карты, когда они меняют исход.',risk:1,spend:.65,spite:.6,help:.4,hunt:.7,trade:.55,steal:.3,prefer:['Wizard','Warrior','Gnome']},
 {id:'diplomat',name:'Дипломат',icon:'☮',desc:'Чаще помогает и зовёт помощников, но не дарит соперникам победу.',risk:1,spend:.4,spite:.1,help:1,hunt:.4,trade:.35,steal:0,prefer:['Elf','Bard','Ranger']},
 {id:'saboteur',name:'Саботажник',icon:'☠',desc:'Любит подкидывать монстров и подрезать. Особенно мешает лидерам.',risk:2,spend:.65,spite:1,help:.1,hunt:.55,trade:.25,steal:.75,prefer:['Thief','Lizard Guy','Orc']},
 {id:'hunter',name:'Охотник',icon:'➶',desc:'Оставляет слабых монстров для собственных боёв и выбирает выгодную добычу.',risk:2,spend:.6,spite:.45,help:.35,hunt:1,trade:.4,steal:.15,prefer:['Ranger','Warrior','Elf']},
 {id:'collector',name:'Коллекционер',icon:'▣',desc:'Берегёт полезные шмотки и редкие действия, охотится за сокровищами.',risk:1,spend:.15,spite:.2,help:.6,hunt:.65,trade:.05,steal:.4,prefer:['Dwarf','Wizard','Bug']},
 {id:'avenger',name:'Мститель',icon:'♞',desc:'Помнит, кто подставлял его, и в первую очередь отвечает обидчикам.',risk:2,spend:.7,spite:.5,help:.25,hunt:.65,trade:.35,steal:.6,prefer:['Thief','Orc','Warrior']},
 {id:'opportunist',name:'Оппортунист',icon:'◷',desc:'Помогает ради выгоды, подставляет, когда это меняет исход, и тормозит победный бой.',risk:1,spend:.5,spite:.65,help:.55,hunt:.8,trade:.65,steal:.45,prefer:['Halfling','Elf','Thief']}
];
export const botProfile=p=>BOT_PROFILES.find(x=>x.id===p.aiProfile)||BOT_PROFILES[3];
export function assignBotProfiles(players,rng=Math.random){const pool=[...BOT_PROFILES];for(const p of players)if(p.bot){const i=Math.min(pool.length-1,Math.floor(rng()*pool.length));p.aiProfile=pool.splice(i,1)[0].id;p.aiMemory={}}}
export function rememberSabotage(g,actor){if(actor===g.turn||actor===g.helper)return;const victim=g.players[g.turn];if(victim.bot){victim.aiMemory??={};victim.aiMemory[actor]=(victim.aiMemory[actor]||0)+1}}
const pretend=g=>({...g,players:g.players.map(p=>({...p,hand:[...p.hand],equipment:[...p.equipment]})),monsters:combatMonsters(g).map(m=>({...m})),abilityUses:{...g.abilityUses},discards:{doors:[...(g.discards?.doors||[])],treasures:[...(g.discards?.treasures||[])]}});
const identityValue=(c,profile)=>['class','race'].includes(c.type)?6+(profile.prefer.includes(c.en)?8-profile.prefer.indexOf(c.en):0):c.limit?Math.min(c.limit,4)*2:c.type==='quest'?2:0;
const loadoutValue=(p,profile)=>power(p)*3+p.equipment.reduce((n,c)=>n+identityValue(c,profile),0);
export function cardKeepValue(p,c,profile=botProfile(p)){
 if(c.type==='escape')return 7-profile.risk;
 if(c.type==='wandering')return 2+profile.spite*6;
 if(c.type==='enhancer')return 2+profile.spite*5;
 if(c.type==='monster')return profile.hunt*(c.power<power(p)?5:1)+profile.spite*(c.power/5);
 if(c.type==='level')return p.level<9?10:2;
 if(c.type==='potion')return (c.bonus||0)*.7+3;
 if(c.type==='item')return 1+(c.bonus||0)+identityValue(c,profile);
 return identityValue(c,profile)||1;
}
const cheapCards=(p,profile)=>[...p.hand].sort((a,b)=>cardKeepValue(p,a,profile)-cardKeepValue(p,b,profile));
function costFor(p,a,profile,g,targetUid){const n=a.monsterCost?combatMonsters(g).find(m=>m.uid===targetUid)?.reward:a.cost;return cheapCards(p,profile).slice(0,n).map(c=>c.uid)}
export function willingToHelp(g,actor,rng=Math.random){const p=g.players[actor],profile=botProfile(p),fighter=g.players[g.turn],rewards=combatRewards(g);if(p.dead)return false;if(fighter.level+rewards.levels>=10)return has(p,'Elf')&&p.level+combatMonsters(g).length>=10;const sim=pretend(g);sim.helper=actor;const margin=combatStrength(sim)-monsterPower(sim);if(margin<profile.risk*-1)return false;return has(p,'Elf')||rng()<profile.help}
export function chooseBotAction(g,actor,stage,rng=Math.random){
 const p=g.players[actor],profile=botProfile(p);if(!p?.bot||p.dead||g.winner!==null)return{type:'pass'};
 const cheap=cheapCards(p,profile),abilities=abilityOptions(g,actor).filter(a=>a.enabled);
 if(stage==='prepare'){
  let best=null,score=0;for(const c of p.hand.filter(c=>['item','class','race','multiclass','multirace','quest'].includes(c.type))){const initial=equipPlan(p,c),replacements=initial.choices||[null];for(const r of replacements){const sim={...p,hand:[...p.hand],equipment:[...p.equipment]},plan=equipCard(sim,c,r?.uid);if(!plan.ok)continue;const gain=loadoutValue(sim,profile)-loadoutValue(p,profile);if(gain>score){score=gain;best={type:'equip',uid:c.uid,replaceUid:r?.uid??null}}}}if(best)return best;
  const level=p.hand.find(c=>c.type==='level');if(level&&p.level<9)return{type:'play',uid:level.uid};
  const sell=p.hand.filter(c=>c.type==='item'&&!c.tamed).sort((a,b)=>cardKeepValue(p,a,profile)-cardKeepValue(p,b,profile))[0];if(sell&&p.level<9&&profile.trade>.3&&(profile.trade>.8||p.hand.length>5))return{type:'sell',uid:sell.uid};
  const curse=p.hand.find(c=>c.type==='curse');if(curse&&profile.spite>.4){const targets=g.players.map((x,i)=>({p:x,i,score:x.level*2+(profile.id==='avenger'?(p.aiMemory?.[i]||0)*5:0)})).filter(x=>x.i!==actor&&!x.p.dead&&x.p.level>1).sort((a,b)=>b.score-a.score);if(targets[0])return{type:'play',uid:curse.uid,target:targets[0].i}}
  const theft=abilities.find(a=>a.key==='steal');if(theft&&profile.steal>.35&&!g.aiTheftUsed){const target=theft.targets.map(t=>({t,c:g.players.flatMap(p=>p.equipment).find(c=>c.uid===t.uid)})).sort((a,b)=>(b.c.bonus||0)-(a.c.bonus||0))[0];if(target&&(target.c.bonus||0)>=2&&cheap.length)return{type:'ability',key:'steal',targetUid:target.t.uid,costUids:[cheap[0].uid]}}
  return{type:'door'};
 }
 if(stage==='react'){
  if(actor===g.helper)return{type:'pass'};
  const fighter=g.players[g.turn],winning=fighter.level+combatRewards(g).levels>=10,revenge=profile.id==='avenger'&&(p.aiMemory?.[g.turn]||0)>0;
  if(!winning&&!revenge&&(rng()>profile.spite||!canWin(g)))return{type:'pass'};
  const deficit=combatStrength(g)-monsterPower(g),strikes=[];
  for(const m of wanderingOptions(g,actor)){const cost=m.undead&&combatMonsters(g).some(x=>x.undead)?1:2;strikes.push({type:'wander',uid:m.uid,impact:m.power,cost:cost*2+cardKeepValue(p,m,profile)*.2})}
  for(const c of p.hand){if(c.type==='enhancer'&&c.delta>0)strikes.push({type:'enhance',uid:c.uid,targetUid:combatMonsters(g)[0]?.uid,impact:c.delta,cost:3});if(c.type==='potion')strikes.push({type:'hostile-potion',uid:c.uid,impact:c.bonus*(has(p,'Lizard Guy')?2:1),cost:3+c.bonus*.2})}
  const stab=abilities.find(a=>a.key==='backstab');if(stab&&cheap.length)strikes.push({type:'ability',key:'backstab',targetUid:stab.targets[0]?.uid,costUids:[cheap[0].uid],impact:2,cost:cardKeepValue(p,cheap[0],profile)});
  const decisive=strikes.filter(a=>a.impact>deficit||a.impact===deficit&&!has(fighter,'Warrior')).sort((a,b)=>a.cost-b.cost||a.impact-b.impact);
  if(decisive.length)return decisive[0];if((winning||revenge||profile.id==='saboteur')&&strikes.length)return strikes.sort((a,b)=>b.impact-a.impact)[0];return{type:'pass'};
 }
 if(stage==='loot'){
  if(rng()<profile.hunt){const candidates=p.hand.filter(c=>c.type==='monster').map(c=>{const sim=pretend(g);sim.monsters=[{...c}];sim.monster=sim.monsters[0];sim.phase='combat';sim.boost=0;sim.helper=null;return{c,margin:combatStrength(sim)-monsterPower(sim),win:canWin(sim)}}).filter(x=>x.win&&x.margin>=Math.max(0,2-profile.risk)).sort((a,b)=>(b.c.reward*1.5+(b.c.levels||1)*3)-(a.c.reward*1.5+(a.c.levels||1)*3));if(candidates.length)return{type:'trouble',uid:candidates[0].c.uid}}
  return{type:'loot'};
 }
 if(stage==='combat'){
  if(canWin(g))return{type:'fight'};
  const deficit=monsterPower(g)-combatStrength(g)+1;
  const actions=[];
  for(const a of abilities){if(['berserk','turn','claws','illusion','charm','tame','enthrall'].includes(a.key)){
   let targets=[...a.targets];if(a.key==='illusion')targets.sort((a,b)=>p.hand.find(c=>c.uid===b.uid).power-p.hand.find(c=>c.uid===a.uid).power);if(['charm','tame'].includes(a.key))targets.sort((a,b)=>{const x=combatMonsters(g).find(m=>m.uid===a.uid),y=combatMonsters(g).find(m=>m.uid===b.uid);return (y.power+(a.key==='tame'?y.reward:0))-(x.power+(a.key==='tame'?x.reward:0))});if(a.key==='enthrall')targets.sort((a,b)=>power(g.players[b.uid])-power(g.players[a.uid]));const target=targets[0]?.uid??null;
   const costUids=costFor(p,a,profile,g,target);if(!a.wholeHand&&a.cost!==0&&costUids.length!==(a.monsterCost?combatMonsters(g).find(m=>m.uid===target)?.reward:a.cost))continue;
   if(a.wholeHand&&profile.spend<.5&&p.hand.length>4)continue;if(a.key==='charm'){const sim=pretend(g);sim.monsters=sim.monsters.filter(m=>m.uid!==target);sim.monster=sim.monsters[0]||null;if(sim.monsters.length&&!canWin(sim))continue;}
   actions.push({type:'ability',key:a.key,targetUid:target,costUids,priority:['turn','claws','illusion'].includes(a.key)?6:a.key==='berserk'?4:a.key==='enthrall'?2:1});
  }}
  const potion=p.hand.filter(c=>c.type==='potion').sort((a,b)=>(a.bonus>=deficit?0:1)-(b.bonus>=deficit?0:1)||a.bonus-b.bonus)[0];if(potion&&(profile.spend>.5||potion.bonus>=deficit))actions.push({type:'play',uid:potion.uid,priority:5});
  if(actions.length)return actions.sort((a,b)=>b.priority-a.priority)[0];
  if(!g.helpUsed){const helpers=g.players.map((h,i)=>({h,i})).filter(x=>x.i!==actor&&!x.h.dead).filter(({h,i})=>{const sim=pretend(g);sim.helper=i;return canWin(sim)&&(!h.bot||willingToHelp(g,i,()=>0))}).sort((a,b)=>(a.h.bot?0:1)-(b.h.bot?0:1)||power(b.h)-power(a.h));if(helpers.length)return{type:'help',target:helpers[0].i}}
  const treasure=treasureActions(g,actor).find(a=>['ratEscape','sacrificeHireling','sacrificeSteedAll'].includes(a.key));if(treasure)return{type:'treasure',uid:treasure.uid,targetUid:treasure.targets[0]?.uid??null};
  const escape=p.hand.find(c=>c.type==='escape');if(escape)return{type:'play',uid:escape.uid};
  return{type:'run'};
 }
 return{type:'pass'};
}
