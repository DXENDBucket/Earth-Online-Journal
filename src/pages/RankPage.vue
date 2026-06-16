<template>
  <section class="screen">
    <div class="screen-title">
      <p class="eyebrow">榜单</p>
      <h1>本周回顾</h1>
      <p>当前卡池：{{ store.currentPool.name }}。这里会整理这个卡池里的进度和足迹。</p>
    </div>

    <section class="profile-panel">
      <div class="metric-row">
        <div class="metric">
          <strong>{{ doneThisWeek }}</strong>
          <span>本周完成</span>
        </div>
        <div class="metric">
          <strong>{{ totalDone }}</strong>
          <span>总完成</span>
        </div>
        <div class="metric">
          <strong>{{ store.todoQuests.length }}</strong>
          <span>进行中</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <h2>经验排行</h2>
        <small>{{ weeklyScore }} 分</small>
      </div>
      <div class="rank-list">
        <article
          v-for="row in rankRows"
          :key="row.name"
          class="rank-row"
          :class="{ 'is-you': row.highlight }"
        >
          <div class="rank-number">{{ row.rank }}</div>
          <div>
            <p class="rank-name">{{ row.name }}</p>
            <div class="list-meta">
              <span>{{ row.detail }}</span>
            </div>
          </div>
          <strong class="rank-score">{{ row.score }}</strong>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <h2>类型足迹</h2>
        <small>{{ categoryStats.length }} 类</small>
      </div>
      <div class="task-list">
        <article v-for="item in categoryStats" :key="item.category" class="list-card">
          <div class="tag-row">
            <span class="tag green">{{ item.category }}</span>
            <span class="tag">{{ item.count }} 次</span>
          </div>
          <p>{{ item.summary }}</p>
          <div class="progress-bar" aria-hidden="true">
            <span :style="{ width: `${item.percent}%` }"></span>
          </div>
        </article>
        <div v-if="!categoryStats.length" class="empty-state">
          <strong>完成任务后，这里会出现你最常探索的类型。</strong>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <h2>最近完成</h2>
        <small>{{ recentDone.length }} 条</small>
      </div>
      <div class="task-list">
        <article v-for="quest in recentDone" :key="quest.id" class="list-card">
          <div class="tag-row">
            <span class="tag green">{{ quest.category }}</span>
            <span class="tag">{{ formatDate(quest.completedAt) }}</span>
          </div>
          <p>{{ quest.text }}</p>
          <div v-if="quest.reflection" class="list-meta">
            <span>感悟：{{ quest.reflection }}</span>
          </div>
        </article>
        <div v-if="!recentDone.length" class="empty-state">
          <strong>还没有完成记录。先接取一张任务卡，给今天留一点痕迹。</strong>
        </div>
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
const totalDone = computed(() => store.doneQuests.length);
const publishedCount = computed(() => store.userApprovedTasks.length);
const weeklyScore = computed(() => {
  return doneThisWeek.value * 10 + publishedCount.value * 4 + store.todoQuests.length * 2;
});
const rankRows = computed(() => [
  {
    rank: 1,
    name: "本周经验",
    detail: `${doneThisWeek.value} 个任务完成`,
    score: doneThisWeek.value * 10,
    highlight: true,
  },
  {
    rank: 2,
    name: "发布贡献",
    detail: `${publishedCount.value} 张任务卡进入卡池`,
    score: publishedCount.value * 4,
    highlight: false,
  },
  {
    rank: 3,
    name: "保持探索",
    detail: `${store.todoQuests.length} 张任务正在进行`,
    score: store.todoQuests.length * 2,
    highlight: false,
  },
]);
const categoryStats = computed(() => {
  const counts = store.doneQuests.reduce<Record<string, number>>((result, quest) => {
    result[quest.category] = (result[quest.category] || 0) + 1;
    return result;
  }, {});
  const highestCount = Math.max(1, ...Object.values(counts));

  return Object.entries(counts)
    .map(([category, count]) => ({
      category,
      count,
      percent: Math.round((count / highestCount) * 100),
      summary: count >= 3 ? "这是你最近最常完成的任务类型。" : "这个类型已经留下了完成记录。",
    }))
    .sort((first, second) => second.count - first.count || first.category.localeCompare(second.category));
});
const recentDone = computed(() => {
  return [...store.doneQuests]
    .sort((first, second) => (second.completedAt || 0) - (first.completedAt || 0))
    .slice(0, 3);
});

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}

function formatDate(timestamp: number | null) {
  if (!timestamp) {
    return "刚刚";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
</script>
