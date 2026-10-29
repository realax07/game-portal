import {combatMonsters} from './combat.js';
import {combatBoost,monsterSideBoost} from './combat-bonuses.js';
import {monsterModifiers,itemBonus} from './card-effects.js';
import {activeCurses,curseCombatPenalty} from './curses.js';
export const signed=n=>`${n>0?'+':''}${n}`;
// Public table state only. Never read or expose opponents' hands here.
export function tableEffects(g){
 const combat=g.phase==='combat',monsters=combatMonsters(g),fighters=[g.turn,...(g.helper==null?[]:[g.helper])];
 const entries=g.players.flatMap((p,actor)=>activeCurses(p).map(card=>({id:`curse-${card.uid}`,card,actor,side:'curse',label:p.name,detail:card.curseKey==='chicken'?'−1 к броскам кубика':card.curseKey==='sex'?'−5 в текущем или следующем бою':card.curseKey==='mirror'?'Бонусы шмоток, кроме брони, отключены в бою':card.desc||'Действующее проклятие'})));
 for(const [actor,p] of g.players.entries()){if(p.naughty)entries.push({id:`naughty-${actor}`,actor,side:'curse',label:p.name,name:'Чёрный список Санты',detail:'Нет новых сокровищ до самостоятельной победы над монстром.'});if((p.skunkClothes||[]).some(uid=>[...p.equipment,...(p.carried||[])].some(c=>c.uid===uid)))entries.push({id:`skunk-${actor}`,actor,side:'curse',label:p.name,name:'Запах скунса',detail:'Никто не помогает, пока не потеряна вся отмеченная одежда. Её цена снижена вдвое.'});if(p.squeak)entries.push({id:`squeak-${actor}`,actor,side:'curse',label:p.name,name:'Писклявый голос',detail:'До следующего собственного хода. Белк доволен.'})}
 for(const [actor,p] of g.players.entries())for(const card of p.equipment.filter(c=>['class-aura','race-aura'].includes(c.slot)))entries.push({id:`aura-${card.uid}`,card,actor,side:'aura',label:p.name,detail:`${signed(itemBonus(p,card,combat&&fighters.includes(actor)?g:null))} · постоянный бонус, уже учтён в снаряжении`});
 if(combat){
  for(const e of g.combatCards||[]){
   if(e.targets&&!e.targets.some(uid=>monsters.some(m=>m.uid===uid)))continue;
   entries.push({id:`combat-${e.card.uid}`,card:e.card,actor:e.actor,side:e.side||'combat',label:e.side==='monsters'?'Монстры':e.side==='fighters'?'Искатели':'Этот бой',detail:e.amount!==undefined?`${signed(e.amount)} к силе стороны${e.targets?' · '+monsters.filter(m=>e.targets.includes(m.uid)).map(m=>m.name).join(', '):''}`:e.card.desc||'Действует до конца боя'});
  }
  for(const [i,e] of (g.bonusEntries||[]).entries())if(e.kind==='ability')entries.push({id:`ability-${i}`,actor:e.actor,side:'fighters',label:'Искатели',name:({berserk:'Ярость воина',turn:'Изгнание нежити',claws:'Когти друида',backstab:'Подрезка',illusion:'Иллюзия'})[e.tag]||'Способность',detail:`${signed(e.amount)} к силе искателей`});
 }
 if(g.dungeon)entries.push({id:'dungeon',card:g.dungeon,side:'dungeon',label:'Подземелье',detail:g.dungeon.desc||`${signed(g.dungeon.delta||0)} новым монстрам`});
 const levelsOnly=monsters.some(m=>m.levelsOnly);
 const heroes=combat?combatBoost(g,{levelsOnly})+(levelsOnly?0:fighters.reduce((n,i)=>n+curseCombatPenalty(g.players[i]),0)):0;
 const foes=combat?monsterSideBoost(g)+monsters.reduce((n,m)=>n+(m.enhancementDelta||0)+monsterModifiers(g,m)+(g.dungeon?.delta||0),0):0;
 return{entries,heroes,foes};
}
export function eventStyle(text,kind=''){
 if(/начинает ход|завершает ход/.test(text))return{type:'turn',icon:'♟',title:'Смена хода'};
 if(/прода[её]|золотых/.test(text))return{type:'trade',icon:'◈',title:'Торговля'};
 if(/прокля|налог|кольц|−\d+ ур/i.test(text))return{type:'curse',icon:'☠',title:'Проклятие / потеря'};
 if(/побежда|побед|Божественн/.test(text))return{type:'victory',icon:'🏆',title:'Победа / награда'};
 if(/подкиды|подстав|монстрам|подрез/.test(text)||kind==='bad')return{type:'sabotage',icon:'⚡',title:'Вмешательство'};
 if(/смыв|кубик|ноги|непотребств/i.test(text))return{type:'escape',icon:'⚄',title:'Смывка / кубик'};
 if(/надева|снима|выглядит опаснее|шмотк/.test(text))return{type:'gear',icon:'🛡',title:'Снаряжение'};
 if(/помога|помощ|отказ/.test(text))return{type:'help',icon:'🤝',title:'Помощь'};
 if(/двер|неприятност|подземел/i.test(text))return{type:'door',icon:'▥',title:'Исследование'};
 if(/сокров|обыски|находит|забирает/.test(text))return{type:'loot',icon:'◆',title:'Добыча'};
 return{type:kind==='gold'?'victory':'action',icon:'✦',title:'Действие'};
}
