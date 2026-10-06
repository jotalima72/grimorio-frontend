import { createRouter, createWebHistory } from "vue-router";
import { state } from "./lib/store";
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (_to, _from, saved) => saved || { top: 0 },
  routes: [
    {
      path: "/entrar",
      component: () => import("./views/AuthView.vue"),
      meta: { public: true },
    },
    { path: "/", component: () => import("./views/PreparedView.vue") },
    { path: "/preparar", component: () => import("./views/CatalogView.vue") },
    {
      path: "/personagens",
      component: () => import("./views/CharactersView.vue"),
    },
    {
      path: "/magias/nova",
      component: () => import("./views/SpellFormView.vue"),
    },
    {
      path: "/magias/:id/editar",
      component: () => import("./views/SpellFormView.vue"),
    },
    {
      path: "/compendios",
      component: () => import("./views/CompendiumsView.vue"),
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
router.beforeEach((to) => {
  if (!to.meta.public && !state.user) return "/entrar";
  if (to.path === "/entrar" && state.user) return "/";
});
window.addEventListener("grimorio:unauthorized", () =>
  router.replace("/entrar"),
);
export default router;
