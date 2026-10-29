import {afflicted,canInterfere,boomReturn,clothing} from './axe-mechanics.js';
import {exceptionalItem} from './item-links.js';
import {CHOICE_BAD_STUFF,runBadStuffChoices,badStuffChoices,defaultBadStuffChoice} from './bad-stuff-choices.js';
import {guaranteeEscape,hasEscapeGuarantee} from './escape-state.js';
import {finishCombatCards} from './combat-cards.js';
import {hasMirror,curseCombatPenalty,finishCombatCurses,loseHeadgearCurse,diePenalty,cleanIdentities,itemsInPlay} from './curses.js';
import {CHECKED_RULES} from './card-rules-data.js';
import {has,traitBonus} from './traits.js';
import {discard,takeTreasure,deckOf,discardOverlays} from './decks.js';
// Checked card metadata is separate from the sample catalog. Unknown printed
// rules are flagged rather than inferred from artwork or the card's name.
export const CARD_RULES=CHECKED_RULES;
export const RULE_SOURCE='https://munchkin.game/gameplay/faq/';
export function registerRules(rules){Object.assign(CARD_RULES,rules)}
export function applyCardRules(c){const r=CARD_RULES[c.en];if(r){Object.assign(c,structuredClone(r));c.rulesStatus=r.rulesStatus||'verified';c.rulesSource=r.source||RULE_SOURCE;if(c.type==='monster')c.printedPower=c.power}else if(['monster','item','potion','escape','level'].includes(c.type)){c.rulesStatus??='unverified';c.rulesNote??='Печатный текст пока не подтверждён. Показан базовый эффект адаптации.'}return c}
const singleProtected=(p,kind)=>p.equipment.filter(c=>c.slot===kind).length===1&&p.equipment.some(c=>c.slot===`${kind}-mod`);
const itemIdentity=(p,en)=>p.equipment.some(c=>c.itemIdentity===en);
const raceNames=['Human','Elf','Dwarf','Halfling','Orc','Gnome','Centaur','Lizard Guy','Bug'];
export const monsterIdentity=(p,en)=>raceNames.includes(en)&&p.equipment.some(c=>c.itemIdentity&&!c.cursedThingy)?p.equipment.some(c=>c.itemIdentity===en&&!c.cursedThingy):has(p,en);
export const targetsIdentity=(p,en)=>monsterIdentity(p,en)&&(p.equipment.some(c=>c.itemIdentity===en&&!c.cursedThingy)||en==='Human'||!singleProtected(p,raceNames.includes(en)?'race':'class'));
export function itemUsable(p,c){if(c.cursedThingy)return false;if(exceptionalItem(p,c))return true;if(c.slot==='feet'&&afflicted(p,'bigFeet'))return false;if((p.curses||[]).some(c=>c.curseKey==='tinyHands')&&c.slot==='hand'&&(c.hands||1)>1)return false;if(c.requires&&!c.requires.some(en=>has(p,en)||itemIdentity(p,en)))return false;if(c.forbids?.some(en=>targetsIdentity(p,en)))return false;if(c.sexOnly&&p.sex!==c.sexOnly)return false;return true}
export function itemBonus(p,c,g=null){if(g?.phase==='combat'&&c.slot==='hand'&&((g.monsters||[]).some(m=>m.noWeapons)||afflicted(p,'noWeaponsNext')))return 0;if(c.siege&&g?.phase==='combat'&&!g.siegeDecisions?.[c.uid])return 0;if(c.noBonusAgainst&&g?.phase==='combat'&&(g.monsters||[g.monster]).some(m=>m?.en===c.noBonusAgainst))return 0;if(!itemUsable(p,c)||g?.phase==='combat'&&hasMirror(p)&&(c.type==='item'||c.isItem)&&c.slot!=='body')return 0;let n=(c.bonus||0)+(c.itemEnhancers||[]).reduce((n,c)=>n+(c.bonus||0),0);for(const b of c.sexBonuses||[])if(p.sex===b.sex)n+=b.bonus;for(const b of c.identityBonuses||[])if(has(p,b.identity))n+=b.bonus;if(c.fire&&g?.phase==='combat'&&(g.monsters||[g.monster]).filter(Boolean).some(m=>m.immuneFire))return 0;if(c.fire&&g?.phase==='combat'&&(g.monsters||[]).some(m=>m.doubleFire))n*=2;return n}
export function canUsePotion(g,actor,c){if(!canInterfere(g,actor))return false;if(g.phase!=='combat'||!(c.type==='potion'&&c.isPotion!==false&&c.en!=='Pretty Balloons'||/\bPotion\b/.test(c.en||'')))return true;const fighters=[g.turn,...(g.helper===null?[]:[g.helper])];return fighters.includes(actor)||!fighters.some(i=>g.players[i].equipment.some(item=>item.blockOutsidePotions&&itemUsable(g.players[i],item)))}
export const characterPower=(p,g=null)=>p.level+p.equipment.reduce((n,c)=>n+itemBonus(p,c,g),0)+traitBonus(p)+(g?.phase==='combat'?curseCombatPenalty(p):0);
export function monsterModifiers(g,m){const fighters=[g.players[g.turn],...(g.helper===null?[]:[g.players[g.helper]])];let n=0;for(const b of m.against||[])if(fighters.some(p=>targetsIdentity(p,b.identity)))n+=b.bonus;for(const b of m.againstAny||[])if(fighters.some(p=>b.identities.some(en=>targetsIdentity(p,en))))n+=b.bonus;if(m.soloBonus&&g.helper===null)n+=m.soloBonus;if(m.againstSex&&fighters.some(p=>p.sex===m.againstSex.sex))n+=m.againstSex.bonus;if(m.gmMonster&&(g.weekday??new Date().getDay())===6)n-=2;if(m.snot&&(g.monsters||[]).some(x=>x.nose)||m.nose&&(g.monsters||[]).some(x=>x.snot))n+=6;return n}
export function automaticEscape(p,m){if(m.nose&&has(p,'Gnome'))return true;return !!(!m.noEscape&&(!!m.noPursuitBelow&&p.level<=m.noPursuitBelow&&(!m.pursuesIdentity||!targetsIdentity(p,m.pursuesIdentity))||!!m.neverPursues||m.noPursuitRace?.some(en=>has(p,en))))}
export const itemPrice=c=>c.skunkDiscount?Math.floor((c.gold??0)/2):c.tamed?0:c.gold??(c.type==='item'||c.isItem?500:0);
export const saleValue=c=>Number.isFinite(itemPrice(c))?Math.max(0,itemPrice(c)):0;
export const canSellCard=c=>!c.tamed&&saleValue(c)>0&&(c.type==='item'||c.isItem||Number.isFinite(c.gold));
export function discardHandCard(g,actor,uid){
 const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid);
 if(!c||actor!==g.turn||g.phase==='combat'||g.reaction||((g.pendingAxe||g.pendingMap)||g.pendingCurse)||g.pendingEncounter||g.pendingDivine||g.winner!==null||p.dead)return{ok:false,reason:'Сброс из руки доступен в свой ход вне боя.'};
 p.hand=p.hand.filter(c=>c.uid!==uid);discard(g,c);return{ok:true,card:c};
}
export function sellItem(g,actor,uid){const p=g.players[actor],c=p?.hand.find(c=>c.uid===uid);if(actor!==g.turn||g.phase==='combat'||g.reaction||!c||!canSellCard(c)||p.level>=9||p.dead||g.winner!==null||((g.pendingAxe||g.pendingMap)||g.pendingCurse)||g.pendingEncounter||g.pendingDivine)return{ok:false,reason:'Продавать можно в свой ход вне боя и до 9 уровня.'};const doubled=has(p,'Halfling')&&!g.halflingSale;const gold=itemPrice(c)*(doubled?2:1);if(!gold)return{ok:false,reason:'У этой шмотки нет продажной стоимости.'};p.hand=p.hand.filter(c=>c.uid!==uid);boomReturn(g,actor,c,'sale');discard(g,c);if(doubled)g.halflingSale=true;p.gold=(p.gold||0)+gold;const levels=Math.min(9-p.level,Math.floor(p.gold/1000));p.gold-=levels*1000;p.level+=levels;return{ok:true,gold,levels,doubled}}
export function badStuff(g,p,m,options={}){
 const beforeBoom=[...p.hand,...p.equipment,...(p.carried||[])].filter(c=>c.boomdagger).map(c=>c.uid);
 const {rollDie=()=>1+Math.floor(Math.random()*6),chooseCards=null}=options;
 const effects=m.badStuff||[{type:m.death?'death':'levels',amount:1}],notes=[];
 for(const effect of effects){
  if(CHOICE_BAD_STUFF.has(effect.type)){notes.push(runBadStuffChoices(g,p,m,effect,options));continue}
  if(effect.type==='fungus'){const amount=(targetsIdentity(p,'Elf')?2:1)*(m.humongous?2:1);p.level=Math.max(1,p.level-amount);notes.push(`−${amount} ур.`)}
  if(effect.type==='loseFire'||effect.type==='loseRestricted'){const identities=p.equipment.filter(c=>c.type===effect.kind).map(c=>c.en),lost=itemsInPlay(p).filter(c=>!c.cursedThingy&&(effect.type==='loseFire'?c.fire:(c.requires||[]).some(en=>identities.includes(en))||(c.identityBonuses||[]).some(b=>identities.includes(b.identity))));p.equipment=p.equipment.filter(c=>!lost.includes(c));p.carried=(p.carried||[]).filter(c=>!lost.includes(c));discard(g,lost);notes.push(`Потеряно шмоток: ${lost.length}.`)}
  if(effect.type==='skunk'){const clothes=itemsInPlay(p).filter(clothing);p.skunkClothes=clothes.map(c=>c.uid);for(const c of clothes)c.skunkDiscount=true;notes.push('Пока вся нынешняя одежда не потеряна, никто не помогает. Цена этой одежды снижена вдвое.')}
  if(effect.type==='naughty'){p.naughty=true;notes.push('Чёрный список Санты: сокровищ не будет до самостоятельного убийства монстра.')}
  if(effect.type==='noWeaponsNext'){p.curses??=[];p.curses.push({virtual:true,createdInCombat:g.combatSerial,uid:'weapon-penalty-'+m.uid,id:'axe-no-weapons',name:'Без оружия в следующем бою',desc:'В следующем бою бонусы оружия не действуют.',curseKey:'noWeaponsNext'});notes.push('Следующий бой без бонусов оружия.')}
  if(effect.type==='squeak'){p.squeak=true;notes.push('До следующего хода говори писклявым голосом!')}
  if(effect.type==='gmMonster'){const half=targetsIdentity(p,'Halfling'),elf=targetsIdentity(p,'Elf'),male=p.sex==='male',amount=(half?1:0)+(elf?2:0)+(male?1:0),count=male?1:!half&&!elf?2:0;p.level=Math.max(1,p.level-amount);if(count)notes.push(badStuff(g,p,{badStuff:[{type:'discardHand',count}]},options));notes.push(`−${amount} ур.`)}
  if(effect.type==='orcStomp'){const roll=rollDie()+diePenalty(p);notes.push(`Кубик: ${roll}.`);notes.push(badStuff(g,p,{badStuff:[roll<=2?{type:'death'}:{type:'levels',amount:roll}]},options));if(p.dead)break}
  if(effect.type==='loseClassesOrLevels'){if(p.equipment.some(c=>c.type==='class'))notes.push(badStuff(g,p,{badStuff:[{type:'loseIdentities',kinds:['class']}]},options));else notes.push(badStuff(g,p,{badStuff:[{type:'levels',amount:effect.amount}]},options))}
  if(effect.type==='lowestLevel'){p.level=Math.min(...g.players.map(x=>x.level));notes.push(`Уровень: ${p.level}.`)}
  if(effect.type==='setLevel'){p.level=effect.level;notes.push(`Уровень: ${p.level}.`)}
  if(effect.type==='loseBigItems'||effect.type==='loseAllItems'){const lost=itemsInPlay(p).filter(c=>!c.cursedThingy).filter(c=>effect.type==='loseAllItems'||c.big);const ids=new Set(lost.map(c=>c.uid));p.hand=p.hand.filter(c=>!ids.has(c.uid));p.equipment=p.equipment.filter(c=>!ids.has(c.uid));if(p.carried)p.carried=p.carried.filter(c=>!ids.has(c.uid));discard(g,lost);if(lost.some(c=>c.slot==='head'))loseHeadgearCurse(g,p);notes.push(`Потеряно шмоток: ${lost.length}.`)}
  if(effect.type==='loseIdentities'){const lost=p.equipment.filter(c=>effect.kinds.includes(c.type));p.equipment=p.equipment.filter(c=>!lost.includes(c));discard(g,lost);cleanIdentities(g,p);notes.push('Расы и классы потеряны.')}
  if(effect.type==='wizardOrDeath'){if(has(p,'Wizard')){const lost=p.equipment.filter(c=>c.en==='Wizard');p.equipment=p.equipment.filter(c=>!lost.includes(c));discard(g,lost);cleanIdentities(g,p);notes.push('Класс волшебника потерян.')}else{notes.push(badStuff(g,p,{badStuff:[{type:'death'}]},options));break}}
  if(effect.type==='death'){const lost=[...p.hand,...(p.carried||[]),...p.equipment.filter(c=>!['class','race','multiclass','multirace'].includes(c.type))];discard(g,lost);p.hand=[];p.carried=[];p.equipment=p.equipment.filter(c=>['class','race','multiclass','multirace'].includes(c.type));p.dead=true;p.naughty=false;p.skunkClothes=[];for(const c of p.equipment){delete c.cursedThingy;delete c.cursedBy}notes.push('Смерть: вещи потеряны, классы и расы сохранены.');break}
  if(effect.type==='levels'){let amount=effect.die?Math.max(0,rollDie()+diePenalty(p)):effect.amount+(effect.extraIdentity&&targetsIdentity(p,effect.extraIdentity)?effect.extraAmount||0:0);if(effect.potionsReduce){const potions=p.hand.filter(c=>c.type==='potion'),selected=chooseCards?.(potions,Math.min(amount,potions.length),true)||[];const spent=potions.filter(c=>selected.includes(c.uid)).slice(0,amount);p.hand=p.hand.filter(c=>!spent.includes(c));discard(g,spent);amount-=spent.length;}p.level=Math.max(1,p.level-amount);notes.push(`−${amount} ур.`)}
  if(effect.type==='discardHand'){let cards=effect.types?p.hand.filter(c=>effect.types.includes(c.type)):[...p.hand];if(effect.count){const chosen=chooseCards?.(cards,effect.count);cards=chosen?cards.filter(c=>chosen.includes(c.uid)).slice(0,effect.count):cards.slice(0,effect.count)}p.hand=p.hand.filter(c=>!cards.some(x=>x.uid===c.uid));discard(g,cards);if(effect.drawIfMoreThanOne&&cards.length>1)takeTreasure(g,p,effect.drawIfMoreThanOne);if(effect.reveal)g.revealedHands??={};if(effect.reveal)g.revealedHands[g.players.indexOf(p)]=[...cards,...p.hand].map(c=>c.name);notes.push(`Сброшено из руки: ${cards.length}.`)}
  if(effect.type==='loseGear'){const lost=p.equipment.filter(c=>!c.cursedThingy).filter(c=>!effect.slots||effect.slots.includes(c.slot)||effect.belowWaist&&c.belowWaist);p.equipment=p.equipment.filter(c=>!lost.includes(c));discard(g,lost);if(effect.slots?.includes('head'))loseHeadgearCurse(g,p);if(!lost.length&&effect.otherwiseLevels)p.level=Math.max(1,p.level-effect.otherwiseLevels);notes.push(`Потеряно снаряжения: ${lost.length}.`)}
  if(effect.type==='giveGearToLeaders'){const leaders=g.players.filter(x=>x.level===Math.max(...g.players.map(p=>p.level)));if(leaders.includes(p)){notes.push('Ты среди лидеров: шмотки остаются у тебя.');continue}for(const x of leaders){const c=[...p.equipment].filter(c=>c.type==='item'&&!c.cursedThingy&&!c.tamed).sort((a,b)=>(b.bonus||0)-(a.bonus||0))[0];if(c){p.equipment=p.equipment.filter(x=>x.uid!==c.uid);discardOverlays(g,p,[c.uid]);delete c.overlayBaseUid;x.hand.push(c);notes.push(`${x.name} забирает ${c.name}.`)}}}
 }
 g.boomReturns=(g.boomReturns||[]).filter(e=>!beforeBoom.includes(e.card.uid)||[...p.hand,...p.equipment,...(p.carried||[])].some(c=>c.uid===e.card.uid));return notes.join(' ');
}
// Resolve effects sequentially: a neighbour's choice sees the previous loss.
export async function badStuffInteractive(g,p,m,{choose=null,rollDie=()=>1+Math.floor(Math.random()*6)}={}){
 const beforeBoom=[...p.hand,...p.equipment,...(p.carried||[])].filter(c=>c.boomdagger).map(c=>c.uid);
 const notes=[];for(const effect of m.badStuff||[{type:m.death?'death':'levels',amount:1}]){
  if(CHOICE_BAD_STUFF.has(effect.type)){
   const iter=badStuffChoices(g,p,m,effect);let step=iter.next();while(!step.done){const prompt=step.value;const answer=prompt.kind==='die'?await rollDie(g.players.indexOf(p),m,'badStuff'):choose?await choose(prompt):defaultBadStuffChoice(prompt);step=iter.next(answer)}notes.push(step.value);
  }else{
   let selected=null,raw=null;if(effect.die||effect.type==='orcStomp')raw=await rollDie(g.players.indexOf(p),m,'badStuff');
   if(choose&&(effect.type==='discardHand'&&effect.count||effect.potionsReduce)){const cards=effect.potionsReduce?p.hand.filter(c=>c.type==='potion'):[...p.hand],count=Math.min(effect.count||effect.amount,cards.length);if(count)selected=await choose({actor:g.players.indexOf(p),monster:m,cards,count,optional:!!effect.potionsReduce})}
   notes.push(badStuff(g,p,{...m,badStuff:[effect]},{rollDie:()=>raw??1+Math.floor(Math.random()*6),chooseCards:()=>selected||[]}));
  }if(p.dead)break;
 }g.boomReturns=(g.boomReturns||[]).filter(e=>!beforeBoom.includes(e.card.uid)||[...p.hand,...p.equipment,...(p.carried||[])].some(c=>c.uid===e.card.uid));return notes.join(' ');
}
// Active treasure effects operate on the same state as combat and AI.
export function treasureActions(g,actor,{escaping=false}={}){
 const p=g.players[actor];if(!p)return[];const combat=g.phase==='combat',fighter=actor===g.turn||actor===g.helper,canAct=!p.dead&&g.winner===null&&!((g.pendingAxe||g.pendingMap)||g.pendingCurse)&&(escaping&&fighter||actor===g.turn&&!g.reaction||g.reaction?.order[g.reaction.index]===actor);
 if(!canAct||!fighter||!combat||actor!==g.turn&&!escaping)return[];
 const monsters=(g.monsters||[g.monster]).filter(m=>m&&!m.noEscape&&!hasEscapeGuarantee(g,actor,m));
 return [...p.hand,...p.equipment,...(p.carried||[])].filter(c=>c.action&&!c.cursedThingy).flatMap(c=>{
  const inPlay=p.equipment.includes(c)||(p.carried||[]).includes(c);
  if(c.action==='ratEscape'&&inPlay){const targets=monsters.filter(m=>(m.printedPower??m.power)<=8);return targets.length?[{uid:c.uid,key:c.action,name:'Бросить крысу · смывка от одного монстра',targets:targets.map(m=>({uid:m.uid,name:m.name}))}]:[]}
  if(c.action==='sacrificeHireling'&&inPlay&&monsters.length)return[{uid:c.uid,key:c.action,name:'Пожертвовать наёмником · смывка от одного монстра',targets:monsters.map(m=>({uid:m.uid,name:m.name}))}];
  if(c.action==='sacrificeSteedAll'&&inPlay&&(g.monsters||[g.monster]).length>1&&monsters.length)return[{uid:c.uid,key:c.action,name:'Пожертвовать скакуном · смывка от всех доступных монстров',targets:[]}];
  if(c.action==='instantWall'&&monsters.length)return[{uid:c.uid,key:c.action,name:'Мгновенная стена · добровольная смывка из боя',targets:[]}];
  if(c.action==='babyOil'&&(g.monsters||[g.monster]).some(m=>m&&!hasEscapeGuarantee(g,actor,m)))return[{uid:c.uid,key:c.action,name:'Детское масло · смывка даже от неотпускающих монстров',targets:[]}];
  if(c.action==='flight'&&monsters.length)return[{uid:c.uid,key:c.action,name:'Улететь от доступных монстров',targets:[]}];
  return[];
 });
}
export function useTreasure(g,actor,uid,targetUid=null,options={}){
 const action=treasureActions(g,actor,options).find(a=>a.uid===uid);if(!action)return{ok:false,reason:'Эффект этой карты сейчас недоступен.'};
 if(action.targets.length&&!action.targets.some(t=>t.uid===targetUid))return{ok:false,reason:'Нужна доступная цель.'};
 const p=g.players[actor],c=[...p.hand,...p.equipment,...(p.carried||[])].find(c=>c.uid===uid);
 p.hand=p.hand.filter(x=>x.uid!==uid);p.equipment=p.equipment.filter(x=>x.uid!==uid);if(p.carried)p.carried=p.carried.filter(x=>x.uid!==uid);discard(g,c);
 const monsters=(g.monsters||[g.monster]).filter(Boolean),targets=action.targets.length?monsters.filter(m=>m.uid===targetUid):monsters;
 guaranteeEscape(g,actor,targets,{ignoreNoEscape:action.key==='babyOil'});if(['instantWall','babyOil'].includes(action.key))for(const other of options.willingActors||[])if([g.turn,g.helper].includes(other)&&other!==null)guaranteeEscape(g,other,targets,{ignoreNoEscape:action.key==='babyOil'});g.combatRevision=(g.combatRevision||0)+1;
 return{ok:true,text:`${p.name}: ${action.name}. Бой окончен, теперь смываемся.`,card:c,requiresRunAway:true};
}
export async function rollWithInterference(g,roller,raw,choose,context={}){
 let result=raw;const order=g.players.map((_,i)=>(roller+i)%g.players.length);let changes=0;
 for(;;){let changed=false;for(const actor of order){const p=g.players[actor],own=actor===roller,cards=p.hand.filter(c=>c.action===(own?'loadedDie':'reloadedDie'));if(!cards.length||p.dead)continue;const choice=await choose({actor,roller,result,cards:[...cards],...context});const card=cards.find(c=>c.uid===choice?.uid);if(!card||!Number.isInteger(choice.value)||choice.value<1||choice.value>6)continue;p.hand=p.hand.filter(c=>c.uid!==card.uid);discard(g,card);result=choice.value;changed=true;changes++;if(changes>100)return result}if(!changed)return result}
}

export function awardDarkAfterEscape(g,died=false){if(g.escapeResolved)return;g.escapeResolved=true;for(const actor of g.saboteurs||[]){const p=g.players[actor];if(p.equipment.some(c=>c.darkSabotage)){p.level=Math.min(died?10:9,p.level+1);if(p.level===10)g.winner=actor}}}
