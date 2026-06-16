import { createRouter, createWebHashHistory } from "vue-router";

import HomePage from "@/pages/HomePage.vue";
import MyPage from "@/pages/MyPage.vue";
import PlaceholderPage from "@/pages/PlaceholderPage.vue";
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
      component: PlaceholderPage,
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
      path: "/me",
      name: "me",
      component: MyPage,
    },
    {
      path: "/account",
      redirect: { name: "me" },
    },
  ],
});
