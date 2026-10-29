import {createTavernAudio} from './tavern-audio.js';

export function installAudio(){
 const audio=createTavernAudio(),button=document.getElementById('sound');
 const panel=document.createElement('section');panel.id='audio-panel';panel.className='audio-panel';panel.hidden=true;panel.setAttribute('aria-label','Звуки таверны');
 panel.innerHTML=`<div class="audio-heading"><div><small>АТМОСФЕРА ЗА СТОЛОМ</small><h2>Звуки таверны</h2></div><button class="icon-btn" id="audio-close" aria-label="Закрыть настройки звука">×</button></div><button class="outline audio-toggle" id="audio-toggle"></button><p id="audio-status" role="status"></p><div class="audio-mixer">${[['master','Общая громкость'],['music','Музыка таверны'],['ambient','Фон: камин и зал'],['effects','Карты и эффекты']].map(([key,label])=>`<label for="audio-${key}"><span>${label}</span><output for="audio-${key}" id="audio-value-${key}"></output><input id="audio-${key}" data-audio-volume="${key}" type="range" min="0" max="100" step="1" aria-label="${label}"></label>`).join('')}</div><div class="audio-preview"><span>Проверить эффекты</span>${[['card','▧ Карта'],['dice','⚄ Кубики'],['magic','✧ Магия'],['coins','◆ Монеты']].map(([key,label])=>`<button class="outline" data-audio-preview="${key}">${label}</button>`).join('')}</div><p class="audio-note">Лютня, флейта и тихий камин. Настройки сохраняются на этом устройстве. В скрытой вкладке таверна затихает.</p>`;
 document.body.append(panel);button.title='Музыка и звуки';button.setAttribute('aria-label','Настройки музыки и звуков');button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
 const close=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false')};
 button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){void audio.unlock();panel.querySelector('#audio-toggle').focus()}};
 panel.querySelector('#audio-close').onclick=()=>{close();button.focus()};
 panel.querySelector('#audio-toggle').onclick=async()=>{audio.set({enabled:!audio.settings.enabled});await audio.unlock();audio.effect('card')};
 panel.querySelectorAll('[data-audio-volume]').forEach(input=>{input.oninput=()=>{audio.set({[input.dataset.audioVolume]:Number(input.value)/100});void audio.unlock()};input.onchange=()=>{if(input.dataset.audioVolume==='effects')audio.effect('card')}});
 panel.querySelectorAll('[data-audio-preview]').forEach(el=>el.onclick=async()=>{if(!audio.settings.enabled)audio.set({enabled:true});await audio.unlock();audio.effect(el.dataset.audioPreview)});
 audio.subscribe(s=>{
  button.classList.toggle('enabled',s.enabled&&s.master>0);button.textContent=s.enabled&&s.master>0?'♫':'♩';
  const toggle=panel.querySelector('#audio-toggle');toggle.textContent=s.enabled?'Выключить весь звук':'Включить звуки таверны';toggle.setAttribute('aria-pressed',String(s.enabled));
  panel.querySelector('#audio-status').textContent=s.status==='unavailable'?'Браузер не смог включить звук. Попробуй обновить страницу.':!s.enabled?'Таверна пока молчит.':s.master===0?'Общая громкость — 0%.':s.status==='playing'?'Музыканты играют, камин потрескивает.':s.status==='paused'?'Звук на паузе.':'Нажми, чтобы запустить звук.';
  for(const key of ['master','music','ambient','effects']){panel.querySelector('#audio-'+key).value=Math.round(s[key]*100);panel.querySelector('#audio-value-'+key).textContent=Math.round(s[key]*100)+'%'}
 });
 document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!button.contains(e.target))close();if(e.isTrusted)void audio.unlock()},{capture:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();e.stopImmediatePropagation();close();button.focus()}else if(e.isTrusted)void audio.unlock()},true);
 document.addEventListener('click',e=>{if(!e.isTrusted||panel.contains(e.target)||button.contains(e.target))return;const target=e.target.closest('button');if(!target||target.disabled)return;audio.effect(target.matches('.hand-card,[data-own-card],[data-card],[data-equipped],.monster-inspect,[data-net-inspect]')?'card':'click')},true);
 document.addEventListener('visibilitychange',()=>audio.setHidden(document.hidden));audio.setHidden(document.hidden);
 return audio;
}
