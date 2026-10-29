import test from 'node:test';
import assert from 'node:assert/strict';
import {audioSettings,AUDIO_DEFAULTS,AUDIO_KEY,eventCue,createAudioEvents,createTavernAudio} from '../public/tavern-audio.js';

test('audio preferences preserve explicit silence and reject invalid saved data',()=>{
 assert.deepEqual(audioSettings(null),AUDIO_DEFAULTS);
 assert.deepEqual(audioSettings({enabled:true,master:0,music:-9,ambient:12,effects:NaN}),{enabled:true,master:0,music:0,ambient:1,effects:.7});
 assert.equal(audioSettings({enabled:'false',master:'1'}).enabled,false);
});
test('fresh events include opponents, but restores and repeated network snapshots stay silent',()=>{
 const observe=createAudioEvents(),old={text:'Борис начинает ход.',sequence:1,actor:1};
 assert.deepEqual(observe({log:[old],winner:null},'room'),[]);
 const curse={text:'Борис: Проклятие! Потеряй уровень.',sequence:2,actor:1,card:{type:'curse'}};
 assert.deepEqual(observe({log:[curse,old],winner:null},'room'),['curse']);
 assert.deepEqual(observe(JSON.parse(JSON.stringify({log:[curse,old],winner:null})),'room'),[]);
 assert.deepEqual(observe({log:[{text:'Новая партия',sequence:1}],winner:null},'room'),[]);
 assert.deepEqual(observe({log:[curse],winner:1},'another-room'),[]);
});
test('short log history and late sequence assignment do not replay old events',()=>{
 const observe=createAudioEvents();const log=[{text:'Старт',kind:'gold'}];
 const g={log,winner:null};observe(g);
 log.unshift({text:'Игрок надевает шлем.',sequence:1});assert.deepEqual(observe(g),['equip']);
 assert.deepEqual(observe(g),[]);
 g.winner=0;assert.deepEqual(observe(g),['win']);assert.deepEqual(observe(g),[]);
});
test('sound semantics distinguish rewards, curses, monsters, rolls and potions',()=>{
 for(const [entry,cue]of [
  [{text:'Борис выбросил 4.'},'dice'],[{text:'Игрок теряет 3 уровня.'},'curse'],
  [{text:'Искатель побеждает! +1 ур.'},'victory'],[{text:'Игрок открывает дверь: Дракон',card:{type:'monster'}},'monster'],
  [{text:'Игрок: Зелье полёта.',card:{type:'potion'}},'magic'],[{text:'Искатель продаёт шмотку за 300 золотых.'},'coins']
 ])assert.equal(eventCue(entry),cue);
});
test('corrupt or unavailable storage and unsupported audio never block gameplay',async()=>{
 const audio=createTavernAudio({storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},contextFactory(){throw Error('unsupported')}});
 assert.equal(audio.settings.enabled,false);
 audio.set({enabled:true});assert.equal(await audio.unlock(),false);assert.equal(audio.status,'unavailable');
 assert.doesNotThrow(()=>audio.observeGame({log:[],winner:null}));await audio.dispose();
});
test('volume settings persist without creating a context before user interaction',async()=>{
 let calls=0,saved;const audio=createTavernAudio({storage:{getItem:()=>'{broken',setItem:(key,value)=>{assert.equal(key,AUDIO_KEY);saved=JSON.parse(value)}},contextFactory:()=>{calls++;throw Error('unused')}});
 audio.set({music:0,ambient:.2,effects:.4});assert.equal(saved.music,0);assert.equal(calls,0);
 assert.equal(await audio.unlock(),false);assert.equal(calls,0);await audio.dispose();
});
