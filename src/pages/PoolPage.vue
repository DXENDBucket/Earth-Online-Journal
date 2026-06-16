<template>
  <section class="screen">
    <div class="screen-title">
      <p class="eyebrow">卡池</p>
      <h1>任务卡池</h1>
      <p>浏览已经加入卡池的现实任务。抽卡时，会自动避开你正在进行的任务。</p>
    </div>

    <section class="profile-panel">
      <div class="metric-row">
        <div class="metric">
          <strong>{{ approvedTasks.length }}</strong>
          <span>全部任务</span>
        </div>
        <div class="metric">
          <strong>{{ drawPool.length }}</strong>
          <span>可抽任务</span>
        </div>
        <div class="metric">
          <strong>{{ categoryOptions.length }}</strong>
          <span>任务类型</span>
        </div>
      </div>
    </section>

    <section class="journal-tools" aria-label="筛选任务卡池">
      <label class="search-field">
        <Search />
        <input v-model="searchText" type="search" placeholder="搜索任务卡" />
      </label>
      <label class="field compact-field">
        <span>类型</span>
        <select v-model="categoryFilter">
          <option value="">全部类型</option>
          <option v-for="item in categoryOptions" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </label>
    </section>

    <div class="section-title">
      <p class="section-note">{{ poolSummary }}</p>
      <button v-if="hasFilters" class="ghost-button small-button" type="button" @click="clearFilters">
        <X />
        <span>清除筛选</span>
      </button>
    </div>

    <section class="task-list">
      <article v-for="task in visiblePoolTasks" :key="task.id" class="list-card">
        <div class="tag-row">
          <span class="tag green">{{ task.category }}</span>
          <span class="tag">{{ task.source }}</span>
          <span class="tag" :class="isTaskActive(task.id) ? 'coral' : 'yellow'">
            {{ isTaskActive(task.id) ? "进行中" : "可抽" }}
          </span>
          <span class="tag">{{ task.intensity === "light" ? "轻量" : "普通" }}</span>
        </div>
        <p>{{ task.text }}</p>
      </article>

      <div v-if="!visiblePoolTasks.length" class="empty-state">
        <strong>{{ emptyText }}</strong>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { Search, X } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

import { useQuestStore } from "@/stores/questStore";

const store = useQuestStore();
const { approvedTasks, drawPool, todoQuests } = storeToRefs(store);
const searchText = ref("");
const categoryFilter = ref("");

const activeTaskIds = computed(() => new Set(todoQuests.value.map((quest) => quest.taskId)));
const categoryOptions = computed(() => [...new Set(approvedTasks.value.map((task) => task.category))]);
const hasFilters = computed(() => Boolean(searchText.value.trim() || categoryFilter.value));
const visiblePoolTasks = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();

  return approvedTasks.value.filter((task) => {
    const matchesCategory = !categoryFilter.value || task.category === categoryFilter.value;
    const searchableText = `${task.text} ${task.source} ${task.category}`.toLowerCase();
    const matchesKeyword = !keyword || searchableText.includes(keyword);

    return matchesCategory && matchesKeyword;
  });
});
const poolSummary = computed(() => {
  if (!approvedTasks.value.length) {
    return "卡池里还没有任务卡";
  }

  if (hasFilters.value) {
    return `找到 ${visiblePoolTasks.value.length} 张任务卡`;
  }

  return `卡池里共有 ${approvedTasks.value.length} 张任务卡`;
});
const emptyText = computed(() => {
  if (approvedTasks.value.length) {
    return "没有找到符合条件的任务卡";
  }

  return "发布任务卡并加入卡池后，这里会出现新的现实任务。";
});

function clearFilters() {
  searchText.value = "";
  categoryFilter.value = "";
}

function isTaskActive(taskId: string) {
  return activeTaskIds.value.has(taskId);
}
</script>
