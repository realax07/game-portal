import {discard} from './decks.js';
export function hirelings(g){return g.players.flatMap((p,actor)=>p.equipment.filter(c=>c.slot==='hireling').map(c=>({actor,card:c})))}
export function levelTargets(g,actor,card){
 if(g.winner!==null||g.pendingCurse||g.pendingEncounter||g.pendingDivine||!g.players[actor]||g.players[actor].dead||card.type!=='level')return[];
 if(card.levelCondition==='afterCombat'&&!(g.phase!=='combat'&&g.lastCombat?.turn===g.turn&&g.lastCombat?.round===g.round))return[];
 if(card.levelCondition==='hireling'&&!hirelings(g).length)return[];
 const highest=Math.max(...g.players.map(p=>p.level));
 return g.players.flatMap((p,i)=>!p.dead&&p.level<9&&(card.levelCondition!=='notHighest'||p.level<highest)?[i]:[]);
}
export function playLevelCard(g,actor,uid,target=actor,{hirelingUid=null}={}){
 const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid&&c.type==='level');
 if(!c||!levelTargets(g,actor,c).includes(target))return{ok:false,reason:'Условия повышения уровня не выполнены. Нельзя дать победный уровень.'};
 let hired=null;
 if(c.levelCondition==='hireling'){
  const choices=hirelings(g);if(hirelingUid===null&&p.bot)hirelingUid=[...choices].sort((a,b)=>(a.actor===actor?1:0)-(b.actor===actor?1:0)||(b.card.bonus||0)-(a.card.bonus||0))[0]?.card.uid;
  hired=choices.find(x=>x.card.uid===hirelingUid);if(!hired)return{ok:false,reason:'Выбери наёмника, которого потеряет его владелец.'};
 }
 p.hand=p.hand.filter(c=>c.uid!==uid);discard(g,c);
 if(hired){const owner=g.players[hired.actor];owner.equipment=owner.equipment.filter(c=>c.uid!==hired.card.uid);discard(g,hired.card);const attached=owner.equipment.filter(c=>c.hirelingUid===hired.card.uid);owner.equipment=owner.equipment.filter(c=>!attached.includes(c));discard(g,attached)}
 g.players[target].level++;g.combatRevision=(g.combatRevision||0)+1;
 return{ok:true,text:`${p.name}: «${c.name}» → ${g.players[target].name}, +1 уровень.${hired?` ${g.players[hired.actor].name} теряет наёмника.`:''}`};
}
