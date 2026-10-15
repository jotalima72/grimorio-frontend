<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { request } from "../lib/api";
import { Minus, Plus } from "@lucide/vue";
import SlotTotalsFields from "./SlotTotalsFields.vue";
const props = defineProps({
  characterId: { type: Number, required: true },
  externalBusy: Boolean,
});
const rows = ref([]),
  draft = ref(Array(9).fill(0)),
  loading = ref(true),
  busy = ref(false),
  error = ref(""),
  message = ref("");
const emit = defineEmits(["state"]);
const isBusy = computed(() => busy.value || props.externalBusy);
watch(
  [rows, loading, busy],
  () =>
    emit("state", {
      rows: rows.value,
      loading: loading.value,
      busy: busy.value,
    }),
  { deep: true, immediate: true },
);
defineExpose({
  applyUsage(row) {
    if (row)
      rows.value = rows.value.map((current) =>
        current.level === row.level ? row : current,
      );
  },
});
const configured = computed(() => rows.value.filter((row) => row.total > 0));
const hasConfiguration = ref(false);
let epoch = 0,
  controller;
function apply(data) {
  rows.value = data;
  draft.value = data.map((row) => row.total);
}
async function load() {
  controller?.abort();
  controller = new AbortController();
  const current = ++epoch;
  loading.value = true;
  error.value = "";
  try {
    const response = await request(
      `/characters/${props.characterId}/spell-slots`,
      { signal: controller.signal },
    );
    if (current === epoch) {
      apply(response.data);
      hasConfiguration.value =
        response.meta?.configured ?? response.data.some((row) => row.total > 0);
    }
  } catch (e) {
    if (current === epoch && e.name !== "AbortError") error.value = e.message;
  } finally {
    if (current === epoch) loading.value = false;
  }
}
async function change(level, action) {
  if (isBusy.value) return;
  busy.value = true;
  error.value = "";
  message.value = "";
  const current = epoch;
  try {
    const response = await request(
      `/characters/${props.characterId}/spell-slots/${level}`,
      { method: "PATCH", body: { action } },
    );
    if (current === epoch)
      rows.value = rows.value.map((row) =>
        row.level === level ? response.data : row,
      );
  } catch (e) {
    if (current === epoch) error.value = e.message;
  } finally {
    if (current === epoch) busy.value = false;
  }
}
async function save() {
  if (isBusy.value) return;
  busy.value = true;
  error.value = "";
  message.value = "";
  const current = epoch;
  try {
    const response = await request(
      `/characters/${props.characterId}/spell-slots`,
      {
        method: "PUT",
        body: {
          slots: draft.value.map((total, index) => ({
            level: index + 1,
            total: Number(total),
          })),
        },
      },
    );
    if (current === epoch) {
      apply(response.data);
      hasConfiguration.value = true;
      message.value =
        "Totais salvos. Para alterar os espaços, edite o personagem na página Personagens.";
    }
  } catch (e) {
    if (current === epoch) error.value = e.message;
  } finally {
    if (current === epoch) busy.value = false;
  }
}
async function reset() {
  if (isBusy.value) return;
  busy.value = true;
  error.value = "";
  message.value = "";
  const current = epoch;
  try {
    const response = await request(
      `/characters/${props.characterId}/spell-slots/reset`,
      { method: "POST" },
    );
    if (current === epoch) {
      apply(response.data);
      message.value = "Todos os espaços foram recuperados.";
    }
  } catch (e) {
    if (current === epoch) error.value = e.message;
  } finally {
    if (current === epoch) busy.value = false;
  }
}
watch(
  () => props.characterId,
  () => {
    rows.value = [];
    hasConfiguration.value = false;
    busy.value = false;
    message.value = "";
    load();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  epoch++;
  controller?.abort();
});
</script>

<template>
  <section class="slot-tracker" aria-labelledby="slots-title">
    <div class="slot-heading">
      <div>
        <h2 id="slots-title">Espaços de magia</h2>
        <p class="sr-only">O botão menos gasta um espaço e o botão mais recupera um espaço. Truques não gastam espaços.</p>
      </div>
      <button
        v-if="configured.length"
        class="text-button"
        :disabled="isBusy || loading || !rows.some((row) => row.used > 0)"
        @click="reset"
      >
        Recuperar todos
      </button>
    </div>
    <p v-if="loading" class="hint" role="status">
      Carregando espaços do personagem…
    </p>
    <p v-if="error" class="alert" role="alert">
      {{ error }}
      <button v-if="!rows.length" class="text-button" @click="load">
        Tentar novamente
      </button>
    </p>
    <template v-if="!loading">
      <div v-if="configured.length" class="slot-list" :style="{'--slot-columns':configured.length<=5?configured.length:Math.ceil(configured.length/2)}" :aria-busy="isBusy">
        <div v-for="row in configured" :key="row.level" class="slot-row">
          <strong>{{ row.level }}º círculo</strong>
          <span class="slot-count" aria-live="polite">{{ row.remaining }} {{ row.remaining === 1 ? 'restante' : 'restantes' }}</span>
          <div class="slot-controls">
            <button type="button" class="slot-step" :disabled="isBusy || row.remaining === 0"
              :aria-label="`Gastar um espaço do ${row.level}º círculo`" title="Gastar um espaço"
              @click="change(row.level, 'spend')"><Minus :size="16" aria-hidden="true"/></button>
            <div class="slot-marks" :title="`${row.used} gastos de ${row.total} espaços`" aria-hidden="true">
              <span v-for="n in row.total" :key="n" :class="{spent:n>row.remaining}"></span>
            </div>
            <button type="button" class="slot-step" :disabled="isBusy || row.used === 0"
              :aria-label="`Recuperar um espaço do ${row.level}º círculo`" title="Recuperar um espaço"
              @click="change(row.level, 'recover')"><Plus :size="16" aria-hidden="true"/></button>
          </div>
        </div>
      </div>
      <p v-else-if="!error" class="hint">
        {{
          hasConfiguration
            ? "Este personagem foi configurado sem espaços de magia."
            : "Configure os totais por círculo para começar a acompanhar os gastos deste personagem."
        }}
      </p>
      <details v-if="rows.length && !hasConfiguration" class="slot-settings">
        <summary>Configurar espaços por círculo</summary>
        <p class="hint">
          Informe os totais da ficha do personagem, de acordo com sua classe,
          nível e regras da mesa. Não é a quantidade de magias preparadas. Use 0
          nos círculos sem espaços.
        </p>
        <form @submit.prevent="save">
          <SlotTotalsFields v-model="draft" :disabled="isBusy" /><button
            class="button"
            :disabled="isBusy"
          >
            {{ busy ? "Salvando…" : "Salvar totais" }}
          </button>
        </form>
      </details>
    </template>
    <RouterLink
      v-if="hasConfiguration && !loading"
      class="text-button"
      to="/personagens"
      >Editar personagem e espaços</RouterLink
    >
    <p v-if="message" class="hint" role="status">{{ message }}</p>
  </section>
</template>

<style scoped>
.slot-tracker{margin:18px 0 22px;padding:16px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.slot-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.slot-heading h2{font-size:1.05rem}
.slot-heading>.text-button{font-size:.8rem;min-height:32px;flex-shrink:0}
.slot-list{display:grid;grid-template-columns:repeat(var(--slot-columns),minmax(0,1fr));gap:8px}
.slot-row{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;min-width:0;padding:10px 6px;background:var(--white);border:1px solid var(--border);border-radius:6px}
.slot-row strong{font-size:1rem;font-weight:600;white-space:nowrap}
.slot-count{font-size:.9rem;color:var(--green);font-variant-numeric:tabular-nums}
.slot-controls{display:grid;grid-template-columns:28px minmax(0,1fr) 28px;align-items:center;gap:4px;width:100%;max-width:164px;margin-top:3px}
.slot-step{display:flex;align-items:center;justify-content:center;width:28px;min-width:28px;height:32px;padding:0;border:1px solid var(--border);border-radius:5px;background:var(--white);color:var(--green)}
.slot-step:hover:not(:disabled){background:var(--white);border-color:var(--green)}
.slot-step:active:not(:disabled){background:var(--border)}
.slot-marks{display:flex;flex-wrap:wrap;align-content:center;align-items:center;justify-content:center;gap:4px;min-width:0}
.slot-marks span{width:12px;height:12px;flex-shrink:0;border:1px solid var(--green);border-radius:2px;background:var(--green)}
.slot-marks span.spent{background:var(--white);border-color:var(--muted)}
.slot-settings{margin-top:14px}.slot-settings summary{cursor:pointer;color:var(--green);font-size:.9rem;font-weight:600}.slot-settings>p{margin:12px 0}.slot-settings form>.button{align-self:flex-start}
.slot-tracker>.alert{margin:12px 0}.slot-tracker>.text-button{display:inline-block;font-size:.78rem;margin-top:10px}.slot-tracker>p[role=status]{margin-top:8px}
@media(max-width:760px){.slot-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.slot-row{padding:10px 6px}.slot-row strong{font-size:.95rem}.slot-count{font-size:.875rem}.slot-heading h2{font-size:1rem}}
</style>
