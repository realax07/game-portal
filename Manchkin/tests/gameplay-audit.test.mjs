import {physicalCards} from '../public/immediate-cards.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,SETS,DEFAULT_SETS,makeGame,draw} from '../public/engine.js';
import {buildAudit,inspectPool,canonicalName} from '../scripts/gameplay-audit.mjs';

// Exercise each selectable set separately; a union-only check can hide a set
// selection bug when names are reused in several boxes.
test('every selectable set includes every one of its game definitions for 1–5 players',()=>{
 assert.equal(new Set(CARDS.map(c=>c.id)).size,CARDS.length,'game IDs must be unique');
 for(const set of SETS)for(const n of [1,3,5]){
  const pool=inspectPool([set.id],Array.from({length:n},(_,i)=>`P${i}`));
  assert.deepEqual(pool.missingDefinitionIds,[],`${set.id}/${n}`);
  assert.deepEqual(pool.unexpectedDefinitionIds,[],`${set.id}/${n}`);
  assert.equal(pool.duplicateUids,0);
  assert.equal(pool.startingHandsComplete,true);
 }
});

test('every queued card can actually be drawn, with no lost or invented instances',()=>{
 const g=makeGame(['P1','P2','P3','P4','P5'],SETS.map(s=>s.id),'bots');
 const before=physicalCards(g);
 const seen=physicalCards(g).filter(c=>!g.doors.includes(c)&&!g.treasures.includes(c));
 for(const kind of ['doors','treasures']){while(g[kind].length)seen.push(draw(g,kind))}
 assert.deepEqual(seen.map(c=>c.uid).sort((a,b)=>a-b),before.map(c=>c.uid).sort((a,b)=>a-b));
 assert.deepEqual(new Set(seen.map(c=>c.id)),new Set(CARDS.map(c=>c.id)));
});

test('publisher coverage requires an actual definition in the corresponding set',async()=>{
 const a=await buildAudit();
 for(const row of a.memberships){
  const expected=CARDS.filter(c=>c.set===row.set&&c.en===canonicalName(row.printedName));
  assert.deepEqual(row.definitionIds,expected.map(c=>c.id));
  assert.equal(row.present,expected.length>0);
 }
 const core=a.sets.filter(s=>DEFAULT_SETS.includes(s.id));
 assert.deepEqual(core.map(s=>s.printedCopies),[168,112,112]);
 const cleric=a.memberships.find(m=>m.set==='base'&&m.printedName==='Cleric');
 assert.equal(cleric.printedCopies,3,'printed duplicates must survive source ingestion');
 const other=a.memberships.find(m=>m.set==='munchkin-4-the-need-for-steed');
 assert.equal(other.printedCopies,null,'deduplicated legacy lists cannot prove physical copy counts');
 const axe=a.sets.find(s=>s.id==='axe');assert.equal(axe.customizationCopies,4);assert.equal(axe.publisherUniqueNames,102);assert.equal(axe.listedUniqueEntries,103);assert.ok(!axe.missingNames.includes('(Blank)'));
 assert.equal(a.summary.missingMemberships,a.memberships.filter(m=>!m.customizationOnly&&!m.present).length);
 assert.equal(a.summary.publisherUniqueNames,new Set(a.memberships.filter(m=>!m.customizationOnly).map(m=>m.en)).size);
});

test('audit distinguishes implemented definitions, unknown effects and printed deck instances',async()=>{
 const a=await buildAudit();
 assert.equal(a.summary.definitions,CARDS.length);
 assert.equal(a.summary.uniqueGameNames,new Set(CARDS.map(c=>c.en)).size);
 assert.equal(Object.values(a.summary.rulesStatuses).reduce((n,x)=>n+x,0),CARDS.length);
 for(const c of CARDS){
  const row=a.definitions.find(d=>d.id===c.id);
  assert.equal(row.rulesStatus,c.rulesStatus||'not-classified');
  assert.equal(a.pools.all.countsByDefinition[c.id],c.copies??1);
 }
 assert.equal(a.pools.all.instances,Object.values(a.pools.all.countsByDefinition).reduce((n,x)=>n+x,0));
});
