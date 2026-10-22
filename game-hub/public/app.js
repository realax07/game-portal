const $=s=>document.querySelector(s);
const safeLoad=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
let favorites=safeLoad('gamehub-favorites',[]),recent=safeLoad('gamehub-recent',[]);
if(!Array.isArray(favorites))favorites=[];
if(!Array.isArray(recent))recent=[];
let games=[],view='all',filter='Все',lastFocus=null;
const persist=()=>{try{localStorage.setItem('gamehub-favorites',JSON.stringify(favorites));localStorage.setItem('gamehub-recent',JSON.stringify(recent))}catch{}};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 const count=String(games.length).padStart(2,'0');
 $('#total-count').textContent=count;
 $('#nav-count').textContent=count;
 $('#hero-count').textContent=`01 / ${count}`;
 const search=$('#search').value.trim().toLocaleLowerCase('ru');
 let visible=games.filter(g=>(view==='all'||view==='favorites'&&favorites.includes(g.id)||view==='recent'&&recent.includes(g.id))&&(filter==='Все'||g.category===filter)&&`${g.title} ${g.category} ${g.description} ${g.id==='vice'?'GTA ГТА':g.id==='tanks'?'танки динозавры':g.id==='poker'?'покер':''}`.toLocaleLowerCase('ru').includes(search));
 if(view==='recent')visible.sort((a,b)=>recent.indexOf(a.id)-recent.indexOf(b.id));
 $('#games').innerHTML=visible.map(g=>`<article class="game-card"><div class="card-image"><a href="#play/${g.id}" data-play="${g.id}" aria-label="Играть в ${escape(g.title)}"><img src="${g.image}" alt="${escape(g.title)} — игровой экран" loading="lazy"></a><button class="favorite" data-favorite="${g.id}" aria-pressed="${favorites.includes(g.id)}" aria-label="${favorites.includes(g.id)?'Убрать из избранного':'В избранное'}: ${escape(g.title)}">${favorites.includes(g.id)?'♥':'♡'}</button><span class="image-tag">${g.category.toUpperCase()}</span></div><div class="card-body"><h3>${escape(g.title)}</h3><p>${escape(g.subtitle)}</p><div class="card-bottom"><span>${g.tags.map(escape).join(' · ')}</span><button class="card-play" data-play="${g.id}" ${g.available?'':'disabled'}>${g.available?'Играть':'Недоступна'} <span>↗</span></button></div></div></article>`).join('');
 $('#result-count').textContent=visible.length;
 $('#favorite-count').textContent=favorites.length;
 $('#empty').hidden=visible.length>0;
 $('#empty-text').textContent=view==='favorites'&&!favorites.length?'Нажмите на сердечко у игры, чтобы сохранить её здесь.':view==='recent'&&!recent.length?'Запустите любую игру — она появится здесь.':'Попробуйте другой запрос или жанр.';
}
function openGame(id){
 const game=games.find(g=>g.id===id);
 if(!game||!game.available)return;
 lastFocus=document.activeElement;
 recent=[id,...recent.filter(x=>x!==id)].slice(0,20);persist();
 $('#player-title').textContent=game.title;$('#controls').textContent=game.controls;
 $('#standalone').href=game.url;$('#game-frame').title=game.title;$('#game-frame').src=game.url;
 $('#player').hidden=false;document.body.classList.add('playing');document.title=`${game.title} — Игровая`;
 $('#back').focus();render();
}
function closeGame(){
 if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
 $('#game-frame').src='about:blank';$('#player').hidden=true;document.body.classList.remove('playing');document.title='Игровая — ваша коллекция игр';
 if(lastFocus?.isConnected)lastFocus.focus();else $('#search').focus();
}
function route(){const match=location.hash.match(/^#play\/(\w+)$/);if(match)openGame(match[1]);else closeGame()}
document.addEventListener('click',e=>{
 const play=e.target.closest('[data-play]');if(play){e.preventDefault();location.hash=`play/${play.dataset.play}`;return}
 const favorite=e.target.closest('[data-favorite]');if(favorite){const id=favorite.dataset.favorite;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];persist();render();$(`[data-favorite="${id}"]`)?.focus();return}
 const tab=e.target.closest('[data-view]');if(tab){view=tab.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===tab));const label={all:'Библиотека',favorites:'Избранное',recent:'Недавние'}[view];$('#breadcrumb').textContent=label;$('#library-title').firstChild.textContent=label+' ';$('#hero').hidden=view!=='all';render()}
 const category=e.target.closest('[data-filter]');if(category){filter=category.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b===category));render()}
});
$('#search').addEventListener('input',render);
$('#reset').onclick=()=>{$('#search').value='';filter='Все';document.querySelector('[data-filter="Все"]').click();document.querySelector('[data-view="all"]').click()};
$('#back').onclick=()=>{history.replaceState(null,'',location.pathname+location.search);closeGame()};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else{await $('#player').requestFullscreen();$('#game-frame').focus()}}catch{$('#game-frame').focus()}};
document.addEventListener('keydown',e=>{if(e.key==='/'&&$('#player').hidden&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus()}});
$('#game-frame').addEventListener('load',()=>{try{const frame=$('#game-frame');if(frame.contentWindow.location.pathname==='/'){frame.contentWindow.location.replace('/games/durak/');return}if(!$('#player').hidden)frame.contentWindow.focus()}catch{}});
window.addEventListener('hashchange',route);
try{const response=await fetch('/api/games');if(!response.ok)throw Error('load');games=await response.json();render();if(location.hash)route()}catch{$('#error').hidden=false;$('#empty').hidden=true}
