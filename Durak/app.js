import {Game} from './game.js';
const $=id=>document.getElementById(id);
let game, timer, selected=null, thinking=false;
const red=c=>['♥','♦'].includes(c.suit);
const cardHTML=(c,extra='')=>`<span class="corner">${c.label}<small>${c.suit}</small></span><span class="center-suit">${c.suit}</span><span class="corner bottom">${c.label}<small>${c.suit}</small></span>${extra}`;
function cardNode(c,button=false){const el=document.createElement(button?'button':'div');el.className=`card ${red(c)?'red':''}`;el.innerHTML=cardHTML(c);el.setAttribute('aria-label',`${c.label} ${c.suit}${c.suit===game.trump?' — козырь':''}`);return el;}
function start(){clearTimeout(timer);selected=null;thinking=false;game=new Game();render();schedule();}
function schedule(){
  clearTimeout(timer);
  const pending=!game.result && (game.attacker===1 ? !game.table.some(p=>!p.defense) || game.taking : !game.taking && game.table.some(p=>!p.defense));
  thinking=!!pending;
  render();
  if(pending)timer=setTimeout(()=>{thinking=false;game.aiStep();selected=null;render();schedule();},650);
}
function play(card){
  if(thinking || game.result)return;
  if(game.attacker!==0){
    const targets=game.table.map((p,i)=>game.legal(0,card,i)?i:-1).filter(i=>i>=0);
    if(targets.length>1){selected=selected===card.id?null:card.id;render();return;}
  }
  if(game.play(0,card.id)){selected=null;render();schedule();}
}
function render(){
  const attack=game.attacker===0, taken=game.taking;
  $('round').textContent=`Раунд ${String(game.round).padStart(2,'0')}`;
  $('opponent-info').textContent=`${game.hands[1].length} карт на руках`;
  $('opponent-role').textContent=attack?'ЗАЩИЩАЕТСЯ':'АТАКУЕТ';
  $('opponent-hand').replaceChildren();
  const visible=Math.min(game.hands[1].length,12);
  for(let i=0;i<visible;i++){const el=document.createElement('div');el.className='back';$('opponent-hand').append(el);}
  $('deck-area').replaceChildren();
  if(game.deck.length){
    $('deck-area').append(cardNode(game.trumpCard));
    if(game.deck.length>1){const back=document.createElement('div');back.className='back';$('deck-area').append(back);}
    const count=document.createElement('span');count.className='deck-badge';count.textContent=game.deck.length;$('deck-area').append(count);
  }else $('deck-area').innerHTML='<div class="empty-deck">♧</div>';
  $('battle').replaceChildren();
  if(game.result){
    const messages={win:['Ваша победа!','Все карты сыграны. Отличная партия.'],lose:['В этот раз — соперник','Реванш? Удача любит настойчивых.'],draw:['Ничья!','Последние карты ушли в отбой вместе.']};
    const [title,desc]=messages[game.result];
    $('battle').innerHTML=`<div class="empty-table"><span class="win-icon">${game.result==='win'?'♛':'✦'}</span><h2 class="result-title">${title}</h2><p>${desc}</p></div>`;
  }else if(!game.table.length){
    $('battle').innerHTML=`<div class="empty-table"><span class="outline-suit">♧</span><strong>${attack?'Ваш первый ход':'Соперник выбирает карту'}</strong><p>${attack?'Положите любую карту из руки':'Сейчас начнётся новый розыгрыш'}</p></div>`;
  }else game.table.forEach((p,i)=>{
    const pair=document.createElement('div');pair.className='pair';pair.append(cardNode(p.attack));
    if(p.defense){const defense=cardNode(p.defense);defense.classList.add('defense');pair.append(defense);}
    if(selected){const c=game.hands[0].find(c=>c.id===selected);if(c && game.legal(0,c,i)){pair.classList.add('target');const target=pair.firstChild;target.setAttribute('role','button');target.tabIndex=0;target.setAttribute('aria-label',`Побить ${p.attack.label} ${p.attack.suit}`);const apply=()=>{game.play(0,selected,i);selected=null;render();schedule();};target.onclick=apply;target.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();apply();}};}}
    $('battle').append(pair);
  });
  $('trump-label').innerHTML=`<b>${game.trump}</b> козырь`;
  $('discard-label').textContent=`${game.discard.length} карт в отбое`;
  $('deck-count').textContent=game.deck.length;$('discard-count').textContent=game.discard.length;$('trump-stat').textContent=game.trump;
  $('hand-count').textContent=game.hands[0].length;
  const sorted=[...game.hands[0]].sort((a,b)=>(a.suit===game.trump)-(b.suit===game.trump) || a.suit.localeCompare(b.suit) || a.rank-b.rank);
  $('player-hand').replaceChildren();
  const width=$('player-hand').clientWidth || 600;
  const cardWidth=window.innerWidth<=680?74:window.innerWidth<=950?77:88;
  const overlap=Math.min(-8,(width-30-cardWidth*sorted.length)/Math.max(1,sorted.length-1));
  $('player-hand').style.setProperty('--overlap',`${overlap}px`);
  for(const c of sorted){const el=cardNode(c,true);const legal=!thinking && game.legal(0,c);el.disabled=!legal;if(legal)el.classList.add('playable');if(selected===c.id)el.classList.add('selected');el.onclick=()=>play(c);$('player-hand').append(el);}
  let title,help,status;
  if(game.result){title=game.result==='win'?'Красиво сыграно':game.result==='draw'?'На равных':'Будет реванш?';help='Начните новую партию — карты уже ждут.';status='Партия завершена';}
  else if(thinking){title='Соперник думает';help=attack?'Сейчас соперник решит, чем отбиться.':'Соперник выбирает ход. Скоро ваша очередь.';status='Соперник выбирает карту…';}
  else if(attack && taken){title='Соперник берёт';help='Можно подкинуть подходящие карты или завершить ход.';status='Соперник забирает стол. Подкинете ещё?';}
  else if(attack){title=game.table.length?'Подкинем ещё?':'Ваш ход';help=game.table.length?'Подкиньте карту того же достоинства, что есть на столе, или нажмите «Бито».':'Начните с любой карты. Нажмите на неё, чтобы положить на стол.';status=game.table.length?'Все карты отбиты. Можно подкинуть или закончить ход.':'Светлые карты можно сыграть';}
  else {title='Ваша защита';help=selected?'Выберите карту на столе, которую хотите побить.':'Бейте старшей картой той же масти или козырем. Можно забрать весь стол.';status=selected?'Нажмите на выделенную карту на столе':'Выберите карту для защиты';}
  $('turn-title').textContent=title;$('turn-help').textContent=help;$('status').textContent=status;
  $('hand-hint').textContent=selected?'Выберите карту на столе':thinking?'Ожидаем соперника':game.result?'Сыграем ещё одну?':'Нажмите на карту, чтобы сыграть';
  $('finish').hidden=!attack || !!game.result;
  $('finish').textContent=taken?'Завершить ход →':'Бито →';
  $('finish').disabled=thinking || (!game.covered && !taken);
  $('take').hidden=attack || !!game.result;
  $('take').disabled=thinking || !game.table.length || taken;
}
$('finish').onclick=()=>{if(!thinking && game.finish(0)){selected=null;schedule();}};
$('take').onclick=()=>{if(!thinking && game.take(0)){selected=null;schedule();}};
$('new-game').onclick=start;
$('rules-open').onclick=()=>$('rules').showModal();
$('rules-close').onclick=()=>$('rules').close();
$('rules').onclick=e=>{if(e.target===$('rules')){const r=$('rules').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('rules').close();}};
window.addEventListener('resize',()=>render());
start();
