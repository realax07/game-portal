import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {CARDS} from '../public/engine.js';
import {CURSES} from '../public/curses.js';
import {PRINTED_COPIES} from '../public/deck-composition.js';
export async function buildAxeAudit(){
 const {sets}=JSON.parse(await readFile(new URL('../reference/core-publisher-lists.json',import.meta.url),'utf8'));
 const source=sets.find(s=>s.id==='axe'),cards=CARDS.filter(c=>c.set==='axe');
 const rows=source.groups.flatMap(group=>[...new Set(group.names)].filter(en=>en!=='(Blank)').map(en=>{
  const matches=cards.filter(c=>c.en===en),deck=group.section.startsWith('Doors')?'doors':'treasures',printedCopies=group.names.filter(name=>name===en).length;
  if(matches.length>1)throw Error('Duplicate Axe definition: '+en);
  const card=matches[0];if(card?.type==='monster'&&!Array.isArray(card.badStuff))throw Error('Missing Bad Stuff: '+en);if(card?.type==='curse'&&!card.axeCurse&&!CURSES[en])throw Error('Missing curse handler: '+en);if(card?.type==='special'&&!card.effect&&!card.action)throw Error('Missing special handler: '+en);if(card&&(card.deck!==deck||card.copies!==printedCopies||PRINTED_COPIES.axe[en]!==printedCopies))throw Error('Incorrect Axe deck or copies: '+en);
  return {en,deck,printedCopies,present:!!card,id:card?.id??null,rulesStatus:card?.rulesStatus??(card?'not-classified':'missing'),rulesSource:card?.rulesSource??null,sharedRuleFrom:card?.sharedRuleFrom??null,description:card?.desc??null,note:card?.rulesNote??null,mechanics:card?Object.fromEntries(Object.entries(card).filter(([key])=>!['id','set','en','name','icon','rulesStatus','rulesSource','rulesNote','desc','membershipSource','sharedRuleFrom'].includes(key))):null};
 }));
 if(cards.some(c=>!rows.some(r=>r.en===c.en)))throw Error('Unexpected Axe card');
 const blanks=source.groups.map(g=>({deck:g.section.startsWith('Doors')?'doors':'treasures',copies:g.names.filter(n=>n==='(Blank)').length}));
 return {updated:'2026-10-28',set:'axe',edition:'Classic first edition; saved publisher list with 2010+ corrections. Not the 2026 second edition.',membershipSource:source.source,stage:rows.every(r=>r.present)?'mechanics-complete':'mechanics-in-progress',sourceReview:'Older printed images and official 2010+ corrections; full current-English edition comparison remains separate.',expectedUnique:rows.length,expectedPlayableCopies:rows.reduce((n,r)=>n+r.printedCopies,0),printedCopies:source.groups.reduce((n,g)=>n+g.names.length,0),customizationBlanks:blanks,implementedDefinitions:cards.length,implementedCopies:cards.reduce((n,c)=>n+c.copies,0),missing:rows.filter(r=>!r.present).map(r=>r.en),rows};
}
function markdown(a){return `# «Дикий топор»: состав и механики

Обновлено: ${a.updated}. **Этап игровых определений и индивидуальных эффектов выбранной редакции завершён.**

В игре **${a.implementedDefinitions}/${a.expectedUnique} названий**, **${a.implementedCopies}/${a.expectedPlayableCopies} игровых экземпляров**: 64 двери и 44 сокровища. Печатные 112 включают ещё четыре пустые карты для собственных правил; они не выдаются. [Состав издателя](${a.membershipSource}), [полный реестр](axe-implementation.json). Изображения на состав и добор не влияют. По умолчанию остаются база, «Дикий топор» и «Клирические ошибки». Новые определения участвуют в новых партиях; старое сохранение автоматически не пополняется.

## Что работает

- Все 27 монстров: отдельные параметры, награды, реакции на расы и классы, запреты помощи/вмешательства, непотребства и выборы жертвы. Гриб с «Громадным», огонь против великана, комбинация соплей с Носом, самостоятельная победа после Санты, союзная рука и раздавливание микроба.
- Все проклятия, включая связанные с вещью, постоянные и на один бой; снятие кольцом, отмена орком, защита шапочкой. Общая потеря уровня с личной/общей отменой, выбор начала великодушной раздачи.
- Вещи с ограничениями, четыре руки и нормализация при потере лишних рук, два слоя брони/головняка, защита от зелий и воровства, маскировка бородой, общий лимит изгнания нежити у клирика и кувалды. Бумеранг возвращается после потери, но не после непотребства, смерти или аннигиляции.
- Выбор осадной машины в начале каждого боя, в том числе после присоединения помощника.
- Усилители монстров, «Мамочка» и её связь с «Детёнышем», дружественное завершение либо два броска для продолжения боя, отсутствие сокровищ у «Без гроша».
- «Аннигиляция» убирает карту из партии и снимает действующие бонусы; для бродячей твари второй участник пары возвращается в руку. Удалённый открытый монстр не даёт второй двери или награды.
- Отдельное окно «Троянского коня» до сокровищ: отмена добычи, необязательный новый бой, сохранение уже полученных уровней. После победного уровня вмешаться поздно.
- Распродажа, обмен руки с выбором колод, усилитель вещи, зелья и все карты уровня; условия высшего уровня и двойного повышения соблюдаются.
- Сохраняемые решения, выборы человека и бота, разрешённые сетевые действия. Боты не пытаются применять запрещённые карты и не зацикливаются на замене вещи наёмника.

## Проверка

228 автоматических тестов, включая пять полных партий с ботами на разных фиксированных случайных последовательностях. В браузере проверены «Троянский конь», цепочка двух боёв у ботов с двумя решениями осадной машины до 10-го уровня, обмен руки и перезагрузка посреди выбора. [Журнал проверки](../qa/axe-complete-2026-10-28.md). Команды: \`npm test\`, \`npm run cards:check\`, \`npm run cards:axe:check\`, \`npm run art:check\`.

## Источники и пределы

Реализация и сверка редакций — отдельные статусы. Использованы изображения старого выпуска и официальные поправки 2010+; \`partial\` не скрыт и означает незавершённое сравнение с актуальным английским изданием, а не заглушку обработчика. [Заметки по источникам](axe-source-notes.md) фиксируют отличия. Старое изображение не применяется вопреки официальному исправлению.

Общие ограничения движка, в частности полное разграбление тела и полное воскрешение клирика, остаются отдельными задачами [бэклога](../../BACKLOG.md). Согласованные правила проекта, включая победный уровень в самостоятельном бою и человека при свободной мультирасе, сохранены.

## Следующий этап

Отрисовка «Дикого топора» небольшими партиями по бэклогу; текущие подходящие картинки сохранять. Новые картинки в этой работе не генерировались. Отсутствующих игровых названий: **${a.missing.length}**.
`;}
export async function run(check=false){const a=await buildAxeAudit();for(const [name,content]of [['axe-implementation.json',JSON.stringify(a,null,2)+'\n'],['axe-progress.md',markdown(a)]]){const url=new URL('../reference/rules/'+name,import.meta.url);if(check){if(await readFile(url,'utf8')!==content)throw Error('Stale Axe audit: '+name)}else await writeFile(url,content)}console.log(JSON.stringify({definitions:a.implementedDefinitions,copies:a.implementedCopies,expected:a.expectedUnique,missing:a.missing.length}));}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(pathToFileURL(process.argv[1])))await run(process.argv.includes('--check'));
