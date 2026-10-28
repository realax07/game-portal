// Import completed imagegen outputs from a saved batch; never generates images.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GENERATED_CARD_ART} from '../public/generated-card-art.js';
import {CARDS} from '../public/engine.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const batchPath=resolve(root,process.argv[2]||'');
assert.ok(relative(root,batchPath).startsWith('reference/art/batch-')&&batchPath.endsWith('.json'),'Pass a project reference/art/batch-*.json');
const batch=JSON.parse(fs.readFileSync(batchPath));
// Each finished generation has its own recovery record, safe across interruptions.
for(const j of batch.jobs){
  const resultPath=resolve(root,'reference/art/results',j.id+'-v1.json');
  if(!j.source&&fs.existsSync(resultPath)){
    const result=JSON.parse(fs.readFileSync(resultPath));
    assert.equal(result.id,j.id);
    assert.equal(result.en,j.en);
    Object.assign(j,{source:result.source,date:result.date,status:'generated'});
  }
}
const promptsPath=resolve(root,'reference/art/prompts.json');
const prompts=JSON.parse(fs.readFileSync(promptsPath));
const manifestPath=resolve(root,'public/data/generated-art.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath));
const base=JSON.parse(fs.readFileSync(resolve(root,'reference/art/base-publisher-list.json')));
const known=new Set([...CARDS.map(c=>c.en),...base.groups.flatMap(g=>g.names)]);
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(p,data)=>fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');
const targets=batch.jobs.filter(j=>j.source&&!GENERATED_CARD_ART[j.en]);
for(const j of targets){
  assert.ok(known.has(j.en),`Unknown card ${j.en}`);
  assert.match(j.id,/^[a-z0-9-]+$/);
  assert.match(j.file,/^assets\/illustrations\/[a-z0-9-]+-v\d+\.jpg$/);
  assert.ok(!prompts.entries.some(p=>p.id===j.id||p.en===j.en||p.file===j.file),'Already recorded '+j.en);
  assert.ok(j.prompt?.length>40&&j.alt?.length>15&&j.date,'Missing generation metadata '+j.en);
  fs.accessSync(j.source);
  assert.ok(!fs.existsSync(resolve(root,'public',j.file)),'Do not overwrite existing illustration '+j.file);
}
for(const j of targets){
  const original=`reference/art/originals/${j.id}-v1.png`;
  const originalPath=resolve(root,original);
  fs.mkdirSync(dirname(originalPath),{recursive:true});
  if(fs.existsSync(originalPath)) assert.equal(hash(fs.readFileSync(originalPath)),hash(fs.readFileSync(j.source)),'Different archived original '+j.id);
  else fs.copyFileSync(j.source,originalPath);
  const runtime=resolve(root,'public',j.file);
  execFileSync('sips',['-s','format','jpeg','-s','formatOptions','80','-z','384','384',originalPath,'--out',runtime]);
  const bytes=fs.statSync(runtime).size;
  assert.ok(bytes<150000,'Illustration too large '+j.file);
  prompts.entries.push({id:j.id,en:j.en,name:j.name||j.en,alt:j.alt,prompt:j.prompt,file:j.file,source:j.source,
    archivedOriginal:original,date:j.date,batch:batchPath.split('/').at(-1).replace(/\.json$/,''),...(j.editReference?{editReference:j.editReference}:{})});
  GENERATED_CARD_ART[j.en]={file:j.file,alt:j.alt};
  manifest.entries.push({en:j.en,file:j.file,alt:j.alt,bytes,width:384,height:384,origin:'Original image generated with built-in imagegen',date:j.date});
  j.status='ready';
  save(promptsPath,prompts);
  save(manifestPath,manifest);
  fs.writeFileSync(resolve(root,'public/generated-card-art.js'),'// Original generated caricatures. SVG remains the fallback for other game cards.\nexport const GENERATED_CARD_ART='+JSON.stringify(GENERATED_CARD_ART,null,2)+';\n');
  save(batchPath,batch);
}
for(const j of batch.jobs) if(GENERATED_CARD_ART[j.en]) j.status='ready';
batch.status=batch.jobs.every(j=>j.status==='ready')?'completed':'in-progress';
save(batchPath,batch);
console.log(`Imported ${targets.length} illustrations; batch ${batch.status}. Run npm run art:sync.`);
