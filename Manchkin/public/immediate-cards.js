import {discard,draw,receiveCard} from './decks.js';
import {has} from './traits.js';
export function applyDivine(g,c){
 const clerics=g.players.flatMap((p,i)=>!p.dead&&has(p,'Cleric')?[i]:[]);
 for(const i of clerics)g.players[i].level=Math.min(10,g.players[i].level+1);
 const winners=clerics.filter(i=>g.players[i].level===10);if(winners.length){g.winners=winners;g.winner=winners[0]}
 discard(g,c);g.combatRevision=(g.combatRevision||0)+1;g.log?.unshift({text:`Божественное вмешательство: ${clerics.length?clerics.map(i=>g.players[i].name).join(', ')+' получают по уровню':'клириков нет'}.`,kind:'gold'});
}
export function immediateCard(g,p,c){
 if(c.effect==='hoard'){for(let i=0;i<3;i++){const next=draw(g,'treasures');if(next)receiveCard(g,p,next)}discard(g,c);return true}
 if(c.effect==='divine'){applyDivine(g,c);return true}return false;
}
export function finishInitialDeal(g){
 g.initialDealing=false;const divines=[];
 for(const p of g.players){for(const c of [...p.hand])if(c.immediate){p.hand=p.hand.filter(x=>x.uid!==c.uid);if(c.effect==='divine')divines.push(c);else immediateCard(g,p,c)}}
 if(divines.length)g.pendingDivine={cards:divines,order:g.players.flatMap((p,i)=>!has(p,'Cleric')&&p.hand.some(c=>c.en==='Cleric')?[i]:[]),index:0};
 settleDivine(g);
}
export function settleDivine(g){const d=g.pendingDivine;if(d&&d.index>=d.order.length){delete g.pendingDivine;for(const c of d.cards)applyDivine(g,c)}}
export function respondDivine(g,actor,{clericUid=null,replaceUid=null}={}){
 const d=g.pendingDivine,p=g.players[actor];if(!d||d.order[d.index]!==actor)return{ok:false};
 if(clericUid!==null){const c=p.hand.find(c=>c.uid===clericUid&&c.en==='Cleric');if(!c)return{ok:false};const current=p.equipment.filter(c=>c.type==='class'),limit=p.equipment.find(c=>c.type==='multiclass')?.limit||1;if(current.length>=limit){const old=current.find(c=>c.uid===replaceUid)||current[0];p.equipment=p.equipment.filter(c=>c.uid!==old.uid);discard(g,old)}p.hand=p.hand.filter(x=>x.uid!==c.uid);p.equipment.push(c)}
 d.index++;settleDivine(g);return{ok:true};
}
export function physicalCards(g){return [...g.doors,...g.treasures,...(g.discards?.doors||[]),...(g.discards?.treasures||[]),...g.players.flatMap(p=>[...p.hand,...p.equipment,...(p.carried||[]),...(p.curses||[])]),...(g.pendingDivine?.cards||[])]}
