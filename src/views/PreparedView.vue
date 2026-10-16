<script setup>
import CastSpellDialog from '../components/CastSpellDialog.vue';
import CircleFilter from "../components/CircleFilter.vue";
import SpellSlots from "../components/SpellSlots.vue";
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { Search, Plus, ArrowRight, ScrollText } from "@lucide/vue";
import { request } from "../lib/api";
import {
  state,
  activeCharacter,
  notify,
  refreshCharacters,
} from "../lib/store";
import { filterPrepared, groupSpells, levelLabel } from "../lib/spells";
import SpellList from "../components/SpellList.vue";
import SpellPanel from "../components/SpellPanel.vue";
const spells = ref([]),
  loading = ref(false),
  error = ref(""),
  name = ref(""),
  school = ref(""),
  level = ref(""),
  selectedId = ref(null),
  pendingIds = ref([]);
let epoch = 0;
const tracker = ref(null),
  slotState = ref({ rows: [], loading: true, busy: false }),
  castingId = ref(null),
  castError = ref("");
const castChoice=ref(null),castingState=ref({concentration:null,lastUse:null}),castingLoading=ref(true),undoBusy=ref(false);
const actionBusy=computed(()=>castingId.value!==null||undoBusy.value);
function canUse(spell) {
 return !actionBusy.value&&!castingLoading.value&&!slotState.value.busy&&!pendingIds.value.includes(spell.id)&&
  (spell.level===0||(!slotState.value.loading&&slotState.value.rows.some(row=>(row.level===spell.level||(spell.canUpcast&&row.level>spell.level))&&row.remaining>0)));
}
function useSpell(spell){if(canUse(spell)){castError.value='';castChoice.value=spell;}}
async function refreshCasting(id=state.activeId){
 const response=await request(`/characters/${id}/casting`);
 if(state.activeId===id)castingState.value=response.data;
}
async function castSpell(body){
 const spell=castChoice.value;if(!spell||!canUse(spell))return;
 const id=state.activeId;castingId.value=spell.id;castError.value='';
 try{
  const response=await request(`/characters/${id}/prepared-spells/${spell.id}/use`,{method:'POST',body});
  if(state.activeId===id){tracker.value?.applyUsage(response.data.slot);castingState.value=response.data;castChoice.value=null;
   notify(response.data.level===0?`${spell.name} usada. Truques não gastam espaços.`:`${spell.name} usada com espaço do ${response.data.level}º círculo.`);}
 }catch(e){if(state.activeId===id){castError.value=e.message;try{await refreshCasting(id);}catch{} }}
 finally{castingId.value=null;}
}
async function undoUse(){
 if(actionBusy.value||slotState.value.busy||!castingState.value.lastUse)return;
 const id=state.activeId,useId=castingState.value.lastUse.id;undoBusy.value=true;castError.value='';
 try{const response=await request(`/characters/${id}/casting/undo`,{method:'POST',body:{useId}});
  if(state.activeId===id){tracker.value?.applyUsage(response.data.slot);castingState.value=response.data;notify('Uso desfeito. Espaço e concentração restaurados.');}
 }catch(e){if(state.activeId===id){castError.value=e.message;try{await refreshCasting(id);}catch{}}}finally{undoBusy.value=false;}
}
async function endConcentration(){
 if(actionBusy.value||slotState.value.busy)return;
 const id=state.activeId;undoBusy.value=true;castError.value='';
 try{const response=await request(`/characters/${id}/concentration`,{method:'DELETE'});if(state.activeId===id)castingState.value=response.data;}
 catch(e){if(state.activeId===id)castError.value=e.message;}finally{undoBusy.value=false;}
}
const groups = computed(() =>
  groupSpells(
    filterPrepared(spells.value, name.value, school.value, level.value),
  ),
);
async function load() {
  const current = ++epoch;
  selectedId.value = null;
  castChoice.value=null;castingState.value={concentration:null,lastUse:null};castingLoading.value=true;
  castError.value = "";
  error.value = "";
  spells.value = [];
  if (!activeCharacter.value) return;
  loading.value = true;
  const characterId=activeCharacter.value.id;
  try {
    const result = await request(
      `/characters/${characterId}/prepared-spells`,
    );
    if (current === epoch) spells.value = result.data;
    await refreshCasting(characterId);
    if(current===epoch)castingLoading.value=false;
  } catch (e) {
    if (current === epoch) error.value = e.message;
  } finally {
    if (current === epoch) loading.value = false;
  }
}
async function remove(spell) {
  if (actionBusy.value || pendingIds.value.includes(spell.id)) return;
  const c = activeCharacter.value;
  if (!c) return;
  pendingIds.value.push(spell.id);
  try {
    await request(`/characters/${c.id}/prepared-spells/${spell.id}`, {
      method: "DELETE",
    });
    if (activeCharacter.value?.id === c.id) {
      spells.value = spells.value.filter((s) => s.id !== spell.id);
      selectedId.value = null;
    }
    await refreshCharacters();
    notify(`${spell.name} removida das preparadas.`);
  } catch (e) {
    error.value = e.message;
  } finally {
    pendingIds.value = pendingIds.value.filter((id) => id !== spell.id);
  }
}
watch(
  () => state.activeId,
  () => {
    slotState.value = { rows: [], loading: true, busy: false };
    load();
  },
  { immediate: true },
);
watch(()=>slotState.value.busy,async(busy,previous)=>{
 if(previous&&!busy&&state.activeId){try{await refreshCasting();}catch(e){castError.value=e.message;}}
});
onBeforeUnmount(() => epoch++);
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="breadcrumb">Seu repertório</p>
      <h1>Magias preparadas</h1>
      <p class="page-description">
        {{
          activeCharacter
            ? `As magias de ${activeCharacter.name}, prontas para a próxima aventura.`
            : "Crie seu primeiro personagem para começar a preparar magias."
        }}
      </p>
    </div>
    <RouterLink v-if="activeCharacter" class="button primary" to="/preparar"
      ><Plus :size="18" />Preparar magias</RouterLink
    >
  </div>
  <div v-if="!activeCharacter" class="empty-state">
    <ScrollText :size="42" :stroke-width="1.3" />
    <h2>Um novo grimório começa aqui.</h2>
    <p>
      Dê um nome ao seu personagem, escolha sua classe e monte sua lista de
      magias.
    </p>
    <RouterLink to="/personagens" class="button primary"
      >Criar personagem<ArrowRight :size="17"
    /></RouterLink>
  </div>
  <template v-else
    ><div class="repertoire-summary">
      <div>
        <span class="summary-count">{{ spells.length }}</span
        ><span>magias preparadas</span>
      </div>
      <span
        >{{ activeCharacter.class }} <span class="dot">·</span> Nível
        {{ activeCharacter.level }}</span
      >
    </div>
    <SpellSlots
      ref="tracker"
      :key="activeCharacter.id"
      :character-id="activeCharacter.id"
      :external-busy="actionBusy"
      @state="slotState = $event"
    />
    <section v-if="castingState.concentration||castingState.lastUse" class="casting-status" aria-label="Conjuração atual" aria-live="polite">
      <div v-if="castingState.concentration" class="casting-status-row"><div><strong>Concentração: {{castingState.concentration.name}}</strong><p>{{castingState.concentration.duration}}</p></div><button class="button" :disabled="actionBusy||slotState.busy" @click="endConcentration">{{undoBusy?'Salvando…':'Encerrar concentração'}}</button></div>
      <div v-if="castingState.lastUse" class="casting-status-row"><span>Último uso: <strong>{{castingState.lastUse.name}}</strong> · {{castingState.lastUse.level?`${castingState.lastUse.level}º círculo`:'Truque'}}</span><button class="button" :disabled="actionBusy||slotState.busy" @click="undoUse">{{undoBusy?'Salvando…':'Desfazer uso'}}</button></div>
    </section>
    <div class="filters compact">
      <label class="search-field"
        ><span class="sr-only">Buscar nas preparadas</span
        ><Search :size="18" /><input
          v-model="name"
          placeholder="Buscar nas suas magias…"
          type="search" /></label
      ><label
        ><span class="sr-only">Escola</span
        ><select v-model="school">
          <option value="">Todas as escolas</option>
          <option v-for="s in state.schools" :key="s.id" :value="s.id">
            {{ s.name }}
          </option>
        </select></label
      ><CircleFilter v-model="level" />
    </div>
    <p v-if="castError" class="alert" role="alert">{{ castError }}</p>
    <p v-if="error" class="alert" role="alert">
      {{ error }}
      <button class="text-button" @click="load">Tentar novamente</button>
    </p>
    <div
      v-if="loading"
      class="skeleton-stack"
      aria-label="Carregando preparadas"
    >
      <div v-for="n in 5" :key="n" class="skeleton row"></div>
    </div>
    <div v-else-if="!spells.length && !error" class="empty-state">
      <ScrollText :size="38" :stroke-width="1.3" />
      <h2>Qual será sua primeira magia?</h2>
      <p>
        Explore a lista de {{ activeCharacter.class }} e escolha as magias que
        quer ter à mão.
      </p>
      <RouterLink class="button primary" to="/preparar"
        >Escolher magias<ArrowRight :size="17"
      /></RouterLink>
    </div>
    <p v-else-if="!groups.length && !error" class="empty-search">
      Nenhuma magia corresponde aos filtros.
      <button
        class="text-button"
        @click="
          name = '';
          school = '';
          level = '';
        "
      >
        Limpar filtros
      </button>
    </p>
    <section v-for="g in groups" :key="g.level" class="spell-group">
      <div class="group-heading">
        <h2>{{ g.level === 0 ? "Truques" : levelLabel(g.level) }}</h2>
        <span
          >{{ g.spells.length }}
          {{ g.spells.length === 1 ? "magia" : "magias" }}</span
        >
      </div>
      <SpellList
        :spells="g.spells"
        :selected-id="selectedId"
        :pending-ids="castingId ? [...pendingIds, castingId] : pendingIds"
        show-use
        :can-use="canUse"
        :using-id="castingId"
        @use="useSpell"
        @select="selectedId = $event"
        @toggle="remove"
      />
    </section>
    <p v-if="spells.length" class="list-footnote">
      Selecione o nome de uma magia para consultar a descrição completa.
    </p></template
  >
  <SpellPanel
    v-if="selectedId"
    :id="selectedId"
    :prepared="true"
    :eligible="true"
    :pending="pendingIds.includes(selectedId) || actionBusy"
    show-use
    :use-disabled="
      !canUse(spells.find((s) => s.id === selectedId) || { level: 1 })
    "
    :using="castingId === selectedId"
    :use-error="castError"
    @use="useSpell"
    @close="selectedId = null"
    @toggle="remove"
  />
  <CastSpellDialog v-if="castChoice" :spell="castChoice" :slots="slotState.rows" :concentration="castingState.concentration" :busy="actionBusy" :error="castError" @close="castChoice=null" @cast="castSpell"/>
</template>
<style scoped>
.casting-status{border:1px solid var(--line,#cbd5d1);border-radius:12px;background:white;padding:4px 18px;margin:0 0 24px}.casting-status-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;line-height:1.5}.casting-status-row+.casting-status-row{border-top:1px solid var(--line,#cbd5d1)}.casting-status-row p{font-size:.9rem;margin:4px 0 0}.casting-status-row .button{flex-shrink:0}@media(max-width:600px){.casting-status-row{align-items:flex-start;flex-direction:column;gap:10px}.casting-status-row .button{align-self:flex-end}}
</style>
