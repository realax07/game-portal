import test from 'node:test';import assert from 'node:assert/strict';
import {CARDS,makeGame,startCombat,equip,gearLayout,unequip,upgradeSave,runAway,runAwayInteractive,useAbility,has,handLimit,beginReactions} from '../public/engine.js';
import {itemUsable,itemBonus,monsterModifiers,badStuff,treasureActions,useTreasure} from '../public/card-effects.js';
import {useCombatPotion} from '../public/combat.js';
import {specialOptions,playSpecialCard} from '../public/special-cards.js';
import {startCurse,cursePrompt} from '../public/curses.js';
import {discard} from '../public/decks.js';
import {chooseBotAction} from '../public/ai.js';
let uid=9900000;const card=en=>{const c=CARDS.find(c=>c.en===en);assert.ok(c,en);return{...structuredClone(c),uid:uid++}};
const game=()=>{const g=makeGame(['A','B','C'],['base','axe'],'hotseat');delete g.pendingDivine;g.players.forEach(p=>{p.hand=[];p.equipment=[]});g.discards={doors:[],treasures:[]};return g};
const wear=(p,en)=>{const c=card(en);p.hand.push(c);assert.equal(equip(p,c).ok,true,en);return c};
test('Raincoat and Knight Light stack above ordinary slots in either equip order and each appears once',()=>{
 for(const order of [['Leather Armor','Raincoat','Horny Helmet','Knight Light'],['Raincoat','Leather Armor','Knight Light','Horny Helmet']]){const g=game(),p=g.players[0];order.forEach(en=>wear(p,en));assert.equal(p.equipment.length,4);const layout=gearLayout(p).filter(s=>s.card);assert.equal(layout.length,4);assert.equal(new Set(layout.map(s=>s.card.uid)).size,4);assert.deepEqual(layout.filter(s=>s.overlay).map(s=>s.card.en).sort(),['Knight Light','Raincoat']);assert.equal(itemBonus(p,p.equipment.find(c=>c.en==='Knight Light')),2);const head=wear(p,'Skull Helmet');assert.equal(p.equipment.filter(c=>c.slot==='head').length,2);assert.equal(p.equipment.find(c=>c.en==='Knight Light').overlayBaseUid,head.uid)}
});
test('Losing base armor loses Raincoat too, whereas unequipping armor leaves the raincoat usable alone',()=>{
 const g=game(),p=g.players[0],armor=wear(p,'Leather Armor');wear(p,'Raincoat');unequip(p,armor.uid);assert.deepEqual(p.equipment.map(c=>c.en),['Raincoat']);assert.equal(p.equipment[0].overlayBaseUid,null);equip(p,p.hand.find(c=>c.uid===armor.uid));badStuff(g,p,{badStuff:[{type:'loseGear',slots:['body']}]});assert.equal(p.equipment.length,0);assert.deepEqual(new Set(g.discards.treasures.map(c=>c.en)),new Set(['Leather Armor','Raincoat']));
 const h=game(),q=h.players[0],head=wear(q,'Horny Helmet');wear(q,'Knight Light');q.equipment=q.equipment.filter(c=>c.uid!==head.uid);discard(h,head);assert.equal(q.equipment.length,0);assert.equal(h.discards.treasures.length,2);
});
test('A headgear curse removes both layers; theft loses the attached light but transfers only the helmet',()=>{
 const g=game(),p=g.players[0];wear(p,'Horny Helmet');wear(p,'Knight Light');startCurse(g,card('Curse! Lose the Headgear You Are Wearing'),0);assert.ok(cursePrompt(g).done);assert.equal(p.equipment.length,0);assert.equal(g.discards.treasures.length,2);
 const t=game(),victim=t.players[1],helmet=wear(victim,'Horny Helmet');wear(victim,'Knight Light');wear(t.players[0],'Thief');const cost=card('Elf');t.players[0].hand=[cost];assert.ok(useAbility(t,0,'steal',{costUids:[cost.uid],targetUid:helmet.uid,rollDie:()=>6}).ok);assert.equal(victim.equipment.length,0);assert.ok(t.players[0].hand.some(c=>c.uid===helmet.uid));assert.deepEqual(t.discards.treasures.map(c=>c.en),['Knight Light']);
});
test('Raincoat blocks outsider potions on both sides and special potions, while both fighters retain their choices',()=>{
 const g=game();wear(g.players[0],'Raincoat');startCombat(g,card('Net Troll'));g.helper=1;
 for(const actor of [0,1,2]){for(const side of ['fighters','monsters']){const potion=card('Potion of Idiotic Bravery');g.players[actor].hand=[potion];const before=g.boost;const r=useCombatPotion(g,actor,potion.uid,{side});assert.equal(r.ok,actor!==2);if(actor===2){assert.equal(g.boost,before);assert.equal(g.players[actor].hand[0].uid,potion.uid)}}}
 const transfer=card('Transferral Potion'),illusion=card('Illusion');g.players[2].hand=[transfer,illusion,card('Potted Plant')];assert.equal(specialOptions(g,2,transfer),null);assert.equal(playSpecialCard(g,2,transfer.uid,{targetUid:2}).ok,false);assert.ok(specialOptions(g,2,illusion));unequip(g.players[0],g.players[0].equipment[0].uid);assert.ok(specialOptions(g,2,transfer));
});
test('Fake Beard gives dwarf-only equipment and monster reactions without dwarf abilities or half-breed immunity',()=>{
 const g=game(),p=g.players[0];wear(p,'Fake Beard');assert.equal(has(p,'Dwarf'),false);assert.equal(handLimit(p),5);assert.equal(itemUsable(p,card('Hammer of Kneecapping')),true);assert.equal(monsterModifiers(g,card('3,872 Orcs')),6);wear(p,'Elf');wear(p,'Half-Breed');assert.equal(monsterModifiers(g,card('3,872 Orcs')),6);wear(p,'Huge Rock');const other=card('Mithril Armor');p.hand.push(other);assert.equal(equip(p,other).ok,false);
});
test('Baby Oil can guarantee both consenting fighters even against an unescapable monster, and survives saving',()=>{
 const g=game();startCombat(g,card('Floating Nose'));g.helper=1;const oil=card('Baby Oil');g.players[0].hand=[oil];assert.ok(treasureActions(g,0).some(a=>a.key==='babyOil'));assert.ok(useTreasure(g,0,oil.uid,null,{willingActors:[1,2]}).ok);const restored=upgradeSave(JSON.parse(JSON.stringify(g)));assert.equal(restored.players[0].hand.length,0);let rolled=0;const result=runAway(restored,()=>{rolled++;return 1});assert.equal(rolled,0);assert.equal(result.length,2);assert.ok(result.every(r=>r.escaped));assert.equal(restored.players[2].level,1);assert.deepEqual(restored.unconditionalEscapes,{});
});
test('Baby Oil leaves a non-consenting helper to escape separately and is offered before an impossible escape',async()=>{
 const g=game();startCombat(g,card('Floating Nose'));g.helper=1;const oil=card('Baby Oil');g.players[0].hand=[oil];let offered=0;const result=await runAwayInteractive(g,async()=>null,()=>1,null,async({actor})=>{offered++;if(actor===0)assert.ok(useTreasure(g,0,oil.uid,null,{escaping:true}).ok)});assert.equal(offered,2);assert.equal(result[0].escaped,true);assert.equal(result[1].escaped,false);
 const h=game();startCombat(h,card('Floating Nose'));h.players[0].hand=[card('Potion of Flight')];assert.ok(!treasureActions(h,0).length);
});
test('Bots equip protective gear with no strength bonus and do not repeatedly attempt potions blocked by Raincoat',()=>{
 const g=game(),p=g.players[0];p.bot=true;p.hand=[card('Raincoat')];assert.equal(chooseBotAction(g,0,'prepare',()=>0).type,'equip');wear(p,'Raincoat');p.level=9;p.equipment.push({bonus:30});startCombat(g,card('Potted Plant'));g.players[1].bot=true;g.players[1].aiProfile='saboteur';g.players[1].hand=[card('Potion of Idiotic Bravery')];beginReactions(g);assert.equal(chooseBotAction(g,1,'react',()=>0).type,'pass');
});
