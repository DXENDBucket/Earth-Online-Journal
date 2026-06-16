<template>
  <section class="screen">
    <div class="screen-title">
      <p class="eyebrow">榜单</p>
      <h1>本周进度</h1>
    </div>

    <div class="rank-list">
      <article class="rank-row is-you">
        <div class="rank-number">1</div>
        <div>
          <p class="rank-name">我的本周经验</p>
          <div class="list-meta">
            <span>{{ doneThisWeek }} 个任务完成</span>
            <span>{{ store.userApprovedTasks.length }} 张任务发布</span>
          </div>
        </div>
        <strong class="rank-score">{{ weeklyScore }}</strong>
      </article>

      <article class="rank-row">
        <div class="rank-number">2</div>
        <div>
          <p class="rank-name">进行中的任务</p>
          <div class="list-meta">
            <span>{{ store.todoQuests.length }} 张任务卡正在等待完成</span>
          </div>
        </div>
        <strong class="rank-score">{{ store.todoQuests.length }}</strong>
      </article>
    </div>

    <section class="panel">
      <div class="section-title">
        <h2>公开排行</h2>
      </div>
      <div class="empty-state">
        <strong>多人空间开放后，这里会显示大家的完成排行</strong>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { useQuestStore } from "@/stores/questStore";

const store = useQuestStore();

const doneThisWeek = computed(() => {
  const start = startOfWeek(new Date()).getTime();

  return store.doneQuests.filter((quest) => {
    return Boolean(quest.completedAt && quest.completedAt >= start);
  }).length;
});

const weeklyScore = computed(() => doneThisWeek.value * 10 + store.userApprovedTasks.length * 4);

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}
</script>
