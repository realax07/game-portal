import {writeFile} from 'node:fs/promises';
import {TRAITS,PACKS,DECKS,FLORA} from '../public/catalog.js';
let out='# Реестр карт и проверяемых правил\n\nИсточник данных интерфейса: public/catalog.js. Исследование и ограничения: ../PLAN.md.\n\n';
for(const [pack,p] of Object.entries(PACKS)){
 out+='## '+p.name+'\n\n| Свойство | Еда + | Тип | Реализуемая механика |\n|---|---:|---|---|\n';
 for(const t of Object.values(TRAITS).filter(t=>t.pack===pack))out+=`| ${t.name} | ${t.food} | ${t.type} | ${t.description} |\n`;
 out+='\n### Физическая колода\n\n| Основное свойство | Альтернатива | Копий |\n|---|---|---:|\n';
 for(const [primary,secondary,count] of DECKS[pack]||[])out+=`| ${TRAITS[primary].name} | ${TRAITS[secondary]?.name||'—'} | ${count} |\n`;
 out+='\n';
}
out+='## Флора: 12 эффектов\n\nТираж реконструирован: по 2 копии; требует сверки по физическим картам.\n\n';
for(const f of Object.values(FLORA))out+=`- **${f.name}**: ${f.description}\n`;
await writeFile('research/CARD-REGISTER.md',out);
