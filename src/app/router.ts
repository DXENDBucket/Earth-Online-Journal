import { createRouter, createWebHashHistory } from "vue-router";

import AccountPage from "@/pages/AccountPage.vue";
import HomePage from "@/pages/HomePage.vue";
import JournalPage from "@/pages/JournalPage.vue";
import PoolPage from "@/pages/PoolPage.vue";
import RankPage from "@/pages/RankPage.vue";

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomePage,
    },
    {
      path: "/journal",
      name: "journal",
      component: JournalPage,
    },
    {
      path: "/pool",
      name: "pool",
      component: PoolPage,
    },
    {
      path: "/rank",
      name: "rank",
      component: RankPage,
    },
    {
      path: "/account",
      name: "account",
      component: AccountPage,
    },
  ],
});
