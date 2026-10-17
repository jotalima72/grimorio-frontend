<script setup>
import { computed } from "vue";
import { castingAbilities, signed } from "../lib/character-magic";
const props = defineProps({ character: Object });
const configured = computed(() => !!props.character?.spellcastingAbility && Number.isInteger(props.character?.spellcastingScore) && props.character.spellcastingScore >= 1 && props.character.spellcastingScore <= 30);
</script>
<template>
  <dl
    v-if="configured"
    class="magic-summary"
    aria-label="Atributos de conjuração"
  >
    <div>
      <dt>
        {{
          castingAbilities.find((a) => a.id === character.spellcastingAbility)
            ?.name
        }}
      </dt>
      <dd>{{ signed(character.spellcastingModifier) }}</dd>
    </div>
    <div>
      <dt>Proficiência</dt>
      <dd>{{ signed(character.proficiencyBonus) }}</dd>
    </div>
    <div>
      <dt>CD das magias</dt>
      <dd>{{ character.spellSaveDc }}</dd>
    </div>
    <div>
      <dt>Ataque mágico</dt>
      <dd>{{ signed(character.spellAttackBonus) }}</dd>
    </div>
  </dl>
  <div v-else-if="character" class="magic-reminder">
    <p>Configure o atributo de conjuração e seu valor para visualizar o modificador, a CD das magias e o bônus de ataque mágico.</p>
    <RouterLink class="text-button" to="/personagens">Configurar em Personagens</RouterLink>
  </div>
</template>
<style scoped>
.magic-reminder { margin: 0 0 24px; padding: 16px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); font-size: .9rem; line-height: 1.6; }
.magic-reminder p { margin: 0 0 8px; max-width: 70ch; }
.magic-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  margin: 0 0 24px;
  padding: 16px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  font-variant-numeric: tabular-nums;
}
.magic-summary > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.magic-summary dt {
  font-size: 0.88rem;
  color: var(--muted);
}
.magic-summary dd {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}
@media (max-width: 600px) {
  .magic-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 18px;
  }
  .magic-summary > div {
    justify-content: space-between;
  }
  .magic-summary dt {
    font-size: 0.84rem;
  }
}
</style>
