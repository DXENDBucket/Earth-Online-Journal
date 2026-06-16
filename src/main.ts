import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "@/app/App.vue";
import { router } from "@/app/router";
import "@/styles/base.css";

createApp(App).use(createPinia()).use(router).mount("#app");
