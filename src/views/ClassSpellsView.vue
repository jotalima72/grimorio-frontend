<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, Search, Plus, ChevronLeft, ChevronRight } from '@lucide/vue';
import { request } from '../lib/api';
import { state, notify, refreshReference } from '../lib/store';
import { levelLabel } from '../lib/spells';
import CircleFilter from '../components/CircleFilter.vue';
import SpellPanel from '../components/SpellPanel.vue';

const route=useRoute(),classId=computed(()=>Number(route.params.id));
const currentClass=computed(()=>state.classes.find(c=>c.id===classId.value));
const name=ref(''),school=ref(''),level=ref(''),offset=ref(0),spells=ref([]),total=ref(0);
const selected=ref([]),detailId=ref(null),loading=ref(false),busy=ref(false),error=ref('');
const limit=40,max=500;let controller,timer,sequence=0;
const pageSelected=computed(()=>spells.value.length>0&&spells.value.every(s=>selected.value.includes(s.id)));
async function load(){
  controller?.abort();controller=new AbortController();const seq=++sequence;
  loading.value=true;error.value='';
  const query=new URLSearchParams({excludeClassId:String(classId.value),limit:String(limit),offset:String(offset.value)});
  if(name.value)query.set('name',name.value);if(school.value)query.set('schoolId',school.value);if(level.value!=='')query.set('level',level.value);
  try{const response=await request(`/spells?${query}`,{signal:controller.signal});if(seq===sequence){spells.value=response.data;total.value=response.meta.total;}}
  catch(e){if(seq===sequence&&e.name!=='AbortError')error.value=e.message;}
  finally{if(seq===sequence)loading.value=false;}
}
function toggle(id){if(selected.value.includes(id))selected.value=selected.value.filter(value=>value!==id);else if(selected.value.length<max)selected.value=[...selected.value,id];}
function togglePage(){if(pageSelected.value){const ids=new Set(spells.value.map(s=>s.id));selected.value=selected.value.filter(id=>!ids.has(id));}else selected.value=[...new Set([...selected.value,...spells.value.map(s=>s.id)])].slice(0,max);}
function page(next){offset.value=next;clearTimeout(timer);load();}
function clearFilters(){name.value='';school.value='';level.value='';}
async function add(){
  if(!selected.value.length||busy.value)return;busy.value=true;error.value='';const id=classId.value;
  try{const response=await request(`/classes/${id}/spells/batch`,{method:'POST',body:{spellIds:[...selected.value]}});
    if(id===classId.value){selected.value=[];offset.value=0;clearTimeout(timer);await load();}
    await refreshReference();notify(`${response.data.added} ${response.data.added===1?'magia adicionada':'magias adicionadas'} à lista da classe como homebrew.${response.data.skipped?' Vínculos já existentes foram mantidos.':''}`);
  }catch(e){error.value=e.message;}finally{busy.value=false;}
}
watch([name,school,level],()=>{offset.value=0;clearTimeout(timer);controller?.abort();sequence++;timer=setTimeout(load,250);});
watch(classId,()=>{clearTimeout(timer);selected.value=[];detailId.value=null;offset.value=0;load();},{immediate:true});
onBeforeUnmount(()=>{clearTimeout(timer);sequence++;controller?.abort();});
</script>

<template>
  <RouterLink to="/compendios" class="back-link"><ArrowLeft :size="15"/>Voltar às classes e compêndios</RouterLink>
  <div class="page-heading"><div><p class="breadcrumb">Lista de magias da classe</p><h1>{{currentClass?.name||'Adicionar magias à classe'}}</h1><p class="page-description">Selecione magias que esta classe ainda não possui. Os novos vínculos serão homebrews da sua conta, preservando o texto e a origem de cada magia.</p></div></div>
  <div class="filters compact">
    <label class="search-field"><span class="sr-only">Nome da magia</span><Search :size="18"/><input v-model="name" type="search" placeholder="Buscar pelo nome da magia…" :disabled="busy"/></label>
    <label><span>Escola</span><select v-model="school" :disabled="busy"><option value="">Todas as escolas</option><option v-for="s in state.schools" :key="s.id" :value="s.id">{{s.name}}</option></select></label>
    <CircleFilter v-model="level" :disabled="busy"/>
  </div>
  <div class="results-caption"><span>{{total}} {{total===1?'magia sem vínculo':'magias sem vínculo'}} com a classe</span><button v-if="name||school||level!==''" type="button" class="text-button" :disabled="busy" @click="clearFilters">Limpar filtros</button></div>
  <p v-if="error" class="alert" role="alert">{{error}} <button class="text-button" :disabled="busy" @click="load">Tentar novamente</button></p>
  <div v-if="loading" class="skeleton-stack" aria-label="Carregando magias disponíveis"><div v-for="n in 5" :key="n" class="skeleton row"></div></div>
  <template v-else-if="!error&&spells.length">
    <label class="page-selection"><input type="checkbox" :checked="pageSelected" :disabled="busy" @change="togglePage"/>Selecionar esta página</label>
    <div class="spell-table">
      <div v-for="spell in spells" :key="spell.id" class="selectable-spell" :class="{checked:selected.includes(spell.id)}">
        <input type="checkbox" :aria-label="`Selecionar ${spell.name}`" :checked="selected.includes(spell.id)" :disabled="busy||(!selected.includes(spell.id)&&selected.length>=max)" @change="toggle(spell.id)"/>
        <button type="button" class="spell-name-button" @click="detailId=spell.id"><span class="circle-number">{{spell.level}}</span><span><strong>{{spell.name}}</strong><small>{{levelLabel(spell.level)}} · {{spell.school}}</small></span></button>
        <span class="tag">{{spell.sourceKind==='homebrew'?'Homebrew':spell.sourceKind==='book'?'Livro':'Compêndio'}}</span>
      </div>
    </div>
  </template>
  <div v-else-if="!error" class="empty-state"><Search :size="35"/><h2>Nenhuma magia disponível.</h2><p>{{name||school||level!==''?'Amplie os filtros para encontrar outras magias.':'Esta classe já possui vínculo com todas as magias disponíveis na sua conta.'}}</p><button v-if="name||school||level!==''" class="button" @click="clearFilters">Limpar filtros</button></div>
  <div v-if="total>limit&&!error" class="pagination"><span>{{offset+1}}–{{Math.min(offset+limit,total)}} de {{total}}</span><div><button class="button" :disabled="offset===0||loading||busy" @click="page(Math.max(0,offset-limit))"><ChevronLeft :size="17"/>Anterior</button><button class="button" :disabled="offset+limit>=total||loading||busy" @click="page(offset+limit)">Próxima<ChevronRight :size="17"/></button></div></div>
  <div class="selection-actions"><div><strong aria-live="polite">{{selected.length}} {{selected.length===1?'magia selecionada':'magias selecionadas'}}</strong><p class="hint">A seleção é mantida entre páginas e filtros. Até 500 por vez.</p></div><button v-if="selected.length" class="text-button" :disabled="busy" @click="selected=[]">Limpar seleção</button><button class="button primary" :disabled="!selected.length||busy" @click="add"><Plus :size="17"/>{{busy?'Adicionando…':'Adicionar como homebrew'}}</button></div>
  <SpellPanel v-if="detailId" :id="detailId" @close="detailId=null"/>
</template>

<style scoped>
.page-selection{flex-direction:row;align-items:center;margin:0 0 14px;gap:10px}
.selectable-spell{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:12px;padding:0 16px;border-top:1px solid var(--border)}
.selectable-spell:first-child{border-top:0}
.selectable-spell.checked{background:var(--subtle)}
.selection-actions{position:sticky;bottom:0;display:flex;align-items:center;flex-wrap:wrap;gap:18px;margin-top:24px;padding:18px 0;background:var(--white);border-top:1px solid var(--border)}
.selection-actions>div{flex:1;min-width:200px}
.selection-actions strong{font-size:.9rem}
@media(max-width:760px){.selectable-spell{padding:0 12px;gap:9px}.selectable-spell .tag{font-size:.65rem}.selection-actions{padding:14px 0}.selection-actions>.button{width:100%}}
</style>
