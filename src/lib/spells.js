export const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const levelLabel=level=>level===0?'Truque':`${level}º círculo`;
export function filterPrepared(spells,name,schoolId){return spells.filter(s=>(!name||normalize(s.name).includes(normalize(name)))&&(!schoolId||s.schoolId===Number(schoolId)));}
export function groupSpells(spells){const result=[];for(const spell of [...spells].sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name,'pt-BR'))){let group=result.find(g=>g.level===spell.level);if(!group){group={level:spell.level,spells:[]};result.push(group);}group.spells.push(spell);}return result;}
