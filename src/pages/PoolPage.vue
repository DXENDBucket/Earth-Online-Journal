<template>
  <section class="screen">
    <div class="screen-title">
      <p class="eyebrow">卡池</p>
      <h1>卡池选择</h1>
      <p>选好当前卡池后，抽卡、发布任务和榜单都会跟着这个卡池变化。</p>
    </div>

    <section class="task-list" aria-label="选择卡池">
      <article
        v-for="pool in pools"
        :key="pool.id"
        class="list-card"
        :class="{ 'is-selected': pool.id === currentPoolId }"
      >
        <div class="tag-row">
          <span class="tag green">{{ pool.kind === "public" ? "公共" : "私人" }}</span>
          <span v-if="pool.id === currentPoolId" class="tag yellow">当前使用</span>
        </div>
        <div class="section-title">
          <div>
            <h2>{{ pool.name }}</h2>
            <p class="section-note">{{ pool.description }}</p>
          </div>
          <small>{{ getApprovedCount(pool.id) }} 张</small>
        </div>
        <div class="list-meta">
          <span>{{ getDrawCount(pool.id) }} 张可抽</span>
          <span>{{ getTodoCount(pool.id) }} 张进行中</span>
          <span>{{ getDoneCount(pool.id) }} 条完成记录</span>
        </div>
        <div class="item-actions">
          <button
            class="primary-button"
            type="button"
            :disabled="pool.id === currentPoolId"
            @click="selectPool(pool.id)"
          >
            <Check v-if="pool.id === currentPoolId" />
            <Repeat2 v-else />
            <span>{{ pool.id === currentPoolId ? "正在使用" : "切换到这里" }}</span>
          </button>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="section-title">
        <div>
          <h2>{{ currentPool.name }}里的任务</h2>
          <p class="section-note">{{ poolSummary }}</p>
        </div>
      </div>
      <section class="journal-tools" aria-label="筛选当前卡池">
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
        <button v-if="hasFilters" class="ghost-button small-button" type="button" @click="clearFilters">
          <X />
          <span>清除筛选</span>
        </button>
      </div>

      <div class="task-list">
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
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { Check, Repeat2, Search, X } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

import { useNoticeStore } from "@/stores/noticeStore";
import { useQuestStore } from "@/stores/questStore";

const store = useQuestStore();
const notice = useNoticeStore();
const { approvedTasks, currentPool, currentPoolId, drawPool, pools, todoQuests } = storeToRefs(store);
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
    return `${currentPool.value.name}里还没有任务卡`;
  }

  if (hasFilters.value) {
    return `找到 ${visiblePoolTasks.value.length} 张任务卡`;
  }

  return `${currentPool.value.name}里共有 ${approvedTasks.value.length} 张任务卡`;
});
const emptyText = computed(() => {
  if (approvedTasks.value.length) {
    return "没有找到符合条件的任务卡";
  }

  return currentPool.value.kind === "private"
    ? "私人池现在还是空的。切到发布页写一张任务卡，再把它加入卡池。"
    : "发布任务卡并加入卡池后，这里会出现新的现实任务。";
});

function selectPool(poolId: string) {
  if (poolId === currentPoolId.value) {
    return;
  }

  if (store.setCurrentPool(poolId)) {
    clearFilters();
    notice.showNotice(`已切换到${currentPool.value.name}。`, "success");
  }
}

function clearFilters() {
  searchText.value = "";
  categoryFilter.value = "";
}

function isTaskActive(taskId: string) {
  return activeTaskIds.value.has(taskId);
}

function getApprovedCount(poolId: string) {
  return store.tasks.filter((task) => task.poolId === poolId && task.status === "approved").length;
}

function getDrawCount(poolId: string) {
  const activeIds = new Set(
    store.accepted.filter((quest) => quest.poolId === poolId && quest.status === "todo").map((quest) => quest.taskId),
  );

  return store.tasks.filter((task) => {
    return task.poolId === poolId && task.status === "approved" && !activeIds.has(task.id);
  }).length;
}

function getTodoCount(poolId: string) {
  return store.accepted.filter((quest) => quest.poolId === poolId && quest.status === "todo").length;
}

function getDoneCount(poolId: string) {
  return store.accepted.filter((quest) => quest.poolId === poolId && quest.status === "done").length;
}
</script>
