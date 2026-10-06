import test from 'node:test';import assert from 'node:assert/strict';import {filterPrepared,groupSpells,normalize,levelLabel} from '../src/lib/spells.js';
const spells=[{id:1,name:'Bênção',level:1,schoolId:1},{id:2,name:'Acudir os Moribundos',level:0,schoolId:2},{id:3,name:'Bola de Fogo',level:3,schoolId:1}];
test('busca ignora acentos sem alterar os textos',()=>{assert.deepEqual(filterPrepared(spells,'bencao','').map(s=>s.id),[1]);assert.equal(spells[0].name,'Bênção');assert.equal(normalize('NÉVOA'),'nevoa');});
test('filtros de escola e nome são combinados',()=>{assert.deepEqual(filterPrepared(spells,'b',1).map(s=>s.id),[1,3]);assert.equal(filterPrepared(spells,'bencao',2).length,0);});
test('agrupamento por círculo ordena sem modificar a lista original',()=>{assert.deepEqual(groupSpells(spells).map(g=>g.level),[0,1,3]);assert.equal(spells[0].id,1);assert.equal(levelLabel(0),'Truque');assert.equal(levelLabel(3),'3º círculo');});

