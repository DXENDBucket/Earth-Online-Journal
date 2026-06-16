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
import { Boxes, CircleEllipsis, Sparkles, Trophy, UserRound } from "@lucide/vue";
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();

const navItems = [
  { name: "home", label: "发布/接取", icon: Sparkles },
  { name: "pool", label: "卡池", icon: Boxes },
  { name: "journal", label: "占位", icon: CircleEllipsis },
  { name: "rank", label: "榜单", icon: Trophy },
  { name: "me", label: "我的", icon: UserRound },
] as const;
</script>
