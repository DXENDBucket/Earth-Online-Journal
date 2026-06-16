<template>
  <nav class="bottom-nav" aria-label="底部导航">
    <RouterLink
      v-for="item in navItems"
      :key="item.name"
      class="nav-item"
      :class="{ 'is-active': route.name === item.name }"
      :to="{ name: item.name }"
    >
      <component :is="item.icon" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { ListChecks, Sparkles, Trophy, UserRound } from "@lucide/vue";
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();

const navItems = [
  { name: "home", label: "发布/接取", icon: Sparkles },
  { name: "journal", label: "任务册", icon: ListChecks },
  { name: "rank", label: "榜单", icon: Trophy },
  { name: "account", label: "账号", icon: UserRound },
] as const;
</script>
