import {normalizeHands} from './traits.js';
import {immediateCard} from './immediate-cards.js';
export const deckOf=c=>c.deck||(['monster','curse','race','class','multiclass','multirace','enhancer','dungeon','wandering'].includes(c.type)||['steed','hireling'].includes(c.slot)?'doors':'treasures');
export const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
export function discardOverlays(g,p,uids){const overlays=p.equipment.filter(c=>c.overSlot&&uids.includes(c.overlayBaseUid));p.equipment=p.equipment.filter(c=>!overlays.includes(c));discard(g,overlays);return overlays}
export function discard(g,...cards){
 g.discards??={doors:[],treasures:[]};const queue=cards.flat().filter(c=>c&&!c.virtual);
 const seen=new Set();while(queue.length){const c=queue.shift();if(c.uid!==undefined&&seen.has(c.uid))continue;if(c.uid!==undefined)seen.add(c.uid);if(c.cheatCard)queue.push(c.cheatCard);queue.push(...(c.itemEnhancers||[]));for(const p of g.players||[]){const cursed=(p.curses||[]).filter(x=>x.cursedItemUid===c.uid);p.curses=(p.curses||[]).filter(x=>!cursed.includes(x));queue.push(...cursed)}for(const p of g.players||[]){for(const zone of ['hand','equipment','carried']){const linked=(p[zone]||[]).filter(x=>c.uid!==undefined&&(x.hirelingUid===c.uid||zone==='equipment'&&x.overlayBaseUid===c.uid));p[zone]=(p[zone]||[]).filter(x=>!linked.includes(x));queue.push(...linked)}}const original=c.discardAs||c,restored={...original,power:original.printedPower??original.power,reward:original.printedReward??original.reward};for(const key of ['mateGroup','discardAs','addedBy','enhancementDelta','curseKey','cheatCard','hirelingUid','overlayBaseUid','itemEnhancers','cursedBy','cursedThingy','siegeActive','skunkDiscount'])delete restored[key];g.discards[deckOf(original)].push(restored);g.lastDiscard=original.uid;
  if(c.extraHands)for(const p of g.players||[])normalizeHands(p);
  if(c.type==='monster'&&g.combatCards?.length){const expired=[];for(const entry of g.combatCards){if(!entry.targets)continue;entry.targets=entry.targets.filter(uid=>uid!==c.uid);if(!entry.targets.length)expired.push(entry)}g.combatCards=g.combatCards.filter(entry=>!expired.includes(entry));queue.push(...expired.map(entry=>entry.card))}
 }
}
export function draw(g,kind){g.discards??={doors:[],treasures:[]};if(!g[kind].length){g[kind]=shuffle(g.discards[kind]);g.discards[kind]=[]}return g[kind].pop()||null}
export function receiveCard(g,p,c){if(!c)return;if(p.naughty&&deckOf(c)==='treasures'){discard(g,c);return;}if(g.initialDealing||!immediateCard(g,p,c))p.hand.push(c)}
export function deal(g,p,n=4){p.lastDeal={doors:0,treasures:0};for(let i=0;i<n;i++)for(const kind of ['doors','treasures']){const c=draw(g,kind);if(c){p.lastDeal[kind]++;receiveCard(g,p,c)}}}
export function takeTreasure(g,p,n){for(let i=0;i<n;i++){const c=draw(g,'treasures');if(c)receiveCard(g,p,c)}}
