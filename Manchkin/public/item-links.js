export const exceptionalItem=(p,c)=>!!c.cheatCard||!!c.hirelingUid&&p.equipment.some(h=>h.uid===c.hirelingUid&&h.slot==='hireling');
export const permanentItem=c=>c.type==='item'&&!!c.slot;
export function ownedItems(p){return[...p.hand,...p.equipment,...(p.carried||[])].filter(c=>c.type==='item'||c.isItem)}
export function detach(p,uid){let found;for(const zone of ['hand','equipment','carried']){found??=p[zone]?.find(c=>c.uid===uid);if(p[zone])p[zone]=p[zone].filter(c=>c.uid!==uid)}return found}
