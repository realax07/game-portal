import {physicalCards} from '../public/immediate-cards.js';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {CURSES} from '../public/curses.js';
import {CARDS,SETS,DEFAULT_SETS,makeGame,draw} from '../public/engine.js';

// Deliberately independent of the artwork registry. An image/name is not a rule.
export const canonicalName=name=>name==='Curse! Lose a Level'?'Lose a Level':name;
const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const unique=xs=>[...new Set(xs)];
const tally=xs=>xs.reduce((counts,x)=>(counts[x]=(counts[x]||0)+1,counts),{});
export function inspectPool(sets,names=['Игрок','Бот 1','Бот 2','Бот 3','Бот 4']){
 const g=makeGame(names,sets,'bots');
 const expected=CARDS.filter(c=>g.sets.includes(c.set));
 const cards=physicalCards(g);
 const counts=tally(cards.map(c=>c.id));
 const pile={};
 for(const kind of ['doors','treasures']){
  const sequence=[];while(g[kind].length)sequence.push(draw(g,kind));
  pile[kind]={remainingAfterDeal:sequence.length,reachableDefinitionIds:unique(sequence.map(c=>c.id)).sort()};
 }
 return {sets:g.sets,definitions:expected.length,uniqueNames:unique(expected.map(c=>c.en)).length,instances:cards.length,
  missingDefinitionIds:expected.filter(c=>!counts[c.id]).map(c=>c.id),
  unexpectedDefinitionIds:unique(cards.filter(c=>!expected.some(x=>x.id===c.id)).map(c=>c.id)),
  duplicateUids:cards.length-new Set(cards.map(c=>c.uid)).size,
  countsByDefinition:counts,startingHandsComplete:g.players.every(p=>p.lastDeal?.doors===4&&p.lastDeal?.treasures===4),pile};
}
export async function buildAudit(){
 const core=await read('../reference/core-publisher-lists.json');
 const extra=await read('../public/data/publisher-catalog.json');
 const sources=[...core.sets.map(s=>({...s,copyCountsPreserved:true})),...extra.sets.map(s=>({...s,copyCountsPreserved:false}))];
 const memberships=sources.flatMap(s=>s.groups.flatMap(g=>unique(g.names).map(printedName=>{
  const en=canonicalName(printedName),definitions=CARDS.filter(c=>c.set===s.id&&c.en===en);
  return {set:s.id,section:g.section,printedName,en,source:s.source,customizationOnly:printedName==='(Blank)',
   printedCopies:s.copyCountsPreserved?g.names.filter(n=>n===printedName).length:null,
   definitionIds:definitions.map(c=>c.id),present:definitions.length>0,
   rulesStatuses:definitions.map(c=>c.rulesStatus||'not-classified')};
 })));
 const sets=SETS.map(s=>{
  const source=sources.find(x=>x.id===s.id),cards=CARDS.filter(c=>c.set===s.id),rows=memberships.filter(m=>m.set===s.id);
  const playable=rows.filter(r=>!r.customizationOnly),names=unique(playable.map(r=>r.en));
  return {id:s.id,name:s.name,source:source?.source||s.source||null,hasPublisherList:!!source,
   printedCopies:source?.copyCountsPreserved?source.groups.reduce((n,g)=>n+g.names.length,0):null,
   publisherUniqueNames:source?names.length:null,listedUniqueEntries:source?unique(rows.map(r=>r.en)).length:null,customizationCopies:source?.copyCountsPreserved?rows.filter(r=>r.customizationOnly).reduce((n,r)=>n+r.printedCopies,0):null,matchedNames:unique(playable.filter(r=>r.present).map(r=>r.en)).length,
   missingNames:unique(playable.filter(r=>!r.present).map(r=>r.en)),
   definitions:cards.length,uniqueGameNames:unique(cards.map(c=>c.en)).length,
   rulesStatuses:tally(cards.map(c=>c.rulesStatus||'not-classified'))};
 });
 const definitions=CARDS.map(c=>({id:c.id,set:c.set,en:c.en,name:c.name,type:c.type,deck:c.deck,
  rulesStatus:c.rulesStatus||'not-classified',rulesSource:c.rulesSource||null,
  implementedDescription:c.desc||null,rulesNote:c.rulesNote||null,
  publisherMembershipConfirmed:memberships.some(m=>m.set===c.set&&m.definitionIds.includes(c.id))}));
 const all=inspectPool(SETS.map(s=>s.id)),defaults=inspectPool(DEFAULT_SETS);
 return {schemaVersion:1,sourceDates:{core:core.retrieved,expansions:extra.retrieved},
  limitations:[
   'Пустые карты (Blank) для собственных правил учитываются в печатном объёме, но не в списке отсутствующих игровых названий и не раздаются без заданного эффекта.',
   'Список издателя содержит названия, а не тексты правил. Наличие названия или изображения не означает реализацию.',
   'verified означает существующий статус сверенных метаданных; этот аудит не подтверждает полноту всех эффектов карты.',
   'not-classified означает отсутствие статуса проверки, а не отсутствие особенностей у печатной карты.',
   'В старом каталоге дополнений повторные названия удалены: число печатных экземпляров по нему восстановить нельзя.',
   `Для ${SETS.length-sources.length} наборов нет сохранённого полного списка. Общий список отсутствующих карт является нижней границей.`,
   'Часть наборов имеет специальные колоды; упрощённое отнесение всех карт к дверям/сокровищам не проверено на соответствие оригиналу.'
  ],summary:{definitions:CARDS.length,uniqueGameNames:unique(CARDS.map(c=>c.en)).length,selectableSets:SETS.length,
   setsWithPublisherList:sources.length,publisherUniqueNames:unique(memberships.filter(m=>!m.customizationOnly).map(m=>m.en)).length,
   publisherMemberships:memberships.length,missingMemberships:memberships.filter(m=>!m.customizationOnly&&!m.present).length,
   whollyMissingNames:unique(memberships.filter(m=>!m.customizationOnly&&!CARDS.some(c=>c.en===m.en)).map(m=>m.en)).length,
   rulesStatuses:tally(definitions.map(c=>c.rulesStatus))},
  implementationReview:{
   note:'Проверка структуры и существующих обработчиков, не полная сверка печатных текстов.',
   byType:Object.fromEntries(unique(CARDS.map(c=>c.type)).map(type=>[type,{definitions:CARDS.filter(c=>c.type===type).length,rulesStatuses:tally(CARDS.filter(c=>c.type===type).map(c=>c.rulesStatus||'not-classified'))}])),
   gaps:[
    {area:'Проклятия дополнений',definitions:CARDS.filter(c=>c.type==='curse'&&!CURSES[c.en]&&!c.axeCurse).map(c=>c.id),implementation:'База использует индивидуальный движок public/curses.js. Неподтверждённые проклятия дополнений пока сохраняют базовую адаптацию −1 уровня.'},
    {area:'Подземелья',definitions:CARDS.filter(c=>c.type==='dungeon').map(c=>c.id),implementation:'Разыгрываются как двери с общей прибавкой к силе монстров; отдельная колода и печатные эффекты не реализованы.'},
    {area:'Манчкиномикон',definitions:CARDS.filter(c=>c.en==='Munchkinomicon').map(c=>c.id),implementation:'Только предмет +5; дополнительная колода заклинаний не реализована.'},
    {area:'Частично сверенные карты',definitions:CARDS.filter(c=>c.rulesStatus==='partial').map(c=>c.id),implementation:'Ограничения отражены в implementedDescription каждого определения.'}
   ]
  },
  deckConstruction:{artificialMultipliers:false,officialComposition:false,baseCompositionComplete:sets.find(s=>s.id==='base').missingNames.length===0&&CARDS.filter(c=>c.set==='base'&&c.deck==='doors').reduce((n,c)=>n+c.copies,0)===95&&CARDS.filter(c=>c.set==='base'&&c.deck==='treasures').reduce((n,c)=>n+c.copies,0)===73,
   explanation:'Новые партии используют печатные количества реализованных карт исходных трёх наборов; для частичных дополнений неизвестные количества пока равны одному. База полностью совпадает с 95 дверями и 73 сокровищами; состав дополнений пока неполный.'},
  pools:{defaults,all},sets,definitions,memberships};
}
function markdown(a){
 const s=a.summary,rows=a.sets.map(s=>`| ${s.name} | ${s.definitions} | ${s.publisherUniqueNames??'нет списка'} | ${s.hasPublisherList?s.matchedNames:'—'} | ${s.hasPublisherList?s.missingNames.length:'неизвестно'} |`).join('\n');
 return `# Аудит игровых карт\n\nЭто проверка игровых определений и колод, без учёта изображений. Пересобрать: \`npm run cards:audit\`. Проверить актуальность: \`npm run cards:check\`.\n\n## Результат\n\n- ${s.definitions} игровых определений / ${s.uniqueGameNames} уникальное название в ${s.selectableSets} выбираемых наборах. **800+ реализованных карт нет.**\n- Все определения выбранных наборов попадают в партию; сыгранные мгновенные карты учитываются в сбросах и ожидающих решениях. При выборе всех наборов: ${a.pools.all.instances} экземпляров из ${s.definitions} определений. Отсутствующих игровых ID: ${a.pools.all.missingDefinitionIds.length}.\n- Искусственные множители ×5/×6 убраны из новых партий. Для исходных трёх наборов используются печатные количества уже реализованных карт; для непроверенных дополнений — один экземпляр каждого определения. Состав пока неполный.\n- Правила: ${s.rulesStatuses.verified} с существующей отметкой сверки, ${s.rulesStatuses.partial} частичных, ${s.rulesStatuses.unverified} непроверенных, ${s.rulesStatuses['not-classified']} без статуса. Сверка метаданных не доказывает полноту реализации всех эффектов.\n- Списки ${s.setsWithPublisherList} наборов содержат ${s.publisherUniqueNames} разных названий / ${s.publisherMemberships} вхождений «набор + название + раздел». ${s.missingMemberships} вхождений отсутствуют в соответствующем игровом наборе; ${s.whollyMissingNames} названий не заведены ни в одном наборе. У остальных ${s.selectableSets-s.setsWithPublisherList} наборов полный состав ещё не подтверждён.\n\n## Исходные коробки\n\nУ издателя база содержит 168 экземпляров (95 дверей + 73 сокровища), дополнения 2 и 3 — по 112. Вместе 392 экземпляра. В игре — ${a.pools.defaults.definitions} определений, составляющих ${a.pools.defaults.instances} экземпляров. Базовая универсальная «Go Up a Level» не совпадает с отдельными печатными картами повышения уровня.\n\nБаза содержит все 147 уникальных названий и 168 печатных экземпляров: 95 дверей + 73 сокровища. Мгновенные эффекты раздачи учитываются в руках, сбросах и ожидающих решениях, а не теряются при аудите. Старые сохранения сохраняют прежнее количество карт; миграция обновляет метаданные, но не порядок и состав колод.\n\nВ «Диком топоре» 112 печатных карт включают 4 пустые: игровых названий 102, непустых экземпляров 108. Пустые карты не выдаются как карты без действия.\n\n## Найденные пробелы эффектов\n\n- Статусы каждого монстра перечислены в JSON-реестре. Число проверенных текстов и число работающих обработчиков — разные показатели.\n- Базовые проклятия имеют индивидуальные обработчики, защиту кольцом/сандалиями, способность орка и сохраняемые выборы. Неподтверждённые проклятия дополнений остаются адаптациями.\n- Все 6 подземелий превращены в события дверей с прибавкой к силе монстров. Отдельная колода и печатные правила подземелий не реализованы.\n- У Манчкиномикона нет колоды заклинаний; Reloaded Die применяется только к смывке; ряд предметов сохраняет адаптированные параметры.\n- Наличие обработчика типа карты и описания способности не является проверкой полного печатного текста.\n\n## Покрытие наборов\n\nЧисла относятся к уникальным названиям внутри набора. Наличие в движке **не означает** полную реализацию печатного эффекта.\n\n| Набор | Игровых определений | Названий по издателю | Совпало | Отсутствует |\n| --- | ---: | ---: | ---: | ---: |\n${rows}\n\n## Машиночитаемый реестр\n\n[Полный отчёт](../../public/data/gameplay-audit.json) содержит все отсутствующие названия, наборы, источники, статусы каждого игрового определения и количество экземпляров по каждому ID. [Списки исходных коробок](../core-publisher-lists.json) сохраняют печатные повторы. Старый [каталог дополнений](../../public/data/publisher-catalog.json) удалял повторные названия, поэтому не позволяет проверить точное количество экземпляров дополнений.\n\n## Что требуется для полного каталога\n\n1. Добавить отсутствующие игровые определения с проверенными параметрами, типами и текстами эффектов. Одних названий из списков недостаточно.\n2. Дополнить индивидуальные эффекты существующих адаптаций; проверить отдельные колоды и специальные механики дополнений.\n3. Дополнить печатное количество экземпляров всех дополнений; множители уже убраны из новых партий.\n4. Проверить раздачу, исчерпание и перемешивание сброса, бои и поведение ботов на полном составе.\n\n## Ограничения проверки\n\n${a.limitations.map(x=>'- '+x).join('\n')}\n`;
}
export async function run(check=false){
 const a=await buildAudit();
 // Random shuffle and AI profiles must never make a generated report unstable.
 for(const pool of Object.values(a.pools))delete pool.pile;
 for(const pool of Object.values(a.pools))pool.countsByDefinition=Object.fromEntries(Object.entries(pool.countsByDefinition).sort(([a],[b])=>a.localeCompare(b)));
 const outputs=[['../public/data/gameplay-audit.json',JSON.stringify(a,null,2)+'\n'],['../reference/cards/README.md',markdown(a)]];
 for(const [path,text] of outputs){const url=new URL(path,import.meta.url);if(check){if(await readFile(url,'utf8')!==text)throw new Error('Устарел отчёт: '+fileURLToPath(url))}else await writeFile(url,text)}
 console.log(JSON.stringify({summary:a.summary,pools:Object.fromEntries(Object.entries(a.pools).map(([k,p])=>[k,{definitions:p.definitions,instances:p.instances,missing:p.missingDefinitionIds.length}]))},null,2));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(pathToFileURL(process.argv[1])))await run(process.argv.includes('--check'));
