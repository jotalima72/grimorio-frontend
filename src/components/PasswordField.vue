<script setup>
import { ref } from 'vue';
import { Eye, EyeOff } from '@lucide/vue';

defineProps({
  id: { type: String, required: true },
  label: { type: String, default: 'Senha' },
  toggleLabel: { type: String, default: 'senha' },
  modelValue: { type: String, default: '' },
  autocomplete: { type: String, default: 'new-password' },
  minlength: Number,
  pattern: String,
  hint: String,
  error: String,
});
defineEmits(['update:modelValue', 'blur']);
const visible = ref(false);
</script>

<template>
  <div class="password-field">
    <label :for="id">{{ label }}</label>
    <div class="password-control">
      <input :id="id" :value="modelValue" :type="visible ? 'text' : 'password'"
        :autocomplete="autocomplete" required :minlength="minlength" :pattern="pattern"
        maxlength="256" :title="hint" :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
        @input="$emit('update:modelValue', $event.target.value)" @blur="$emit('blur')" />
      <button type="button" class="password-toggle" :aria-controls="id"
        :aria-label="`${visible ? 'Ocultar' : 'Mostrar'} ${toggleLabel}`"
        :title="`${visible ? 'Ocultar' : 'Mostrar'} ${toggleLabel}`"
        :aria-pressed="visible" @click="visible = !visible">
        <EyeOff v-if="visible" :size="20" aria-hidden="true" />
        <Eye v-else :size="20" aria-hidden="true" />
      </button>
    </div>
    <small v-if="hint" :id="`${id}-hint`" class="muted">{{ hint }}</small>
    <small v-if="error" :id="`${id}-error`" class="password-error" aria-live="polite">{{ error }}</small>
  </div>
</template>

<style scoped>
.password-field{display:flex;flex-direction:column;gap:7px}
.password-control{position:relative}
.password-control input{padding-right:52px}
.password-toggle{position:absolute;right:2px;top:2px;bottom:2px;width:44px;display:flex;align-items:center;justify-content:center;border:0;border-radius:5px;background:transparent;color:var(--muted)}
.password-toggle:hover{background:var(--subtle);color:var(--green)}
.password-field small{font-size:.8rem;line-height:1.5}
.password-error{color:var(--danger)}
.password-control input[aria-invalid=true]{border-color:var(--danger)}
</style>
