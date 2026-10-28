import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
test('base art planning preserves the full 95 + 73 printed list and deduplicates repeated names',async()=>{
  const base=await json('reference/art/base-publisher-list.json');
  assert.deepEqual(base.groups.map(g=>g.names.length),[95,73]);
  const all=base.groups.flatMap(g=>g.names);
  assert.equal(new Set(all).size,147);
  assert.equal(all.filter(n=>n==='Elf').length,3);
  const registry=await json('reference/art/registry.json');
  const coverage=registry.setCoverage.find(s=>s.id==='base');
  assert.equal(coverage.scope,'publisher-list');
  assert.equal(coverage.total,147);
  assert.equal(coverage.ready+coverage.pending,147);
});
test('every saved publisher name is either illustrated or in the queue, even when absent from the game',async()=>{
  const base=await json('reference/art/base-publisher-list.json');
  const catalog=await json('public/data/publisher-catalog.json');
  const registry=await json('reference/art/registry.json');
  const backlog=await json('reference/art/backlog.json');
  const ready=new Set(registry.entries.map(e=>e.en));
  const pending=new Map(backlog.entries.map(e=>[e.en,e]));
  assert.equal(pending.size,backlog.entries.length);
  for(const set of [{...base,id:'base'},...catalog.sets]) for(const g of set.groups) for(const name of g.names){
    const en=name==='Curse! Lose a Level'?'Lose a Level':name;
    assert.ok(ready.has(en)||pending.has(en),`${set.id}: ${name} lost from art planning`);
    assert.ok(!(ready.has(en)&&pending.has(en)),en);
    if(pending.has(en)){
      assert.ok(pending.get(en).catalogMembership.some(m=>m.set===set.id));
      if(set.id==='base') assert.equal(pending.get(en).priority,0);
    }
  }
  if(pending.has('3,872 Orcs')) assert.equal(pending.get('3,872 Orcs').playable,pending.get('3,872 Orcs').cards.length>0);
  assert.equal(registry.summary.pendingPlayableCards,backlog.entries.filter(e=>e.playable).length);
  assert.equal(registry.summary.pendingUniqueCards,pending.size);
});
