import {discard} from './decks.js';
export function retainCombatCard(g,card,targets=null,meta={}){g.combatCards??=[];g.combatCards.push({card:structuredClone(card),targets:targets?[...targets]:null,...meta})}
export function finishCombatCards(g){const cards=(g.combatCards||[]).map(e=>e.card);g.combatCards=[];discard(g,cards);g.dopplegangers=[]}
