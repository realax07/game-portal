import {BASE_ART_CATALOG as catalog} from './base-art-data.js';
export function filterBaseArt(entries,{query='',status='ready',deck='all'}={}){
  const latest=entries.filter(e=>e.art&&e.batch).toSorted((a,b)=>(a.generatedAt||'').localeCompare(b.generatedAt||'')||(a.generationOrder??-1)-(b.generationOrder??-1)).at(-1)?.batch;
  const q=query.trim().toLocaleLowerCase('ru');
  return entries.filter(e=>(deck==='all'||e.deck===deck)&&
    (status==='all'||(status==='ready'&&e.art)||(status==='pending'&&!e.art)||(status==='latest'&&e.art&&e.batch===latest))&&
    `${e.name} ${e.en} ${e.printedName}`.toLocaleLowerCase('ru').includes(q));
}
// Importable filtering logic is also exercised without a browser.
if(typeof document!=='undefined'){
  const $=s=>document.querySelector(s);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $('#ready-count').textContent=`${catalog.ready} / ${catalog.totalUnique}`;
  $('#remaining-count').textContent=catalog.pending;
  $('#art-progress').value=catalog.ready;
  function update(){
    const cards=filterBaseArt(catalog.entries,{query:$('#art-search').value,status:$('#art-status').value,deck:$('#art-deck').value});
    $('#shown-count').textContent=`Показано ${cards.length} из ${catalog.totalUnique} разных карт оригинала`;
    $('#empty').hidden=cards.length>0;
    $('#art-grid').innerHTML=cards.map(c=>`<article class="art-card ${c.deck==='treasures'?'treasure':''} ${c.art?'':'pending'}"><div class="card-top"><span>${c.deck==='doors'?'▥ ДВЕРЬ':'◆ СОКРОВИЩЕ'}</span><span>${c.copies>1?'×'+c.copies:'✦'}</span></div>${c.art?`<a class="image-wrap" href="${esc(c.art.file)}" target="_blank" rel="noopener" aria-label="Открыть рисунок: ${esc(c.name)}"><img src="${esc(c.art.file)}" alt="${esc(c.art.alt)}" loading="lazy" decoding="async"></a>`:'<div class="image-wrap placeholder"><b aria-hidden="true">?</b><span>Рисунок впереди</span></div>'}<h2>${esc(c.name)}</h2>${c.name!==c.printedName?`<p class="english">${esc(c.printedName)}</p>`:''}<p class="status">${c.art?'✓ Иллюстрация готова':'В очереди'}${c.playable?' · Есть в игре':''}</p></article>`).join('');
  }
  $('#art-search').addEventListener('input',update);
  $('#art-status').addEventListener('change',update);
  $('#art-deck').addEventListener('change',update);
  update();
}
