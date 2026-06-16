<template>
  <section class="screen">
    <div class="screen-title">
      <p class="eyebrow">任务册</p>
      <h1>未完成 / 已完成</h1>
    </div>

    <SegmentTabs
      :model-value="filter"
      label="任务状态"
      :options="journalOptions"
      @update:model-value="setFilter"
    />

    <section class="journal-tools" aria-label="查找任务记录">
      <label class="search-field">
        <Search />
        <input v-model="searchText" type="search" placeholder="搜索任务或感悟" />
      </label>
      <label class="field compact-field">
        <span>类型</span>
        <select v-model="categoryFilter">
          <option value="">全部类型</option>
          <option v-for="category in categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </label>
    </section>

    <div class="section-title">
      <p class="section-note">{{ resultSummary }}</p>
      <button v-if="hasFilters" class="ghost-button small-button" type="button" @click="clearFilters">
        <X />
        <span>清除筛选</span>
      </button>
    </div>

    <section class="task-list">
      <article v-for="quest in items" :key="quest.id" class="list-card">
        <div class="tag-row">
          <span class="tag green">{{ quest.category }}</span>
          <span class="tag">{{ formatDate(quest.status === "done" ? quest.completedAt : quest.acceptedAt) }}</span>
          <span class="tag" :class="quest.status === 'done' ? 'yellow' : 'coral'">
            {{ quest.status === "done" ? "已完成" : "未完成" }}
          </span>
        </div>
        <p>{{ quest.text }}</p>
        <div v-if="quest.status === 'done'" class="list-meta">
          <span v-if="quest.reflection">感悟：{{ quest.reflection }}</span>
          <span v-if="quest.photoName">照片已保存</span>
        </div>
        <img
          v-if="quest.status === 'done' && quest.photoDataUrl"
          class="completion-photo"
          :src="quest.photoDataUrl"
          :alt="quest.photoName ? `完成照片：${quest.photoName}` : '完成照片'"
        />
        <div v-if="quest.status === 'done'" class="item-actions">
          <button class="secondary-button" type="button" @click="completionQuest = quest">
            <Pencil />
            <span>编辑记录</span>
          </button>
          <button class="danger-button" type="button" @click="deleteRecord(quest)">
            <Trash2 />
            <span>删除记录</span>
          </button>
        </div>
        <div v-if="quest.status !== 'done'" class="item-actions">
          <button class="primary-button" type="button" @click="completionQuest = quest">
            <CheckCircle2 />
            <span>确认完成</span>
          </button>
          <button class="ghost-button" type="button" @click="returnQuest(quest)">
            <Undo2 />
            <span>放回卡池</span>
          </button>
        </div>
      </article>

      <div v-if="!items.length" class="empty-state">
        <img :src="questCardImage" alt="" />
        <strong>{{ emptyText }}</strong>
      </div>
    </section>

    <CompleteDialog
      :quest="completionQuest"
      @close="completionQuest = null"
      @complete="completeQuest"
    />
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { CheckCircle2, Pencil, Search, Trash2, Undo2, X } from "@lucide/vue";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import questCardImage from "@/assets/quest-card.png";
import CompleteDialog from "@/components/CompleteDialog.vue";
import SegmentTabs from "@/components/SegmentTabs.vue";
import { useNoticeStore } from "@/stores/noticeStore";
import { useQuestStore } from "@/stores/questStore";
import type { AcceptedQuest, CompletionPayload } from "@/types/quest";

type JournalFilter = "todo" | "done";

const route = useRoute();
const router = useRouter();
const store = useQuestStore();
const notice = useNoticeStore();
const { todoQuests, doneQuests } = storeToRefs(store);
const completionQuest = ref<AcceptedQuest | null>(null);
const searchText = ref("");
const categoryFilter = ref("");

const journalOptions = [
  { value: "todo", label: "未完成" },
  { value: "done", label: "已完成" },
];

const filter = computed<JournalFilter>(() => (route.query.filter === "done" ? "done" : "todo"));
const baseItems = computed(() => (filter.value === "todo" ? todoQuests.value : doneQuests.value));
const hasFilters = computed(() => Boolean(searchText.value.trim() || categoryFilter.value));
const categoryOptions = computed(() => {
  return [...new Set(baseItems.value.map((quest) => quest.category))];
});
const items = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();

  return baseItems.value.filter((quest) => {
    const matchesCategory = !categoryFilter.value || quest.category === categoryFilter.value;
    const searchableText = `${quest.text} ${quest.reflection} ${quest.category}`.toLowerCase();
    const matchesKeyword = !keyword || searchableText.includes(keyword);

    return matchesCategory && matchesKeyword;
  });
});
const resultSummary = computed(() => {
  if (!baseItems.value.length) {
    return filter.value === "todo" ? "现在没有进行中的任务" : "现在还没有完成记录";
  }

  return hasFilters.value ? `找到 ${items.value.length} 条记录` : `共 ${items.value.length} 条记录`;
});
const emptyText = computed(() => {
  if (baseItems.value.length) {
    return "没有找到符合条件的记录";
  }

  return filter.value === "todo" ? "没有未完成任务" : "还没有完成记录";
});

function setFilter(value: string) {
  router.replace({
    name: "journal",
    query: { filter: value === "done" ? "done" : "todo" },
  });
}

function clearFilters() {
  searchText.value = "";
  categoryFilter.value = "";
}

function completeQuest(payload: CompletionPayload) {
  if (!completionQuest.value) {
    return;
  }

  store.completeQuest(completionQuest.value.id, payload);
  completionQuest.value = null;
  notice.showNotice("完成记录已保存。", "success");
  setFilter("done");
}

function returnQuest(quest: AcceptedQuest) {
  if (store.returnQuest(quest.id)) {
    notice.showNotice("任务已放回卡池。", "success");
  }
}

function deleteRecord(quest: AcceptedQuest) {
  if (!window.confirm("要删除这条完成记录吗？")) {
    return;
  }

  if (store.deleteAcceptedQuest(quest.id)) {
    notice.showNotice("完成记录已删除。", "success");
  }
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
