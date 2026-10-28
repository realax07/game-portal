// Rebuild the art ledger without generating images or changing the runtime mapping.
import {readFile, writeFile, mkdir, copyFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import assert from 'node:assert/strict';
import {CARDS, LEGACY_CARDS, SETS} from '../public/engine.js';
import {GENERATED_CARD_ART} from '../public/generated-card-art.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const read = p => readFile(resolve(root, p));
const prompts = JSON.parse(await read('reference/art/prompts.json'));
const baseList = JSON.parse(await read('reference/art/base-publisher-list.json'));
assert.equal(baseList.groups[0].names.length,95);
assert.equal(baseList.groups[1].names.length,73);
const published = JSON.parse(await read('public/data/publisher-catalog.json'));
const catalogs = [{...baseList,id:'base'},...published.sets];
// The local sample shortens this printed name; do not generate it twice.
const canonical = en => en==='Curse! Lose a Level' ? 'Lose a Level' : en;
const memberships = new Map();
for(const set of catalogs) for(const group of set.groups) for(const name of group.names){
  const en=canonical(name);
  if(!memberships.has(en)) memberships.set(en,[]);
  const links=memberships.get(en);
  const existing=links.find(x=>x.set===set.id && x.section===group.section);
  if(existing) existing.listedCopies++;
  else links.push({set:set.id,printedName:name,section:group.section,source:set.source,listedCopies:1});
}
const groups = new Map();
for (const c of [...CARDS,...LEGACY_CARDS]) {
  if (!groups.has(c.en)) groups.set(c.en, []);
  groups.get(c.en).push({id:c.id, name:c.name, set:c.set, type:c.type, deck:c.deck,...(c.legacyOnly?{legacyOnly:true}:{})});
}
const digest = b => createHash('sha256').update(b).digest('hex');
const entries = [];
const ids = new Set(), files = new Set();
for (const p of prompts.entries) {
  assert.ok(!ids.has(p.id), `Duplicate prompt id: ${p.id}`); ids.add(p.id);
  assert.ok(!files.has(p.file), `Duplicate runtime file: ${p.file}`); files.add(p.file);
  assert.ok(groups.has(p.en)||memberships.has(p.en), `Unknown card: ${p.en}`);
  assert.equal(GENERATED_CARD_ART[p.en]?.file, p.file, `Runtime mapping: ${p.en}`);
  assert.equal(GENERATED_CARD_ART[p.en]?.alt, p.alt, `Alt text: ${p.en}`);
  assert.ok(p.prompt?.length > 40, `Missing generation prompt: ${p.en}`);
  // Keep each version's source inside the project, independent of the Codex cache.
  const version = p.file.match(/-(v\d+)\./)?.[1];
  assert.ok(version, `Expected versioned filename: ${p.file}`);
  const originalPath = p.archivedOriginal || (p.id === 'dragon'
    ? 'reference/art/plutonium-dragon-source.png'
    : `reference/art/originals/${p.id}-${version}.png`);
  let original;
  try { original = await read(originalPath); }
  catch (error) {
    if (check || error.code !== 'ENOENT') throw error;
    await mkdir(dirname(resolve(root, originalPath)), {recursive:true});
    await copyFile(p.source, resolve(root, originalPath));
    original = await read(originalPath);
  }
  assert.equal(original.subarray(1,4).toString(), 'PNG', originalPath);
  const runtime = await read(`public/${p.file}`);
  assert.equal(runtime.readUInt16BE(0), 0xffd8, p.file);
  entries.push({id:p.id, version, status:'ready', en:p.en, name:p.name||groups.get(p.en)?.[0]?.name||p.en, batch:p.batch||'initial', cards:groups.get(p.en)||[], catalogMembership:memberships.get(p.en)||[],
    generatedAt:p.date || prompts.date, tool:prompts.tool, alt:p.alt,
    prompt:p.prompt, sourceCachePath:p.source,...(p.editReference?{editReference:p.editReference}:{}),
    original:{path:originalPath, bytes:original.length, sha256:digest(original),
      width:original.readUInt32BE(16), height:original.readUInt32BE(20)},
    runtime:{path:`public/${p.file}`, bytes:runtime.length, sha256:digest(runtime), ...prompts.runtimeExport}});
}
assert.deepEqual(new Set(Object.keys(GENERATED_CARD_ART)), new Set(entries.map(e=>e.en)), 'Unrecorded runtime art');
const diskFiles = (await readdir(resolve(root,'public/assets/illustrations'))).filter(f=>/\.(jpg|jpeg|png|webp)$/i.test(f));
const historicalRuntime=(prompts.variants||[]).filter(v=>v.runtime).map(v=>{
  assert.ok(v.runtime.path.startsWith('public/assets/illustrations/'),'Unexpected historical image path');
  return v.runtime.path.split('/').at(-1);
});
assert.deepEqual(new Set(diskFiles), new Set([...entries.map(e=>e.runtime.path.split('/').at(-1)),...historicalRuntime]), 'Unrecorded illustration files');
const ready = new Set(entries.map(e=>e.en));
const variants=[];
for(const v of prompts.variants||[]){
  const bytes=await read(v.archivedOriginal);
  assert.equal(digest(bytes),v.sha256,`Changed archived variant: ${v.id}`);
  if(v.runtime){
    const runtime=await read(v.runtime.path);
    assert.equal(digest(runtime),v.runtime.sha256,`Changed historical JPEG: ${v.id}`);
  }
  variants.push({...v,bytes:bytes.length});
}
const allNames = new Set([...groups.keys(),...memberships.keys()]);
const backlog = [...allNames].filter(en=>!ready.has(en)).map(en=>{
  const cards=groups.get(en)||[], catalogMembership=memberships.get(en)||[];
  const sets=[...new Set([...cards.map(c=>c.set),...catalogMembership.map(c=>c.set)])];
  return {en,cards,catalogMembership,sets,playable:cards.some(c=>!c.legacyOnly),status:'pending',
    currentArt:cards.length?'SVG fallback':'not imported into game',
    priority:sets.includes('base')?0:sets.some(s=>['axe','cleric'].includes(s))?1:2};
});
backlog.sort((a,b)=>a.priority-b.priority || a.en.localeCompare(b.en,'en'));
const summary = {readyImages:entries.length, coveredCardDefinitions:entries.reduce((n,e)=>n+e.cards.length,0),
  archivedVariants:variants.length,
  pendingUniqueCards:backlog.length, totalUniqueCards:allNames.size,
  playableUniqueCards:[...groups.values()].filter(cards=>cards.some(c=>!c.legacyOnly)).length, pendingPlayableCards:backlog.filter(c=>c.playable).length,
  publishedListRecords:catalogs.reduce((n,s)=>n+s.groups.reduce((m,g)=>m+g.names.length,0),0),
  runtimeBytes:entries.reduce((n,e)=>n+e.runtime.bytes,0)};
const setCoverage = SETS.map(set=>{
  const localNames = new Set(CARDS.filter(c=>c.set===set.id).map(c=>c.en));
  const catalog=catalogs.find(s=>s.id===set.id);
  const names = catalog ? new Set(catalog.groups.flatMap(g=>g.names.map(canonical))) : localNames;
  const painted = [...names].filter(en=>ready.has(en)).length;
  return {id:set.id, name:set.name, scope:catalog?'publisher-list':'local-sample',ready:painted, pending:names.size-painted, total:names.size,
    playable:localNames.size,playableReady:[...localNames].filter(en=>ready.has(en)).length};
});
const registry = {schemaVersion:2, sources:{prompts:'reference/art/prompts.json', runtimeMapping:'public/generated-card-art.js',baseCatalog:'reference/art/base-publisher-list.json',expansionCatalog:'public/data/publisher-catalog.json'},
  preferences:{style:'Забавная карикатура, крупный силуэт, выразительные лица, простой фон',
    quality:'Достаточно для карт, без дорогой проработки мелких деталей', runtimeExport:prompts.runtimeExport}, summary, setCoverage, entries, variants};
const table = entries.map(e=>`| ${e.name} | ${e.en} | ${[...new Set([...e.cards.map(c=>c.set),...e.catalogMembership.map(c=>c.set)])].join(', ')} | [${e.version}](../../${e.runtime.path}) | [PNG](../../${e.original.path}) |`).join('\n');
const baseCoverage=setCoverage.find(s=>s.id==='base');
const baseRows = new Map();
for(const group of baseList.groups) for(const printedName of group.names){
  const en=canonical(printedName);
  if(baseRows.has(en)){baseRows.get(en).copies++;continue;}
  const generated=entries.find(e=>e.en===en);
  baseRows.set(en,{en,printedName,name:generated?.name||groups.get(en)?.[0]?.name||printedName,
    deck:group.section.startsWith('Doors')?'doors':'treasures',copies:1,
    playable:groups.has(en),batch:generated?.batch||null,generatedAt:generated?.generatedAt||null,generationOrder:generated?entries.indexOf(generated):-1,
    art:generated?{file:GENERATED_CARD_ART[en].file,alt:generated.alt}:null});
}
const baseArtCatalog={printedCards:168,totalUnique:baseRows.size,ready:baseCoverage.ready,pending:baseCoverage.pending,
  source:baseList.source,entries:[...baseRows.values()]};
const document = `# Учёт сгенерированных иллюстраций

Готово: **${summary.readyImages} рисунков**, покрывают **${summary.coveredCardDefinitions} определений карт в игре**. Полная очередь по сохранённым спискам издателя и локальным подборкам: **${summary.pendingUniqueCards} уникальных названий**. Из них **${summary.pendingPlayableCards}** уже есть в игре и используют SVG; остальные ещё не импортированы в игровой движок. Объём игровых JPEG: **${summary.runtimeBytes} байт**.

**Текущий приоритет — полный базовый оригинал, затем дополнения.** База: 168 печатных карт с повторами, ${baseCoverage.total} уникальных названий в [списке издателя](base-publisher-list.json); рисунки готовы для ${baseCoverage.ready}, осталось ${baseCoverage.pending}. В игровой подборке базы пока ${baseCoverage.playable} определения, с рисунками ${baseCoverage.playableReady}. Завершение иллюстраций локальной подборки не означает завершение всей оригинальной коробки.

Сохранённые официальные списки содержат ${summary.publishedListRecords} записей, включая повторы между наборами. Ранее очередь считалась только по ${summary.playableUniqueCards} уникальным именам игрового движка; теперь учитываются и отсутствующие в игре названия. Это не заявление о полноте всей франшизы или об игре всеми перечисленными картами.

Это учёт оригинальных генераций, а не сканов издателя. SVG Game-icons в этот счёт не входят. Одна иллюстрация используется для всех карт с одинаковым английским именем.

## Готовые рисунки

| Карта | Английское имя | Наборы | Игровой файл | Сохранённый оригинал |
| --- | --- | --- | --- | --- |
${table}

## Прогресс по наборам

Карикатуры уже есть в ${setCoverage.filter(s=>s.ready).length} из ${setCoverage.length} наборов. [Полный учёт по наборам](registry.json) включает и дополнения без готовых рисунков.

| Набор с готовыми рисунками | Готово | Осталось | Область учёта |
| --- | --- | --- | --- |
${setCoverage.filter(s=>s.ready).map(s=>`| ${s.name} | ${s.ready} | ${s.pending} | ${s.scope==='publisher-list'?'список издателя':'локальная подборка'} |`).join('\n')}

## Где продолжать

- [registry.json](registry.json): полный реестр, статусы, версии, английские имена, ID карт и наборы, точные промпты, инструмент, дата, размеры, вес, SHA-256 и пути оригиналов/JPEG.
- [backlog.json](backlog.json): очередь ещё не нарисованных уникальных карт, включая не импортированные в игру; приоритет 0 — полный базовый набор. Поле playable различает игровые карты и записи каталога. Статусы запущенных генераций хранятся отдельно в batch-*.json.
- [prompts.json](prompts.json): исходные записи генераций; [runtime mapping](../../public/generated-card-art.js) определяет активный рисунок в игре.
- Полный визуальный альбом базы: public/base-art.html (на localhost:4387/base-art.html). Он показывает и иллюстрации для ещё не импортированных игровых карт; счётчик относится ко всем 147 уникальным названиям.

Все ${entries.length} оригинальных PNG сохранены внутри проекта. Абсолютные пути в sourceCachePath оставлены для истории: наличие кеша Codex для продолжения не требуется.

Архив дополнительных вариантов: ${variants.length}. Они не включаются в готовые рисунки или игровую привязку; промпты, причины отклонения и SHA-256 находятся в variants реестра и prompts.json.
${variants.map(v=>`- ${v.name||v.en}: ${v.reason}. [PNG](../../${v.archivedOriginal})`).join('\n')}

## Порядок следующей серии

1. Прочитать этот файл, реестр и очередь. Не генерировать повторно карты со статусом ready без запроса на замену.
2. Брать карты из backlog.json. Последнее указание пользователя: сначала закончить полный оригинальный базовый набор, затем возвращаться к дополнениям. До завершения базы не чередовать наборы. Использовать забавную карикатуру, простой фон, крупные формы и умеренную детализацию: пользователю достаточно качества для карт.
3. Сохранить исходный PNG в reference/art/originals/ и игровой JPEG 384×384, качество 80, в public/assets/illustrations/. Имена должны иметь версию, например card-v1.jpg.
4. Записать промпт и метаданные в batch-*.json. Сразу после каждой генерации сохранить PNG в проект и отдельную запись reference/art/results/ID-v1.json (id, en, date, source). Выполнить npm run art:import -- reference/art/batch-ИМЯ.json: импорт прочитает эти записи и заполнит prompts.json, игровые привязки и манифест. Уже готовые записи не перегенерируются. Можно задать archivedOriginal для явного пути к PNG.
5. Не перезаписывать исходники. Отклонённые варианты сохранять в prompts.json → variants с точным промптом, причиной, archivedOriginal и SHA-256; они попадут в архив реестра, не в счётчик готовых карт. Исправление до импорта получает отдельный ID и файл-сосед. Для замены уже активного рисунка сначала сохранить его полную историю.
6. Выполнить npm run art:sync, затем npm run art:check и npm test. Реестр, таблица и очередь пересобираются автоматически; готовые карты исчезают из очереди. Проверка обнаруживает незарегистрированные игровые изображения, несоответствие привязок и изменения файлов по хешам.

art:sync ничего не генерирует, не меняет игровые привязки и не перезаписывает оригиналы. Если архивного PNG ещё нет, он копирует его из записанного source. art:check работает только на чтение.
`;
const outputs = {'reference/art/registry.json':JSON.stringify(registry,null,2)+'\n',
  'public/base-art-data.js':'// Generated by npm run art:sync. Includes art-only publisher cards.\nexport const BASE_ART_CATALOG='+JSON.stringify(baseArtCatalog,null,2)+';\n',
  'reference/art/backlog.json':JSON.stringify({schemaVersion:1, entries:backlog},null,2)+'\n',
  'reference/art/README.md':document};
for (const [path, content] of Object.entries(outputs)) {
  if (check) assert.equal((await read(path)).toString(),content,`Art ledger is stale: ${path}. Run npm run art:sync`);
  else await writeFile(resolve(root,path),content);
}
console.log(`${check?'Checked':'Updated'} art inventory: ${entries.length} ready, ${backlog.length} pending; original PNGs archived.`);
