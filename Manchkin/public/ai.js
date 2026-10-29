import {helperAllowed,noHelpFor} from './axe-mechanics.js';
import {monsterActions} from './monster-actions.js';
import {kneepadTargets,hirelingOptions} from './advanced-specials.js';
import {specialOptions} from './special-cards.js';
import {playLevelCard,levelTargets} from './level-cards.js';
import {equipPlan,equipCard} from './equipment.js';
import {abilityOptions,abilityCosts,combatStrength} from './abilities.js';
import {combatMonsters,monsterPower,combatRewards,wanderingOptions} from './combat.js';
import {has} from './traits.js';
import {treasureActions,canSellCard,canUsePotion} from './card-effects.js';
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
const pretend=g=>structuredClone(g);
const specialGearValue=c=>(c.itemIdentity?3:0)+(c.blockOutsidePotions?5:0)+(c.protectThief?4:0)+(c.protectPlayerCurses?5:0)+(c.extraHands||0)*2+(c.runAway||0)*2;
const identityValue=(c,profile)=>['class','race'].includes(c.type)?6+(profile.prefer.includes(c.en)?8-profile.prefer.indexOf(c.en):0):c.limit?Math.min(c.limit,4)*2:c.type==='quest'?2:0;
const loadoutValue=(p,profile)=>power(p)*3+p.equipment.reduce((n,c)=>n+identityValue(c,profile)+specialGearValue(c),0);
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
export function willingToHelp(g,actor,rng=Math.random){const p=g.players[actor],profile=botProfile(p),fighter=g.players[g.turn],rewards=combatRewards(g);if(!helperAllowed(g,actor)||p.dead||(combatMonsters(g).some(m=>m.noHelp)||(g.dopplegangers||[]).some(d=>d.owner===g.turn)))return false;if(fighter.level+rewards.levels>=10)return has(p,'Elf')&&p.level+combatMonsters(g).length>=10;const sim=pretend(g);sim.helper=actor;const margin=combatStrength(sim)-monsterPower(sim);if(margin<profile.risk*-1)return false;return has(p,'Elf')||rng()<profile.help}
export function chooseBotAction(g,actor,stage,rng=Math.random){
 const p=g.players[actor],profile=botProfile(p);if(!p?.bot||p.dead||g.winner!==null||g.pendingDivine||g.pendingEncounter)return{type:'pass'};
 const cheap=cheapCards(p,profile),abilities=abilityOptions(g,actor).filter(a=>a.enabled);
 if(stage==='prepare'){
  let best=null,score=0;for(const c of p.hand.filter(c=>['item','hireling','title','class','race','multiclass','multirace','quest'].includes(c.type))){const initial=equipPlan(p,c),replacements=initial.choices||[null];for(const r of replacements){const sim={...p,hand:[...p.hand],equipment:[...p.equipment]},plan=equipCard(sim,c,r?.uid);if(!plan.ok)continue;const gain=loadoutValue(sim,profile)-loadoutValue(p,profile);if(gain>score){score=gain;best={type:'equip',uid:c.uid,replaceUid:r?.uid??null}}}}if(best)return best;
  const load=hirelingOptions(g,actor).find(o=>{const c=[...p.hand,...p.equipment].find(c=>c.uid===o.itemUid);const current=p.equipment.filter(x=>x.hirelingUid===o.hirelingUid).reduce((n,x)=>n+(x.bonus||0),0);return p.hand.includes(c)&&(c.bonus||0)>current});if(stage==='prepare'&&load)return{type:'hireling',id:load.id};
  const cheat=p.hand.find(c=>c.effect==='cheat');if(stage==='prepare'&&cheat){const options=specialOptions(g,actor,cheat);const target=options?.targets.find(t=>p.hand.some(c=>c.uid===t.uid&&(c.bonus||0)>0));if(target)return{type:'special',uid:cheat.uid,targetUid:target.uid}}
  const level=p.hand.find(c=>c.type==='level'&&levelTargets(g,actor,c).includes(actor));if(level&&p.level<9){const rest=p.hand.filter(c=>c.uid!==level.uid);if(level.levelCondition==='navel'&&p.level<=7&&rest.length>=3&&profile.spend>.6&&rest.every(c=>cardKeepValue(p,c,profile)<5))return{type:'level',uid:level.uid,target:actor,discardHand:true};return{type:'play',uid:level.uid}};
  const axe=p.hand.find(c=>['ofDoom','garageSale','exchangeHand'].includes(c.effect)&&specialOptions(g,actor,c));if(axe){const o=specialOptions(g,actor,axe),target=o.targets[0];return{type:'special',uid:axe.uid,targetUid:target?.uid}}
  const map=p.hand.find(c=>c.effect==='peekDoors'&&specialOptions(g,actor,c));if(map)return{type:'special',uid:map.uid};
  const stealLevel=p.hand.find(c=>c.effect==='stealLevel'&&specialOptions(g,actor,c));if(stealLevel){const target=[...specialOptions(g,actor,stealLevel).targets].sort((a,b)=>g.players[b.uid].level-g.players[a.uid].level)[0];return{type:'special',uid:stealLevel.uid,targetUid:target.uid}}const sell=p.hand.filter(canSellCard).sort((a,b)=>cardKeepValue(p,a,profile)-cardKeepValue(p,b,profile))[0];if(sell&&p.level<9&&profile.trade>.3&&(profile.trade>.8||p.hand.length>5))return{type:'sell',uid:sell.uid};
  const curse=p.hand.find(c=>c.type==='curse');if(curse&&profile.spite>.4){const targets=g.players.map((x,i)=>({p:x,i,score:x.level*2+(profile.id==='avenger'?(p.aiMemory?.[i]||0)*5:0)})).filter(x=>x.i!==actor&&!x.p.dead&&x.p.level>1).sort((a,b)=>b.score-a.score);if(targets[0])return{type:'play',uid:curse.uid,target:targets[0].i}}
  const theft=abilities.find(a=>a.key==='steal');if(theft&&profile.steal>.35&&!g.aiTheftUsed){const target=theft.targets.map(t=>({t,c:g.players.flatMap(p=>p.equipment).find(c=>c.uid===t.uid)})).sort((a,b)=>(b.c.bonus||0)-(a.c.bonus||0))[0];if(target&&(target.c.bonus||0)>=2&&cheap.length)return{type:'ability',key:'steal',targetUid:target.t.uid,costUids:[cheap[0].uid]}}
  return{type:'door'};
 }
 if(stage==='react'){
  const level=p.hand.find(c=>c.type==='level'&&levelTargets(g,actor,c).includes(actor));if(level)return{type:'level',uid:level.uid,target:actor};if(g.reaction?.pending==='aftermath')return{type:'pass'};if(actor===g.helper)return{type:'pass'};
  const fighter=g.players[g.turn],winning=fighter.level+combatRewards(g).levels>=10,revenge=profile.id==='avenger'&&(p.aiMemory?.[g.turn]||0)>0;
  if(!winning&&!revenge&&(rng()>profile.spite||!canWin(g)))return{type:'pass'};
  const dismissal=p.hand.find(c=>['outToLunch','friendship','pollymorph','deadMonster','disbelief'].includes(c.effect)&&specialOptions(g,actor,c));if(winning&&dismissal)return{type:'special',uid:dismissal.uid,targetUid:specialOptions(g,actor,dismissal).targets[0]?.uid};
  const transfer=p.hand.find(c=>c.effect==='transferCombat'&&specialOptions(g,actor,c));if(winning&&transfer){const own=specialOptions(g,actor,transfer).targets.find(t=>t.uid===actor);if(own)return{type:'special',uid:transfer.uid,targetUid:actor}}
  const coward=p.hand.find(c=>c.effect==='cowardice'&&specialOptions(g,actor,c));if(coward&&winning)return{type:'special',uid:coward.uid};
  const deficit=combatStrength(g)-monsterPower(g),strikes=[];for(const c of p.hand.filter(c=>['mommy','itching','annihilation'].includes(c.effect))){const opts=specialOptions(g,actor,c);const target=opts?.targets[0];if(target&&c.effect==='mommy'){const m=combatMonsters(g).find(m=>m.uid===target.uid);strikes.push({type:'special',uid:c.uid,targetUid:target.uid,impact:(m?.power||0)+10,cost:3})}}
  for(const m of wanderingOptions(g,actor)){const cost=m.undead&&combatMonsters(g).some(x=>x.undead)?1:2;strikes.push({type:'wander',uid:m.uid,impact:m.power,cost:cost*2+cardKeepValue(p,m,profile)*.2})}
  for(const c of p.hand){if(c.type==='mate'){const target=[...combatMonsters(g)].sort((a,b)=>b.power-a.power)[0];if(target)strikes.push({type:'mate',uid:c.uid,targetUid:target.uid,impact:target.power,cost:4})}if(c.type==='enhancer'&&(c.delta>0||c.noTreasure))strikes.push({type:'enhance',uid:c.uid,targetUid:combatMonsters(g)[0]?.uid,impact:c.delta||0,cost:3});if(c.type==='potion'&&c.allowedMonsters!==false&&canUsePotion(g,actor,c))strikes.push({type:'hostile-potion',uid:c.uid,impact:c.bonus*(has(p,'Lizard Guy')?2:1),cost:3+c.bonus*.2})}
  for(const c of p.hand.filter(c=>c.effect==='illusionSwap')){const opts=specialOptions(g,actor,c);for(const t of opts?.targets||[]){const sim=pretend(g),replacement=p.hand.find(c=>c.uid===t.replacementUid);sim.monsters=sim.monsters.map(m=>m.uid===t.targetUid?{...replacement}:m);sim.monster=sim.monsters[0];const impact=monsterPower(sim)-monsterPower(g);if(impact>0)strikes.push({type:'special',uid:c.uid,targetUid:t.uid,impact,cost:4})}}
  const stab=abilities.find(a=>a.key==='backstab');if(stab&&cheap.length)strikes.push({type:'ability',key:'backstab',targetUid:stab.targets[0]?.uid,costUids:[cheap[0].uid],impact:2,cost:cardKeepValue(p,cheap[0],profile)});
  const decisive=strikes.filter(a=>a.impact>deficit||a.impact===deficit&&!has(fighter,'Warrior')).sort((a,b)=>a.cost-b.cost||a.impact-b.impact);
  if(decisive.length)return decisive[0];if((winning||revenge||profile.id==='saboteur')&&strikes.length)return strikes.sort((a,b)=>b.impact-a.impact)[0];return{type:'pass'};
 }
 if(stage==='loot'){
  if(!g.lootRoomOnly&&rng()<profile.hunt){const candidates=p.hand.filter(c=>c.type==='monster').map(c=>{const sim=pretend(g);sim.monsters=[{...c}];sim.monster=sim.monsters[0];sim.phase='combat';sim.boost=0;sim.helper=null;return{c,margin:combatStrength(sim)-monsterPower(sim),win:canWin(sim)}}).filter(x=>x.win&&x.margin>=Math.max(0,2-profile.risk)).sort((a,b)=>(b.c.reward*1.5+(b.c.levels||1)*3)-(a.c.reward*1.5+(a.c.levels||1)*3));if(candidates.length)return{type:'trouble',uid:candidates[0].c.uid}}
  return{type:'loot'};
 }
 if(stage==='combat'){const friendly=p.hand.find(c=>c.effect==='friendly'&&specialOptions(g,actor,c));if(friendly)return{type:'special',uid:friendly.uid,targetUid:'peace'};if(g.mustRunAway)return{type:'run'};
  if(canWin(g))return{type:'fight'};
  const deficit=monsterPower(g)-combatStrength(g)+1;
  const actions=[];
  for(const a of abilities){if(['berserk','turn','claws','illusion','charm','tame','enthrall'].includes(a.key)){
   let targets=[...a.targets];if(a.key==='illusion')targets.sort((a,b)=>p.hand.find(c=>c.uid===b.uid).power-p.hand.find(c=>c.uid===a.uid).power);if(['charm','tame'].includes(a.key))targets.sort((a,b)=>{const x=combatMonsters(g).find(m=>m.uid===a.uid),y=combatMonsters(g).find(m=>m.uid===b.uid);return (y.power+(a.key==='tame'?y.reward:0))-(x.power+(a.key==='tame'?x.reward:0))});if(a.key==='enthrall')targets.sort((a,b)=>power(g.players[b.uid])-power(g.players[a.uid]));const target=targets[0]?.uid??null;
   const costUids=costFor(p,a,profile,g,target);if(!a.wholeHand&&a.cost!==0&&costUids.length!==(a.monsterCost?combatMonsters(g).find(m=>m.uid===target)?.reward:a.cost))continue;
   if(a.wholeHand&&profile.spend<.5&&p.hand.length>4)continue;if(a.key==='charm'){const sim=pretend(g);sim.monsters=sim.monsters.filter(m=>m.uid!==target);sim.monster=sim.monsters[0]||null;if(sim.monsters.length&&!canWin(sim))continue;}
   actions.push({type:'ability',key:a.key,targetUid:target,costUids,priority:['turn','claws','illusion'].includes(a.key)?6:a.key==='berserk'?4:a.key==='enthrall'?2:1});
  }}
  for(const c of p.hand.filter(c=>['outToLunch','friendship','pollymorph','magicLamp','deadMonster','disbelief'].includes(c.effect))){const option=specialOptions(g,actor,c);if(!option)continue;const targets=[...option.targets].sort((a,b)=>combatMonsters(g).find(m=>m.uid===b.uid).power-combatMonsters(g).find(m=>m.uid===a.uid).power);const removed=combatMonsters(g).find(m=>m.uid===targets[0]?.uid);if(!removed||combatStrength(g)>monsterPower(g)-removed.power)actions.push({type:'special',uid:c.uid,targetUid:removed?.uid,priority:2})}
  for(const c of p.hand.filter(c=>['helpMe','killNose','dowsing'].includes(c.effect))){const options=specialOptions(g,actor,c);if(options?.targets.length){const target=c.effect==='dowsing'?options.targets.find(t=>[...(g.discards?.doors||[]),...(g.discards?.treasures||[])].some(x=>x.uid===t.uid&&(x.type==='level'&&p.level<9||x.effect==='hoard'||x.type==='potion'))):options.targets[0];if(target)actions.push({type:'special',uid:c.uid,targetUid:target.uid,priority:c.effect==='dowsing'?3:7})}}
  const doppel=p.hand.find(c=>c.effect==='doppleganger'&&specialOptions(g,actor,c));if(doppel&&combatStrength(g)*2>monsterPower(g))actions.push({type:'special',uid:doppel.uid,priority:4});const potion=p.hand.filter(c=>c.type==='potion'&&(!c.perIdentity||[g.turn,...(g.helper===null?[]:[g.helper])].some(i=>has(g.players[i],c.perIdentity)))).sort((a,b)=>(a.bonus>=deficit?0:1)-(b.bonus>=deficit?0:1)||a.bonus-b.bonus)[0];if(potion&&(profile.spend>.5||potion.bonus>=deficit))actions.push({type:'play',uid:potion.uid,priority:5});
  if(actions.length)return actions.sort((a,b)=>b.priority-a.priority)[0];
  if(!g.helpUsed&&!combatMonsters(g).some(m=>m.noHelp)&&!(g.dopplegangers||[]).some(d=>d.owner===g.turn)){const helpers=g.players.map((h,i)=>({h,i})).filter(x=>x.i!==actor&&helperAllowed(g,x.i)&&!x.h.dead).filter(({h,i})=>{const sim=pretend(g);sim.helper=i;return canWin(sim)&&(!h.bot||willingToHelp(g,i,()=>0))}).sort((a,b)=>(a.h.bot?0:1)-(b.h.bot?0:1)||power(b.h)-power(a.h));if(helpers.length)return{type:'help',target:helpers[0].i}}
  const forced=kneepadTargets(g,actor).find(t=>{const sim=pretend(g);sim.helper=t.uid;return canWin(sim)});if(forced)return{type:'force-help',target:forced.uid};
  const monsterAction=monsterActions(g,actor).find(a=>a.key==='cleric')||monsterActions(g,actor).sort((a,b)=>(a.card?.gold||0)-(b.card?.gold||0))[0];if(monsterAction)return{type:'monster-action',id:monsterAction.id};
  const transfer=p.hand.find(c=>c.effect==='transferCombat'&&specialOptions(g,actor,c));if(transfer&&profile.spite>.4){const target=[...specialOptions(g,actor,transfer).targets].sort((a,b)=>power(g.players[a.uid])-power(g.players[b.uid]))[0];if(target)return{type:'special',uid:transfer.uid,targetUid:target.uid}}
  const treasure=treasureActions(g,actor).find(a=>['ratEscape','sacrificeHireling','sacrificeSteedAll'].includes(a.key));if(treasure)return{type:'treasure',uid:treasure.uid,targetUid:treasure.targets[0]?.uid??null};
  const escape=p.hand.find(c=>c.type==='escape');if(escape)return{type:'play',uid:escape.uid};
  return{type:'run'};
 }
 return{type:'pass'};
}

// Curse decisions use the offered legal choices and public state. In particular,
// neighbours never inspect hidden cards when Lose Two Cards resolves.
export function chooseCurseResponse(g,prompt){
 const p=g.players[prompt.actor];
 if(prompt.kind==='orc'){const trivial=['Lose a Level','Curse! Lose a Level'].includes(prompt.card.en);return trivial?{pass:true}:{uid:'orc'}}
 if(prompt.kind==='protection'){
  if(prompt.actor!==prompt.target)return{pass:true};
  const harmless=prompt.card.en==='Lose a Level'&&p.level===1;
  return harmless?{pass:true}:{uid:prompt.cards[0].uid};
 }
 if(prompt.kind==='taxInitial')return{uid:[...prompt.cards].sort((a,b)=>(a.gold??0)-(b.gold??0)||cardKeepValue(p,a)-cardKeepValue(p,b))[0].uid};
 if(prompt.kind==='tax'){
  let total=0;const uids=[];
  const cards=[...prompt.cards].sort((a,b)=>cardKeepValue(p,a)/Math.max(1,a.gold??0)-cardKeepValue(p,b)/Math.max(1,b.gold??0));
  for(const c of cards){if(total>=prompt.minValue)break;total+=c.gold??0;uids.push(c.uid)}
  return{uids};
 }
 return{uid:[...prompt.cards].sort((a,b)=>cardKeepValue(p,a)-cardKeepValue(p,b))[0].uid};
}

// Choose a legal die result for the particular roll: a low Orc roll means death.
export function chooseDieResponse(g,{actor,roller,result,cards,monster,purpose='escape'}){
 const p=g.players[actor],own=actor===roller,low=purpose==='badStuff';
 const allies=actor===g.turn&&roller===g.helper||actor===g.helper&&roller===g.turn;
 const orc=low&&monster?.badStuff?.some(e=>e.type==='orcStomp');
 const penalty=-(g.players[roller].curses||[]).filter(c=>c.curseKey==='chicken').length;
 const desired=own?(low?(orc?Math.min(6,3-penalty):1):6):(low?(orc?1:6):1);
 const worthwhile=own?(low?(orc?result!==desired:result>2):result<5):!allies&&(g.players[roller].level>=8||botProfile(p).spite>.6);
 return worthwhile&&result!==desired&&cards.length?{uid:cards[0].uid,value:desired}:null;
}
