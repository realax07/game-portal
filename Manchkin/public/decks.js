export const deckOf=c=>c.deck||(['monster','curse','race','class','multiclass','multirace','enhancer','dungeon','wandering'].includes(c.type)||['steed','hireling'].includes(c.slot)?'doors':'treasures');
export const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
export function discard(g,...cards){g.discards??={doors:[],treasures:[]};for(const c of cards.flat().filter(Boolean)){g.discards[deckOf(c)].push({...c,power:c.printedPower??c.power});g.lastDiscard=c.uid}}
export function draw(g,kind){g.discards??={doors:[],treasures:[]};if(!g[kind].length){g[kind]=shuffle(g.discards[kind]);g.discards[kind]=[]}return g[kind].pop()||null}
export function deal(g,p,n=4){for(let i=0;i<n;i++)for(const kind of ['doors','treasures']){const c=draw(g,kind);if(c)p.hand.push(c)}}
export function takeTreasure(g,p,n){for(let i=0;i<n;i++){const c=draw(g,'treasures');if(c)p.hand.push(c)}}
