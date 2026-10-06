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
import { state, activeCharacter, chooseCharacter, logout } from "./lib/store";
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
  await logout().catch(() => {});
  router.replace("/entrar");
}
</script>
<template>
  <a class="skip-link" href="#main">Ir ao conteúdo</a>
  <header class="app-header">
    <RouterLink to="/" class="brand"
      ><BookOpen :size="23" /><span>Grimório</span></RouterLink
    ><span class="brand-caption">Seu livro de magias, à mão.</span>
    <div v-if="state.user" class="account">
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
  <template v-if="state.user">
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
