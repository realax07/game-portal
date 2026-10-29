import {has,handCapacity,normalizeHands} from './traits.js';
import {discard,takeTreasure} from './decks.js';
export const afflicted=(p,key)=>(p.curses||[]).some(c=>c.curseKey===key);
export const blockedTreasure=p=>!!p.naughty||afflicted(p,'foolsGold');
export const clothing=c=>['head','body','feet'].includes(c.slot)||c.belowWaist||/Codpiece|Pantyhose|Coat|Cloak|Knees/i.test(c.en||'');
export const noHelpFor=(g,actor)=>afflicted(g.players[actor],'bo')||afflicted(g.players[actor],'necrophobia')&&(g.monsters||[]).some(m=>m.undead)||(g.players[actor].skunkClothes||[]).some(uid=>g.players[actor].equipment.some(c=>c.uid===uid)||(g.players[actor].carried||[]).some(c=>c.uid===uid));
export const helperAllowed=(g,actor)=>!noHelpFor(g,g.turn)&&!((g.monsters||[]).some(m=>m.undead)&&afflicted(g.players[actor],'necrophobia'))&&!g.players[actor].dead;
export const canInterfere=(g,actor,kind='card')=>!(g.phase==='combat'&&(g.monsters||[]).some(m=>m.skunk)&&![g.turn,g.helper].includes(actor)&&!['enhancer','wandering'].includes(kind));
export function refreshAxeCombat(g){
 if(g.phase!=='combat')return;
 const monsters=g.monsters||[],p=g.players[g.turn];
 if(g.helper!==null&&!helperAllowed(g,g.helper)){g.helper=null;g.forcedHelper=false}
 g.lustNeedsHelper=monsters.some(m=>m.lust)&&(g.helper===null||g.players[g.helper].sex===p.sex);const forced=afflicted(p,'necrophobia')&&monsters.some(m=>m.undead)||g.lustNeedsHelper&&!g.players.some((h,i)=>i!==g.turn&&h.sex!==p.sex&&helperAllowed(g,i));
 if(!g.fleeingDeclared)g.mustRunAway=!!forced;
 g.siegeDecisions??={};
 if(!g.pendingAxe&&!g.fleeingDeclared)for(const actor of [g.turn,...(g.helper===null?[]:[g.helper])]){const c=g.players[actor].equipment.find(c=>c.siege&&!c.cursedThingy&&g.siegeDecisions[c.uid]===undefined);if(c){g.pendingAxe={kind:'siege',actor,itemUid:c.uid};break}}
}
export function endAxeCurses(g,actors){for(const i of actors){const p=g.players[i],expired=(p.curses||[]).filter(c=>['bo','foolsGold','noWeaponsNext'].includes(c.curseKey));p.curses=(p.curses||[]).filter(c=>!expired.includes(c));discard(g,expired)}}
export function boomReturn(g,owner,card,cause){if(!card.boomdagger||!['curse','theft','sale','ability','discard'].includes(cause))return;g.boomReturns??=[];g.boomReturns=g.boomReturns.filter(x=>x.card.uid!==card.uid);g.boomReturns.push({owner,card:structuredClone(card)})}
export function returnBoomdaggers(g,actor){for(const entry of(g.boomReturns||[]).filter(x=>x.owner===actor)){for(const p of g.players)for(const zone of ['hand','equipment','carried'])p[zone]=(p[zone]||[]).filter(c=>c.uid!==entry.card.uid);for(const deck of ['doors','treasures']){g[deck]=g[deck].filter(c=>c.uid!==entry.card.uid);g.discards[deck]=g.discards[deck].filter(c=>c.uid!==entry.card.uid)}g.players[actor].hand.push(entry.card);g.log?.unshift({text:`${g.players[actor].name}: бумеранг-кинжал вернулся в руку.`,kind:'gold'})}g.boomReturns=(g.boomReturns||[]).filter(x=>x.owner!==actor);delete g.players[actor].squeak}
export function changeBoomOwner(g,card,owner){if(card.boomdagger)g.boomReturns=(g.boomReturns||[]).filter(e=>e.card.uid!==card.uid)}
export function loseCursedItem(g,p,cards){for(const c of cards){boomReturn(g,g.players.indexOf(p),c,'curse');const ids=new Set([c.uid]);p.equipment=p.equipment.filter(x=>!ids.has(x.uid));p.carried=(p.carried||[]).filter(x=>!ids.has(x.uid));discard(g,c)}normalizeHands(p)}
