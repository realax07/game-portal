export const hasEscapeGuarantee=(g,actor,monster)=>!monster.noEscape&&!!g.escapeGuarantees?.[actor]?.includes(monster.uid);
export function guaranteeEscape(g,actor,monsters){g.escapeGuarantees??={};g.escapeGuarantees[actor]=[...new Set([...(g.escapeGuarantees[actor]||[]),...monsters.filter(m=>!m.noEscape).map(m=>m.uid)])];g.mustRunAway=true;g.fleeingDeclared=true}
