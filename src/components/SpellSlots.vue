<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { request } from "../lib/api";
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
        <p class="hint">
          Marque os espaços gastos durante a sessão. Truques não gastam espaços.
        </p>
      </div>
      <button
        v-if="configured.length"
        class="button"
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
      <div v-if="configured.length" class="slot-list" :aria-busy="isBusy">
        <div v-for="row in configured" :key="row.level" class="slot-row">
          <strong>{{ row.level }}º círculo</strong>
          <div>
            <span class="slot-count" aria-live="polite"
              >{{ row.remaining }}
              {{ row.remaining === 1 ? "restante" : "restantes" }}</span
            ><span class="hint">
              · {{ row.used }} {{ row.used === 1 ? "gasto" : "gastos" }} de
              {{ row.total }}</span
            >
            <div class="slot-marks" aria-hidden="true">
              <span
                v-for="n in row.total"
                :key="n"
                :class="{ spent: n <= row.used }"
              ></span>
            </div>
          </div>
          <div class="slot-buttons">
            <button
              class="button"
              :disabled="isBusy || row.used === 0"
              :aria-label="`Recuperar um espaço do ${row.level}º círculo`"
              @click="change(row.level, 'recover')"
            >
              Recuperar 1</button
            ><button
              class="button primary"
              :disabled="isBusy || row.remaining === 0"
              :aria-label="`Gastar um espaço do ${row.level}º círculo`"
              @click="change(row.level, 'spend')"
            >
              Gastar 1
            </button>
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
.slot-tracker {
  margin: 24px 0 30px;
  padding: 22px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.slot-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}
.slot-heading h2 {
  margin-bottom: 5px;
}
.slot-list {
  display: flex;
  flex-direction: column;
}
.slot-row {
  display: grid;
  grid-template-columns: 105px minmax(150px, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid var(--border);
}
.slot-row strong {
  font-size: 0.9rem;
}
.slot-count {
  font-weight: 600;
  color: var(--green);
}
.slot-buttons {
  display: flex;
  gap: 8px;
}
.slot-buttons .button {
  font-size: 0.8rem;
  padding: 8px 11px;
}
.slot-marks {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}
.slot-marks span {
  width: 13px;
  height: 13px;
  border: 1px solid var(--green);
  border-radius: 3px;
  background: var(--green);
}
.slot-marks span.spent {
  background: transparent;
  border-color: var(--muted);
}
.slot-settings {
  margin-top: 18px;
}
.slot-settings summary {
  cursor: pointer;
  color: var(--green);
  font-size: 0.9rem;
  font-weight: 600;
}
.slot-settings > p {
  margin: 12px 0;
}
.slot-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 12px;
}
.slot-settings form > .button {
  align-self: flex-start;
}
.slot-tracker > .alert {
  margin: 12px 0;
}
@media (max-width: 760px) {
  .slot-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .slot-row {
    grid-template-columns: 85px minmax(0, 1fr);
    gap: 12px;
  }
  .slot-buttons {
    grid-column: 1/-1;
    justify-content: flex-end;
  }
  .slot-inputs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
