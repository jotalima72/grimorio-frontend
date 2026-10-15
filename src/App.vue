<script setup>
import { watch, onBeforeUnmount } from "vue";
import {
  BookOpen,
  LogOut,
  Users,
  Library,
  ScrollText,
  Plus,
} from "@lucide/vue";
import { useRouter } from "vue-router";
import { state, activeCharacter, chooseCharacter, logout, restore, useAnotherAccount } from "./lib/store";
let noticeTimer;
watch(
  () => state.notice,
  () => {
    clearTimeout(noticeTimer);
    if (state.notice) noticeTimer = setTimeout(() => (state.notice = ""), 7000);
  },
);
onBeforeUnmount(() => clearTimeout(noticeTimer));
const router = useRouter();
async function leave() {
  try{await logout();router.replace("/entrar");}catch(e){state.error="Não foi possível encerrar a sessão no servidor. Tente sair novamente. "+e.message;}
}
</script>
<template>
  <a class="skip-link" href="#main">Ir ao conteúdo</a>
  <header class="app-header">
    <RouterLink to="/" class="brand"
      ><BookOpen :size="23" /><span>Grimório</span></RouterLink
    ><span class="brand-caption">Seu livro de magias, à mão.</span>
    <div v-if="state.ready&&state.user" class="account">
      <span>{{ state.user.name }}</span
      ><button
        class="icon-button"
        aria-label="Sair da conta"
        title="Sair"
        @click="leave"
      >
        <LogOut :size="18" />
      </button>
    </div>
  </header>
  <main v-if="!state.ready" id="main" class="empty-state" tabindex="-1" aria-busy="true">
    <BookOpen :size="38" :stroke-width="1.3"/>
    <h1>Reconectando ao seu grimório</h1>
    <p role="status">{{state.restoreAttempt>1?'O servidor ainda está iniciando ou sem conexão. Tentaremos novamente automaticamente.':'Estamos conectando ao servidor para verificar sua sessão. Isso pode levar alguns instantes.'}}</p>
    <p>Sua sessão será mantida enquanto aguardamos.</p>
    <p v-if="state.restoreError" class="alert" role="alert">{{state.restoreError}}</p>
    <button v-if="!state.restoring" class="button primary" @click="restore()">Tentar novamente</button>
    <button class="text-button" @click="useAnotherAccount">Entrar com outra conta</button>
  </main>
  <template v-else-if="state.user">
    <div class="app-layout">
      <aside class="navigation">
        <label class="select-label" for="active-character"
          >Personagem em jogo</label
        ><select
          id="active-character"
          :value="state.activeId || ''"
          @change="chooseCharacter($event.target.value)"
        >
          <option value="" disabled>Escolha um personagem</option>
          <option v-for="c in state.characters" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
        <div v-if="activeCharacter" class="character-meta">
          {{ activeCharacter.class }} · Nível {{ activeCharacter.level }}
        </div>
        <nav aria-label="Navegação principal">
          <RouterLink to="/" exact-active-class="current"
            ><ScrollText :size="18" />Magias preparadas</RouterLink
          ><RouterLink to="/preparar" active-class="current"
            ><Library :size="18" />Preparar magias</RouterLink
          ><RouterLink to="/personagens" active-class="current"
            ><Users :size="18" />Personagens</RouterLink
          ><RouterLink to="/compendios" active-class="current"
            ><BookOpen :size="18" />Classes e compêndios</RouterLink
          >
        </nav>
        <RouterLink class="sidebar-new" to="/magias/nova"
          ><Plus :size="18" />Nova magia homebrew</RouterLink
        >
        <p class="sidebar-note">
          Cada personagem tem seu próprio repertório. A seleção fica salva na
          sua conta.
        </p>
      </aside>
      <main id="main" class="main-content" tabindex="-1">
        <p v-if="state.reconnecting" class="info-banner" role="status">Reconectando ao servidor… Sua sessão continua ativa. Aguarde enquanto tentamos novamente.</p>
        <div v-if="state.error" class="alert" role="alert">
          {{ state.error }}
          <button class="text-button" @click="state.error = ''">Fechar</button>
        </div>
        <RouterView :key="$route.path" />
      </main>
    </div>
  </template>
  <main v-else id="main" tabindex="-1"><RouterView /></main>
  <div v-if="state.notice" class="toast" role="status">
    <span>{{ state.notice }}</span
    ><button
      class="text-button"
      aria-label="Fechar notificação"
      @click="state.notice = ''"
    >
      Fechar
    </button>
  </div>
</template>
