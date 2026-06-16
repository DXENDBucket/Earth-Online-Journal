import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from '@/app/App.vue';
import { router } from '@/app/router';
import { registerServiceWorker } from '@/registerServiceWorker';
import { useAuthStore } from '@/stores/authStore';
import { useQuestStore } from '@/stores/questStore';
import '@/styles/base.css';

const pinia = createPinia();
const app = createApp(App).use(pinia).use(router);
app.mount('#app');
const authStore = useAuthStore();
if (authStore.isLoggedIn()) {
  const questStore = useQuestStore();
  questStore.syncFromServer().catch(() => {});
}
registerServiceWorker();