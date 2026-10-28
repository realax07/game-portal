import {PACKS} from './catalog.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<img class="icon" src="/assets/${name}.svg" alt="">`;
export function lobbySettings(){return `
 <div class="lobby-form-grid">
  <label class="form-label">Название лобби<input name="title" maxlength="24" placeholder="Новая экспедиция"></label>
  <label class="form-label">Режим игры<select name="mode" id="room-mode" aria-label="Режим игры"><option value="online">Лобби · отдельные устройства</option><option value="hotseat">За одним столом · один экран</option></select></label>
 </div>
 <div data-room-security>
  <label class="form-label">Доступ<select name="visibility" id="room-visibility" aria-label="Доступ"><option value="open">Открытое · видно в поиске</option><option value="private">Закрытое · логин и пароль</option></select></label>
  <div class="lobby-form-grid" data-private-fields hidden>
   <label class="form-label">Логин лобби<input name="login" maxlength="32" autocomplete="off" placeholder="Например, friends" disabled></label>
   <label class="form-label">Пароль лобби<input name="password" type="password" maxlength="128" autocomplete="new-password" disabled></label>
  </div>
 </div>
 <p class="form-note" data-mode-hint>Друзья входят в свободные человеческие слоты. Боты присоединяются сразу.</p>
 <div class="form-section-title">Игровые слоты <span>От 2 до 8 участников</span></div>
 <div class="create-slots">${Array.from({length:8},(_,i)=>`<div class="create-slot"><span>${String(i+1).padStart(2,'0')}</span><select name="slot-${i}" aria-label="Тип слота ${i+1}" ${i===0?'disabled':''}><option value="human" ${i<2?'selected':''}>Человек${i===0?' · вы':''}</option><option value="bot" ${i===2?'selected':''}>Бот</option><option value="closed" ${i>2?'selected':''}>Закрыт</option></select>${i===0?'<span class="slot-owner-note">Создатель</span>':`<input name="slot-name-${i}" maxlength="24" aria-label="Имя в слоте ${i+1}" placeholder="Имя (необязательно)">`}</div>`).join('')}</div>`;}

export function slotsView(game){
 const editable=game.canManage&&(game.phase==='lobby'||game.mode==='hotseat');
 return `<div class="configured-seats">${(game.slots||[]).map((s,i)=>{
  if(game.phase!=='lobby'&&!s.playerId)return '';
  if(!editable&&s.kind==='closed')return '';
  const p=game.players.find(p=>p.id===s.playerId),fixed=game.mode!=='hotseat'&&s.playerId===game.host;
  const title=p?.name||(s.kind==='closed'?'Слот закрыт':'Свободное место');
  const state=s.kind==='bot'?'Бот':s.kind==='closed'?'Не участвует':game.mode==='hotseat'?'Человек за этим экраном':p?'Человек подключён':'Ожидаем человека';
  return `<div class="configured-seat ${s.kind}"><div class="seat-summary"><div class="avatar c${i}">${icon(['fox','deer-head','wolf-head','rabbit','eagle-head','frog','elephant','butterfly'][i])}</div><div><h3>${esc(title)}${s.playerId===game.me?' <small>сейчас вы</small>':''}</h3><span>${state} · слот ${i+1}</span></div></div>${editable?`<form class="slot-form" data-slot-form="${s.id}"><select name="kind" aria-label="Управление слотом ${i+1}" ${fixed?'disabled':''}><option value="human" ${s.kind==='human'?'selected':''}>Человек</option><option value="bot" ${s.kind==='bot'?'selected':''}>Бот</option>${game.phase==='lobby'?`<option value="closed" ${s.kind==='closed'?'selected':''}>Закрыт</option>`:''}</select><input name="seatName" maxlength="24" value="${esc(p?.name||'')}" placeholder="Имя" aria-label="Имя участника ${i+1}"><button type="submit" class="button outline small-button" data-fixed-kind="${fixed?s.kind:''}">Применить</button></form>`:''}</div>`;
 }).join('')}</div>`;
}

export function lobbyBrowser({rooms,query,loading,name}){return `<main class="room-page lobby-browser">
 <div class="room-heading"><div><span class="eyebrow">ПОИСК ЭКСПЕДИЦИИ</span><h1>Открытые <em>лобби.</em></h1><p class="muted">Выберите стол, найдите комнату по ID или доверьтесь случаю.</p></div><button class="button primary" data-do="create">Создать лобби ↗</button></div>
 <div class="lobby-browser-tools"><form id="lobby-search-form" class="lobby-search"><input name="search" aria-label="Название или ID открытого лобби" value="${esc(query)}" placeholder="Название или ID открытого лобби"><button class="button outline" type="submit">Найти</button></form><button class="button outline" data-do="refresh-lobbies" ${loading?'disabled':''}>Обновить ↻</button><button class="button outline" data-do="join">Вход по ID / логину и паролю</button></div>
 <form id="random-lobby-form" class="random-lobby"><div><span class="eyebrow">СЛУЧАЙНЫЙ СТОЛ</span><p>Войти в случайное открытое лобби со свободным человеческим слотом.</p></div><label>Ваше имя<input name="name" maxlength="24" required value="${esc(name)}" placeholder="Имя исследователя"></label><button class="button primary" type="submit">Найти случайное →</button></form>
 <div class="open-lobby-list">${loading?'<p class="muted">Ищем открытые столы…</p>':rooms.length?rooms.map(r=>`<article class="open-lobby-card"><div><span class="eyebrow">ID ${esc(r.code)} · ОТКРЫТОЕ</span><h2>${esc(r.title)}</h2><p>Люди: ${r.humans} · Боты: ${r.bots} · Свободно: ${r.vacant}</p><small>${r.packs.map(p=>esc(PACKS[p]?.short||p)).join(' · ')||'Базовая игра'}</small></div><button class="button ${r.vacant?'primary':'outline'}" data-join-room="${esc(r.code)}" ${!r.vacant?'disabled':''}>${r.vacant?'Присоединиться →':'Мест нет'}</button></article>`).join(''):'<div class="no-lobbies">'+icon('fern')+'<h2>Пока тихо.</h2><p>Открытых лобби по этому запросу нет. Создайте своё или войдите по ID и паролю.</p></div>'}</div>
 <p class="small muted">Список показывает комнаты на этом сервере localhost. Закрытые лобби и игры за одним экраном в поиске не отображаются.</p></main>`;}

export function hotseatScreen(game){const p=game.players.find(p=>p.id===game.me);return `<main class="hotseat-screen"><span class="eyebrow">ЗА ОДНИМ СТОЛОМ · ХОД ${game.year}</span>${icon('paw-print')}<h1>Передайте устройство<br><em>${esc(p?.name)}.</em></h1><p>Остальные игроки не должны видеть эту руку.<br>Нажмите кнопку, когда будете готовы.</p><button class="button primary" data-do="unlock-seat">Показать мою руку →</button><button class="button outline" data-do="manage-players">Участники · заменить человеком или ботом</button><button class="text-link" data-do="home">На главную</button></main>`;}
