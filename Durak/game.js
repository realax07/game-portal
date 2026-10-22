export const SUITS = ['♠','♥','♣','♦'];
export const RANKS = ['6','7','8','9','10','В','Д','К','Т'];
export const beats = (card, target, trump) => card.suit === target.suit ? card.rank > target.rank : card.suit === trump;
export class Game {
  constructor(random = Math.random) {
    this.deck = SUITS.flatMap(suit => RANKS.map((label,rank)=>({suit,rank,label,id:suit+label})));
    for(let i=this.deck.length-1;i>0;i--) {const j=Math.floor(random()*(i+1)); [this.deck[i],this.deck[j]]=[this.deck[j],this.deck[i]];}
    this.trumpCard = this.deck[0]; this.trump = this.trumpCard.suit;
    this.hands=[[],[]]; this.table=[]; this.discard=[]; this.round=1; this.taking=false; this.result=null;
    this.draw(0);this.draw(1);
    const lows=this.hands.map(hand=>Math.min(...hand.filter(c=>c.suit===this.trump).map(c=>c.rank)));
    this.attacker = lows[0] <= lows[1] ? 0:1;
    this.limit=Math.min(6,this.hands[this.defender].length);
  }
  get defender(){return 1-this.attacker;}
  get covered(){return this.table.length>0 && this.table.every(p=>p.defense);}
  draw(who){while(this.hands[who].length<6 && this.deck.length)this.hands[who].push(this.deck.pop());}
  legal(who,card,index){
    if(this.result || !this.hands[who].includes(card)) return false;
    if(who===this.attacker) return this.table.length<this.limit && (!this.table.length || this.table.some(p=>p.attack.rank===card.rank || p.defense?.rank===card.rank));
    if(this.taking)return false;
    const pair = index === undefined ? this.table.find(p=>!p.defense && beats(card,p.attack,this.trump)) : this.table[index];
    return !!pair && !pair.defense && beats(card,pair.attack,this.trump);
  }
  play(who,id,index){
    const card=this.hands[who].find(c=>c.id===id);
    if(!card || !this.legal(who,card,index))return false;
    this.hands[who].splice(this.hands[who].indexOf(card),1);
    if(who===this.attacker)this.table.push({attack:card});
    else (index===undefined ? this.table.find(p=>!p.defense && beats(card,p.attack,this.trump)) : this.table[index]).defense=card;
    return true;
  }
  take(who){if(this.result || who!==this.defender || !this.table.length || this.taking)return false;this.taking=true;return true;}
  finish(who){
    if(this.result || who!==this.attacker || (!this.covered && !this.taking))return false;
    const oldAttacker=this.attacker, oldDefender=this.defender;
    const cards=this.table.flatMap(p=>p.defense?[p.attack,p.defense]:[p.attack]);
    if(this.taking)this.hands[oldDefender].push(...cards);else this.discard.push(...cards);
    this.draw(oldAttacker);this.draw(oldDefender);
    if(!this.taking)this.attacker=oldDefender;
    this.table=[];this.taking=false;this.round++;
    if(!this.deck.length){
      if(!this.hands[0].length && !this.hands[1].length)this.result='draw';
      else if(!this.hands[0].length)this.result='win';
      else if(!this.hands[1].length)this.result='lose';
    }
    this.limit=Math.min(6,this.hands[this.defender].length);return true;
  }
  aiStep(){
    if(this.result)return false;
    const hand=[...this.hands[1]].sort((a,b)=>(a.suit===this.trump)*20+a.rank-((b.suit===this.trump)*20+b.rank));
    if(this.attacker===1){
      if(this.table.some(p=>!p.defense) && !this.taking)return false;
      const card=hand.find(c=>this.legal(1,c));
      if(card){this.play(1,card.id);return true;}
      return this.finish(1);
    }
    if(this.taking)return false;
    const index=this.table.findIndex(p=>!p.defense);
    if(index<0)return false;
    const card=hand.find(c=>this.legal(1,c,index));
    if(card)this.play(1,card.id,index);else this.take(1);
    return true;
  }
}
