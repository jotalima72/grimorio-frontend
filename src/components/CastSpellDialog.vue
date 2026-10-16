<script setup>
import {computed,ref,onMounted} from 'vue';
import {X,LoaderCircle} from '@lucide/vue';
const props=defineProps({spell:Object,slots:Array,concentration:Object,busy:Boolean,error:String});
const emit=defineEmits(['close','cast']);
const dialog=ref(null),level=ref(props.spell.level),replace=ref(false);
const needsConcentration=computed(()=>/concentra[cç][aã]o/i.test(props.spell.duration||''));
const choices=computed(()=>props.slots.filter(s=>(s.level===props.spell.level||(props.spell.canUpcast&&s.level>props.spell.level))&&s.remaining>0));
if(props.spell.level>0)level.value=choices.value[0]?.level||props.spell.level;
onMounted(()=>dialog.value.showModal());
</script>
<template><dialog ref="dialog" class="cast-dialog" aria-labelledby="cast-title" @cancel="busy&&$event.preventDefault()" @close="emit('close')">
<div class="cast-header"><h2 id="cast-title">Usar {{spell.name}}</h2><button class="icon-button" aria-label="Fechar conjuração" :disabled="busy" @click="dialog.close()"><X :size="20"/></button></div>
<form @submit.prevent="emit('cast',{slotLevel:level,replaceConcentration:replace})">
<label v-if="spell.level>0">Gastar espaço de<select v-model="level" :disabled="busy" required><option v-for="slot in choices" :key="slot.level" :value="slot.level">{{slot.level}}º círculo · {{slot.remaining}} restantes</option></select></label>
<p v-else>Truques não gastam espaços de magia.</p>
<p v-if="level>spell.level" class="hint">Consulte na descrição os efeitos de conjurar com um círculo superior.</p>
<template v-if="needsConcentration"><label v-if="concentration" class="replace-concentration"><input v-model="replace" type="checkbox" :disabled="busy"/>Encerrar {{concentration.name}} e concentrar nesta magia.</label><p v-else class="hint">Esta magia iniciará sua concentração.</p></template>
<p v-if="error" class="alert" role="alert">{{error}}</p>
<div class="cast-actions"><button type="button" class="button" :disabled="busy" @click="dialog.close()">Cancelar</button><button class="button primary" :disabled="busy||(spell.level>0&&!choices.length)||(needsConcentration&&concentration&&!replace)"><LoaderCircle v-if="busy" :size="16" class="cast-spinner"/>{{busy?'Conjurando…':'Conjurar magia'}}</button></div>
</form></dialog></template>
<style scoped>
.cast-dialog{margin:auto;width:min(480px,calc(100vw - 28px));max-height:calc(100dvh - 28px);overflow:auto;border:1px solid var(--line,#cbd5d1);border-radius:12px;padding:24px;background:white;color:var(--ink,#183e32)}
.cast-dialog::backdrop{background:rgb(15 35 29 / .42)}
.cast-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px}.cast-header h2{font-size:1.35rem;line-height:1.35;margin:0;overflow-wrap:anywhere}.cast-dialog form{display:grid;gap:16px}.cast-dialog label{display:grid;gap:8px}.cast-dialog .replace-concentration{display:flex;flex-direction:row;align-items:flex-start;gap:10px;font-size:.94rem;line-height:1.5}.replace-concentration input{width:20px;height:20px;flex-shrink:0;margin-top:2px}.cast-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;margin-top:6px}.cast-spinner{animation:cast-spin .8s linear infinite}@keyframes cast-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.cast-spinner{animation:none}}
</style>
