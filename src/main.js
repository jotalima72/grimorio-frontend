import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { restore } from "./lib/store";
import "./style.css";
await restore();
createApp(App).use(router).mount("#app");
