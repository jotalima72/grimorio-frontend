<script setup>
defineProps({ modelValue: { type: [String, Number], default: '' } });
defineEmits(['update:modelValue']);
</script>

<template>
  <label>
    <span>Círculo</span>
    <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
      <option value="">Todos os círculos</option>
      <option value="0">Truques (nível 0)</option>
      <option v-for="level in 9" :key="level" :value="level">{{ level }}º círculo</option>
    </select>
  </label>
</template>
