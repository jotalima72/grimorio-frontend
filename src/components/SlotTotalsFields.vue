<script setup>
defineProps({ modelValue: { type: Array, required: true }, disabled: Boolean });
const emit = defineEmits(["update:modelValue"]);
function update(index, value, totals) {
  const next = [...totals];
  next[index] = value === "" ? "" : Number(value);
  emit("update:modelValue", next);
}
</script>
<template>
  <div class="slot-inputs">
    <label v-for="(total, index) in modelValue" :key="index"
      >{{ index + 1 }}º círculo<input
        :value="total"
        type="number"
        min="0"
        max="20"
        step="1"
        required
        :disabled="disabled"
        @input="update(index, $event.target.value, modelValue)"
    /></label>
  </div>
</template>
<style scoped>
.slot-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 12px;
}
@media (max-width: 760px) {
  .slot-inputs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
