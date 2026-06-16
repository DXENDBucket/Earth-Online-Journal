<template>
  <section class="screen">
    <div class="screen-title">
      <p class="eyebrow">榜单</p>
      <h1>本周地球经验</h1>
    </div>

    <div class="rank-list">
      <article
        v-for="(item, index) in ranks"
        :key="item.name"
        class="rank-row"
        :class="{ 'is-you': item.you }"
      >
        <div class="rank-number">{{ index + 1 }}</div>
        <div>
          <p class="rank-name">{{ item.name }}</p>
          <div class="list-meta">
            <span>{{ item.completed }} 完成</span>
            <span>{{ item.published }} 入池</span>
          </div>
        </div>
        <strong class="rank-score">{{ item.score }}</strong>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { demoRanks } from "@/data/demoRanks";
import { useQuestStore } from "@/stores/questStore";

const store = useQuestStore();

const ranks = computed(() => {
  const userRank = {
    name: `${store.user.name}（你）`,
    completed: store.doneQuests.length,
    published: store.userApprovedTasks.length,
    you: true,
  };

  return [...demoRanks, userRank]
    .map((item) => ({
      ...item,
      score: item.completed * 10 + item.published * 4,
    }))
    .sort((a, b) => b.score - a.score);
});
</script>
