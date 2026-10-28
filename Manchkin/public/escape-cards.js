import {discard} from './decks.js';
import {detach} from './item-links.js';
export function escapeCardOptions(g,actor,{fighter,escaped,monster}){if(monster.noEscape||g.players[actor].dead)return[];return g.players[actor].hand.filter(c=>escaped?c.effect==='glue':actor===fighter&&c.effect==='invisibility')}
export async function resolveEscapeCards(g,state,choose,rollDie){
 if(!choose||state.monster.noEscape)return state;
 // Each played glue creates a fresh roll; a later Invisibility or Glue can react again.
 for(let changes=0;changes<100;changes++){
  let changed=false;
  const order=state.escaped?g.players.map((_,i)=>(state.actor+i+1)%g.players.length):[state.actor];
  for(const actor of order){const cards=escapeCardOptions(g,actor,{fighter:state.actor,...state});if(!cards.length)continue;
   const answer=await choose({actor,fighter:state.actor,cards,monster:state.monster,escaped:state.escaped,automatic:state.automatic,roll:state.roll}),card=cards.find(c=>c.uid===answer?.uid);if(!card)continue;
   discard(g,detach(g.players[actor],card.uid));
   if(card.effect==='invisibility'){state={...state,automatic:true,escaped:true};changed=true;break}
   const roll=await rollDie(state.actor,state.monster,'escape');state={...state,roll,automatic:false,escaped:roll+state.bonus>=5};changed=true;break;
  }if(!changed)return state;
 }return state;
}
