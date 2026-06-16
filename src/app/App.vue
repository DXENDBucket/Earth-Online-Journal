<template>
  <div class="app-shell">
    <main class="app-main" aria-live="polite">
      <RouterView />
    </main>
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";

import BottomNav from "@/components/BottomNav.vue";
</script>
