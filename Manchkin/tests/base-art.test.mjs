import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE_ART_CATALOG as catalog} from '../public/base-art-data.js';
import {filterBaseArt} from '../public/base-art.js';
import {GENERATED_CARD_ART} from '../public/generated-card-art.js';
test('full base album preserves all unique originals, physical copies and accurate art progress',()=>{
  assert.equal(catalog.entries.length,147);
  assert.equal(new Set(catalog.entries.map(c=>c.en)).size,147);
  assert.equal(catalog.entries.reduce((n,c)=>n+c.copies,0),168);
  assert.equal(catalog.ready,catalog.entries.filter(c=>c.art).length);
  assert.equal(catalog.pending,147-catalog.ready);
  for(const c of catalog.entries) if(c.art) assert.equal(c.art.file,GENERATED_CARD_ART[c.en].file);
});
test('album filtering separates unfinished art from art ready outside the playable sample',()=>{
  const entries=[{en:'A',name:'Беседка',printedName:'A',deck:'doors',art:{file:'a'},batch:'new',generatedAt:'2026-10-26',generationOrder:2,playable:false},
    {en:'B',name:'Б',printedName:'B',deck:'treasures',art:null},
    {en:'C',name:'В',printedName:'C',deck:'doors',art:{file:'c'},batch:'old',generatedAt:'2026-10-25',generationOrder:1}];
  assert.deepEqual(filterBaseArt(entries,{status:'latest'}).map(c=>c.en),['A']);
  assert.deepEqual(filterBaseArt(entries,{status:'pending'}).map(c=>c.en),['B']);
  assert.equal(filterBaseArt(entries,{status:'ready',query:'БЕСЕДКА'})[0].playable,false);
  assert.equal(filterBaseArt(entries,{status:'all',deck:'treasures'}).length,1);
  assert.equal(filterBaseArt(entries,{status:'all',query:'не существует'}).length,0);
});
