import {discard,deckOf,discardOverlays} from './decks.js';
import {itemsInPlay,loseHeadgearCurse,diePenalty,cleanIdentities} from './curses.js';
// A generator keeps synchronous simulations and interactive play on one rule path.
export const CHOICE_BAD_STUFF=new Set(['handOrLevels','loseCardsByDie','payItems','neighboursTakeItems','othersTakeTreasure','othersTakeHand','levelOneOrItems','handOrSmallItems','loseOneRace','leftDiscardItem']);
const price=c=>c.gold??0;
function remove(g,p,cards,{to=null}={}){cards=cards.filter(c=>!c.cursedThingy);
 const ids=new Set(cards.map(c=>c.uid));
 p.hand=p.hand.filter(c=>!ids.has(c.uid));p.equipment=p.equipment.filter(c=>!ids.has(c.uid));p.carried=(p.carried||[]).filter(c=>!ids.has(c.uid));
 if(to){discardOverlays(g,p,[...ids]);for(const c of cards)delete c.overlayBaseUid;to.hand.push(...cards)}else discard(g,cards);
 if(cards.some(c=>c.slot==='head'))loseHeadgearCurse(g,p);if(cards.some(c=>['class','race'].includes(c.type)))cleanIdentities(g,p);
}
function picked(cards,answer,count){const ids=Array.isArray(answer)?answer:answer?.uids||[];const selected=cards.filter(c=>ids.includes(c.uid));return selected.length===count?selected:cards.slice(0,count)}
export function* badStuffChoices(g,p,m,e){
 const victim=g.players.indexOf(p),ask=extra=>({actor:victim,victim,monster:m,cards:[],count:0,...extra});
 if(e.type==='othersTakeHand'&&e.keepRemainder){for(let step=1;step<g.players.length&&p.hand.length;step++){const actor=(victim+step)%g.players.length;if(g.players[actor].dead)continue;const cards=[...p.hand],answer=yield ask({kind:'cards',actor,cards,count:1,reason:'Лунные девы: выбери одну карту из открытой руки.'});remove(g,p,picked(cards,answer,1),{to:g.players[actor]})}return 'Остальные взяли по карте из открытой руки.'}
 if(e.type==='othersTakeHand'){
  for(let step=1;step<g.players.length&&p.hand.length;step++){const other=g.players[(victim+step)%g.players.length];if(other.dead)continue;const index=Math.floor(Math.random()*p.hand.length);remove(g,p,[p.hand[index]],{to:other})}const rest=[...p.hand];remove(g,p,rest);return 'Остальные взяли закрытые карты слева направо; остаток руки сброшен.';
 }
 if(e.type==='levelOneOrItems'||e.type==='handOrSmallItems'){
  const level=e.type==='levelOneOrItems',answer=yield ask({kind:'alternative',choices:[{id:'first',name:level?'Стать первым уровнем':'Сбросить всю руку'},{id:'items',name:level?'Потерять все шмотки':'Потерять небольшие шмотки'}]});if(answer==='first'||answer?.choice==='first'){if(level)p.level=1;else remove(g,p,[...p.hand])}else remove(g,p,itemsInPlay(p).filter(c=>!c.cursedThingy&&(level||!c.big)));return 'Непотребство: выполнен выбранный вариант.';
 }
 if(e.type==='loseOneRace'||e.type==='leftDiscardItem'){const cards=e.type==='loseOneRace'?p.equipment.filter(c=>c.type==='race'):itemsInPlay(p).filter(c=>!c.cursedThingy);if(cards.length){const actor=e.type==='leftDiscardItem'?(victim+1)%g.players.length:victim,answer=yield ask({kind:'cards',actor,cards,count:1,reason:'Выбери карту для сброса.'});remove(g,p,picked(cards,answer,1))}return 'Выбранная карта потеряна.';}
 if(e.type==='handOrLevels'){
  const answer=yield ask({kind:'alternative',choices:[{id:'hand',name:`Сбросить всю руку (${p.hand.length})`},{id:'levels',name:`Потерять ${e.amount} уровня`}]});
  if(answer==='hand'||answer?.choice==='hand'){const cards=[...p.hand];remove(g,p,cards);return `Сброшена вся рука: ${cards.length}.`}
  p.level=Math.max(1,p.level-e.amount);return `−${e.amount} ур.`;
 }
 if(e.type==='loseCardsByDie'){
  const raw=yield ask({kind:'die'}),roll=Math.max(0,raw+diePenalty(p));const cards=e.handOnly?[...p.hand]:[...p.hand,...itemsInPlay(p).filter(c=>!c.cursedThingy)],count=Math.min(roll,cards.length);
  if(count){const ids=yield ask({kind:'cards',cards,count,reason:`Кубик: ${raw}. Потеряй ${count} карт ${e.handOnly?'из руки':'из руки или шмоток из игры'}.`});remove(g,p,picked(cards,ids,count))}
  return `Кубик: ${raw}. Потеряно карт: ${count}.`;
 }
 if(e.type==='payItems'){
  const cards=[...itemsInPlay(p).filter(c=>!c.cursedThingy),...p.hand.filter(c=>c.type==='item'||c.isItem)],total=cards.reduce((n,c)=>n+price(c),0);
  if(total<=e.gold){remove(g,p,cards);return `Потеряны все шмотки (${total} золотых).`}
  const answer=yield ask({kind:'value',cards,minValue:e.gold,reason:`Выбери шмотки на сумму не меньше ${e.gold} золотых.`});
  const ids=Array.isArray(answer)?answer:answer?.uids||[];let selected=cards.filter(c=>ids.includes(c.uid));
  if(selected.reduce((n,c)=>n+price(c),0)<e.gold){selected=[];let value=0;for(const c of [...cards].sort((a,b)=>price(b)-price(a))){if(value>=e.gold)break;selected.push(c);value+=price(c)}}
  remove(g,p,selected);return `Потеряны шмотки на ${selected.reduce((n,c)=>n+price(c),0)} золотых.`;
 }
 if(e.type==='neighboursTakeItems'){
  const notes=[];if(g.players.length<2)return 'Некому забирать шмотки.';
  for(const offset of [1,-1]){const actor=(victim+offset+g.players.length)%g.players.length,other=g.players[actor];if(other.dead)continue;const cards=itemsInPlay(p).filter(c=>!c.cursedThingy);if(!cards.length)break;
   const answer=yield ask({kind:'cards',actor,cards,count:1,reason:`${other.name} выбирает шмотку ${p.name}, которую потеряет владелец.`}),selected=picked(cards,answer,1);remove(g,p,selected);notes.push(`${other.name} выбирает сброс: ${selected[0].name}.`);
  }return notes.join(' ');
 }
 if(e.type==='othersTakeTreasure'){
  const notes=[];for(let step=1;step<g.players.length;step++){const actor=(victim-step+g.players.length)%g.players.length,other=g.players[actor];if(other.dead)continue;
   const cards=[...p.equipment,...(p.carried||[])].filter(c=>!c.cursedThingy&&deckOf(c)==='treasures'),hidden=p.hand.flatMap((c,i)=>deckOf(c)==='treasures'?[{uid:`hidden-${i}`,name:`Закрытое сокровище ${i+1}`}]:[]),options=[...cards,...hidden];if(!options.length)break;
   const answer=yield ask({kind:'cards',actor,cards:options,count:1,optional:true,reason:`${other.name}: возьми сокровище со стола или закрытое сокровище из руки ${p.name}.`});if(Array.isArray(answer)&&!answer.length)continue;const choice=picked(options,answer,1)[0];const selected=typeof choice.uid==='string'?p.hand[Number(choice.uid.slice(7))]:cards.find(c=>c.uid===choice.uid);if(selected){remove(g,p,[selected],{to:other});notes.push(`${other.name} берёт ${typeof choice.uid==='string'?'закрытую карту':selected.name}.`)}
  }return notes.join(' ');
 }
 return '';
}
export function defaultBadStuffChoice(prompt){
 if(prompt.kind==='alternative')return 'levels';
 if(prompt.kind==='die')return 1+Math.floor(Math.random()*6);
 if(prompt.kind==='value'){let value=0;const ids=[];for(const c of [...prompt.cards].sort((a,b)=>price(a)-price(b))){if(value>=prompt.minValue)break;ids.push(c.uid);value+=price(c)}return ids}
 return prompt.cards.slice(0,prompt.count).map(c=>c.uid);
}
export function runBadStuffChoices(g,p,m,e,{chooseDecision=null,chooseCards=null,rollDie=null}={}){
 const iter=badStuffChoices(g,p,m,e);let step=iter.next();while(!step.done){const prompt=step.value;let answer=prompt.kind==='die'&&rollDie?rollDie():chooseDecision?.(prompt);if(answer===undefined&&['cards','value'].includes(prompt.kind)&&chooseCards)answer=chooseCards(prompt.cards,prompt.count,false,prompt);if(answer===undefined)answer=defaultBadStuffChoice(prompt);step=iter.next(answer)}return step.value;
}
