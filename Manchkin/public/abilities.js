import {canInterfere,helperAllowed,boomReturn,changeBoomOwner} from './axe-mechanics.js';
import {removeCombatMonster,finishWithoutKill} from './combat-outcomes.js';
import {markCombatEnd} from './combat-events.js';
import {finishCombatCards} from './combat-cards.js';
import {addCombatBonus,combatBoost} from './combat-bonuses.js';
import {diePenalty,finishCombatCurses} from './curses.js';
import {characterPower,itemUsable,itemBonus} from './card-effects.js';
import {has,emptyHands,traitBonus,recordSabotage} from './traits.js';
import {discard,takeTreasure,discardOverlays} from './decks.js';
import {combatMonsters,combatRewards,reactingPlayer} from './combat.js';
const basePower=characterPower;
export function combatStrength(g){if(combatMonsters(g).some(m=>m.noHelp)||(g.dopplegangers||[]).some(d=>d.owner===g.turn)){if(g.helper!==null)finishCombatCurses(g,[g.helper]);g.helper=null;g.forcedHelper=false}if(g.forcedHelper&&g.players[g.turn].level+combatRewards(g).levels+(g.rewardClaims||[]).filter(r=>r.owner===g.turn).reduce((n,r)=>n+r.levels,0)>=10){g.helper=null;g.forcedHelper=false}let n=basePower(g.players[g.turn],g)+combatBoost(g);if(g.helper!==null){const h=g.players[g.helper];n+=basePower(h,g)+(has(h,'Ranger')?2:0)}if(combatMonsters(g).some(m=>m.levelsOnly))n=[g.turn,...(g.helper===null?[]:[g.helper])].reduce((sum,i)=>sum+g.players[i].level,0)+combatBoost(g,{levelsOnly:true});if(combatMonsters(g).some(m=>m.bonusesOnly))n-=[g.turn,...(g.helper===null?[]:[g.helper])].reduce((sum,i)=>sum+g.players[i].level,0);if(!combatMonsters(g).some(m=>m.levelsOnly))n*=1+(g.dopplegangers||[]).filter(d=>d.owner===g.turn).length;return n}
const used=(g,k)=>g.abilityUses?.[k]||0;
export const abilityCosts=(p,key=null)=>[...p.hand,...p.equipment.filter(c=>!['class','race','multiclass','multirace'].includes(c.type)&&!c.cursedThingy&&!(key==='backstab'&&!has(p,'Thief')&&c.grantsBackstab))];
export function abilityOptions(g,actor){
 const p=g.players[actor];if(!p)return[];const own=actor===g.turn,combat=g.phase==='combat',fighter=combat&&(own||actor===g.helper),canAct=!p.dead&&!(g.pendingAxe||g.pendingMap)&&!g.forcedEscapeReason&&!g.fleeingDeclared&&!g.pendingEncounter&&!g.pendingDivine&&g.winner===null&&(g.reaction?reactingPlayer(g)===actor:own);const out=[];
 const add=(key,identity,name,cost,enabled,targets=[],extra={})=>{if((!combatMonsters(g).some(m=>m.levelsOnly)||!['berserk','turn','claws','illusion'].includes(key))&&(has(p,identity)||key==='turn'&&p.equipment.some(c=>c.grantsTurn&&itemUsable(p,c)&&itemBonus(p,c,g)>0)||key==='backstab'&&p.equipment.some(c=>c.grantsBackstab&&itemUsable(p,c))))out.push({key,identity,name,cost,enabled:canAct&&enabled,targets,...extra})};
 const monsters=combatMonsters(g).map(m=>({uid:m.uid,name:m.name}));
 add('berserk','Warrior','Ярость · +1',1,fighter&&used(g,`${actor}:berserk`)<3);
 add('turn','Cleric','Изгнать нежить · +3',1,fighter&&combatMonsters(g).some(m=>m.undead)&&used(g,`${actor}:turn`)<3);
 add('resurrect','Cleric','Воскресить дверь',1,own&&g.phase==='door'&&!!g.discards?.doors.length,[],{handOnly:true});
 add('charm','Wizard','Зачаровать монстра',p.hand.length,fighter&&p.hand.length>=3,monsters,{wholeHand:true});
 add('backstab','Thief','Подрезать · −2',1,combat&&!fighter,[g.turn,g.helper].filter(i=>i!==null&&i!==actor&&canInterfere(g,actor)&&!g.players[i].equipment.some(c=>c.protectThief&&itemUsable(g.players[i],c))&&!used(g,`${actor}:backstab:${i}`)).map(i=>({uid:i,name:g.players[i].name})));
 const theft=g.players.flatMap((x,i)=>i===actor||x.equipment.some(c=>c.protectThief&&itemUsable(x,c))?[]:x.equipment.filter(c=>c.type==='item'&&!c.big&&!c.tamed&&!c.cursedThingy).map(c=>({uid:c.uid,name:`${x.name}: ${c.name}`})));
 add('steal','Thief','Украсть шмотку · кубик 4–6',1,!combat&&own&&!p.naughty,theft);
 add('enthrall','Bard','Заворожить помощника',1,own&&combat&&g.helper===null&&!combatMonsters(g).some(m=>m.noHelp)&&!(g.dopplegangers||[]).some(d=>d.owner===g.turn)&&g.players[g.turn].level+combatRewards(g).levels<10,g.players.flatMap((x,i)=>i!==actor&&!x.dead&&helperAllowed(g,i)&&!used(g,`${actor}:enthrall:${i}`)?[{uid:i,name:x.name}]:[]));
 add('tame','Ranger','Приручить монстра',null,own&&combat,monsters,{monsterCost:true});
 add('claws','Druid',`Кошачьи когти · +${emptyHands(p)*3}`,1,fighter&&emptyHands(p)>0&&!used(g,`${actor}:claws`));
 add('illusion','Gnome','Создать иллюзию',0,own&&combat&&g.helper===null&&!used(g,`${actor}:illusion`),p.hand.filter(c=>c.type==='monster').map(c=>({uid:c.uid,name:`${c.name} · +${c.printedPower??c.power}`})));
 const top=g.discards?.doors.at(-1);add('scavenge','Bug','Подобрать расу / класс',2,!!top&&top.uid===g.lastDiscard&&['class','race'].includes(top.type),[],{handOnly:false});
 return out.map(a=>({...a,enabled:a.enabled&&(!['backstab','steal','enthrall','illusion','charm','tame'].includes(a.key)||a.targets.length>0)&&(a.cost===null||a.cost<=(a.handOnly||a.wholeHand?p.hand:abilityCosts(p,a.key)).length)}));
}
export function useAbility(g,actor,key,{costUids=[],targetUid=null,rollDie=()=>1+Math.floor(Math.random()*6)}={}){
 const p=g.players[actor],option=abilityOptions(g,actor).find(a=>a.key===key);if(!option?.enabled)return{ok:false,reason:'Способность сейчас недоступна.'};
 if(option.targets.length&&!option.targets.some(t=>t.uid===targetUid))return{ok:false,reason:'Выбери доступную цель.'};
 const m=combatMonsters(g).find(m=>m.uid===targetUid),cost=key==='tame'?m.reward:option.cost;
 const allowed=option.handOnly||option.wholeHand?p.hand:abilityCosts(p,key),uids=option.wholeHand?p.hand.map(c=>c.uid):costUids;
 if(new Set(uids).size!==uids.length||uids.length!==cost||!uids.every(uid=>allowed.some(c=>c.uid===uid))||key==='tame'&&uids.some(uid=>p.equipment.some(c=>c.uid===uid&&c.slot==='steed')))return{ok:false,reason:`Выбери ровно ${cost} карт в оплату.`};
 // The reclaimed card must be captured before paying the discard cost.
 const reclaimed=key==='resurrect'||key==='scavenge'?g.discards.doors.pop():null;
 const stabPenalty=has(p,'Thief')&&p.equipment.some(c=>c.grantsBackstab&&itemUsable(p,c))?3:2;
 const spent=allowed.filter(c=>uids.includes(c.uid));p.hand=p.hand.filter(c=>!uids.includes(c.uid));p.equipment=p.equipment.filter(c=>!uids.includes(c.uid));for(const c of spent)boomReturn(g,actor,c,'ability');discard(g,spent);g.lastDiscard=null;
 g.abilityUses??={};const counter=`${actor}:${key}`;g.abilityUses[counter]=used(g,counter)+1;let text=`${p.name}: ${option.name}.`,faceUp=null;
 if(key==='berserk'||key==='turn'||key==='claws')addCombatBonus(g,key==='berserk'?1:key==='turn'?3:emptyHands(p)*3,{actor,kind:'ability',tag:key});
 if(key==='backstab'){recordSabotage(g,actor);g.abilityUses[`${counter}:${targetUid}`]=1;addCombatBonus(g,-stabPenalty,{actor,kind:'ability',tag:'backstab'})}
 if(key==='illusion'){const illusion=p.hand.find(c=>c.uid===targetUid);p.hand=p.hand.filter(c=>c.uid!==targetUid);g.illusionBonus=illusion.printedPower??illusion.power;addCombatBonus(g,g.illusionBonus,{actor,kind:'ability',tag:'illusion'});discard(g,illusion)}
 if(key==='resurrect')faceUp=reclaimed;
 if(key==='scavenge')p.hand.push(reclaimed);
 if(key==='steal'){const roll=rollDie()+diePenalty(p);if(roll>=4){const victim=g.players.find(x=>x!==p&&x.equipment.some(c=>c.uid===targetUid));const item=victim.equipment.find(c=>c.uid===targetUid);boomReturn(g,g.players.indexOf(victim),item,'theft');victim.equipment=victim.equipment.filter(c=>c.uid!==targetUid);discardOverlays(g,victim,[targetUid]);delete item.overlayBaseUid;p.hand.push(item);text+=` Кубик ${roll}: добыча в руке!`}else{p.level=Math.max(1,p.level-1);text+=` Кубик ${roll}: поймали, −1 уровень.`}}
 if(key==='enthrall'){g.abilityUses[`${counter}:${targetUid}`]=1;const a=rollDie()+diePenalty(p),b=rollDie()+diePenalty(g.players[targetUid]);if(a>b){g.helper=targetUid;g.helpUsed=true;g.forcedHelper=true}text+=` Кубики ${a}:${b}: ${a>b?'помощник заворожён!':'соперник устоял.'}`}
 if(key==='charm'||key==='tame'){

  if(key==='tame'){const steeds=p.equipment.filter(c=>c.slot==='steed');p.equipment=p.equipment.filter(c=>c.slot!=='steed');discard(g,steeds);p.equipment.push({...m,name:`Приручённый: ${m.name}`,type:'item',slot:'steed',bonus:m.reward,tamed:true,desc:'Скакун следопыта. Нельзя продать.',deck:'doors'})}
  if(key==='charm')removeCombatMonster(g,targetUid,{treasures:m.reward});else{g.monsters=combatMonsters(g).filter(c=>c.uid!==targetUid);g.monster=g.monsters[0]||null;if(!g.monsters.length)finishWithoutKill(g)}
  if(!g.monsters.length)text+=' Бой окончен без уровней.'
 }
 if(g.phase==='combat')g.combatRevision=(g.combatRevision||0)+1;
 return{ok:true,text,faceUp};
}
