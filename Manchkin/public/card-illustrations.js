import {CARD_ART} from './card-art-data.js';
import {art} from './art.js';
// Stable palettes and emblems keep the illustration recognizable in every view.
const hash=s=>[...s].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0)|0,0)>>>0;
export function cardArt(c){
 const asset=CARD_ART[c.id];if(!asset)return art(c.icon);
 const seed=hash(c.en),hue=seed%360,tilt=seed%17-8;
 return `<div class="card-illustration" role="img" aria-label="Иллюстрация: ${c.name.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')}" style="--illustration-hue:${hue};--art-tilt:${tilt}deg"><span class="illustration-ring"></span><span class="illustration-symbol" style="--illustration-url:url('${asset.file}')"></span><span class="illustration-spark one">✦</span><span class="illustration-spark two">✧</span></div>`;
}
