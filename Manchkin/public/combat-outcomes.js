import {discard,takeTreasure} from './decks.js';
import {finishCombatCards} from './combat-cards.js';
import {finishCombatCurses} from './curses.js';
import {markCombatEnd} from './combat-events.js';
import {has} from './traits.js';
export function awardPartyTreasure(g,total,owner=g.turn,helper=g.helper,forced=g.forcedHelper){let remaining=total;if(helper!==null&&helper!==undefined&&!forced&&remaining>0){takeTreasure(g,g.players[helper],1);remaining--}takeTreasure(g,g.players[owner],remaining);return total}
export function claimRewards(g,{treasures=0,levels=0,kills=0}={}){g.rewardClaims??=[];g.rewardClaims.push({owner:g.turn,helper:g.helper,forced:!!g.forcedHelper,treasures,levels,kills})}
export function settleClaims(g){let loot=0;for(const r of g.rewardClaims||[]){const p=g.players[r.owner];if(p.dead)continue;loot+=awardPartyTreasure(g,r.treasures,r.owner,r.helper,r.forced);p.level=Math.max(p.level,Math.min(r.kills>0&&r.helper==null?10:9,p.level+r.levels));if(r.helper!==null&&r.helper!==undefined&&has(g.players[r.helper],'Elf'))g.players[r.helper].level=Math.min(10,g.players[r.helper].level+r.kills)}g.rewardClaims=[];const winners=g.players.flatMap((p,i)=>p.level>=10?[i]:[]);if(winners.length){g.winners=winners;g.winner=winners[0]}return loot}
export function returnAfterCombat(g){if(g.returnTurn!==undefined){g.turn=g.returnTurn;delete g.returnTurn;g.helper=null;g.helpUsed=false;g.forcedHelper=false;g.phase='loot';g.lootRoomOnly=true;markCombatEnd(g)}}
export function finishWithoutKill(g,{loot=g.charmedLoot||0,lootRoom=false}={}){
 const awarded=awardPartyTreasure(g,loot)+settleClaims(g);g.charmedLoot=0;finishCombatCards(g);finishCombatCurses(g);markCombatEnd(g);g.phase=lootRoom?'loot':'done';g.lootRoomOnly=lootRoom;g.reaction=null;g.mustRunAway=false;returnAfterCombat(g);return awarded;
}
export function removeCombatMonster(g,uid,{treasures=0,levels=0,killed=false}={}){
 const monsters=(g.monsters||[g.monster]).filter(Boolean),m=monsters.find(m=>m.uid===uid);if(!m)return false;
 if(killed)claimRewards(g,{treasures,levels,kills:1});else g.charmedLoot=(g.charmedLoot||0)+treasures;
 g.monsters=monsters.filter(m=>m.uid!==uid);g.monster=g.monsters[0]||null;discard(g,m);g.combatRevision=(g.combatRevision||0)+1;
 if(!g.monsters.length)finishWithoutKill(g);return true;
}
