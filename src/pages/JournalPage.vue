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
        <div v-if="quest.status !== 'done'" class="item-actions">
          <button class="primary-button" type="button" @click="completionQuest = quest">
            <CheckCircle2 />
            <span>确认完成</span>
          </button>
        </div>
      </article>

      <div v-if="!items.length" class="empty-state">
        <img :src="questCardImage" alt="" />
        <strong>{{ filter === "todo" ? "没有未完成任务" : "还没有完成记录" }}</strong>
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
import { CheckCircle2 } from "@lucide/vue";
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

const journalOptions = [
  { value: "todo", label: "未完成" },
  { value: "done", label: "已完成" },
];

const filter = computed<JournalFilter>(() => (route.query.filter === "done" ? "done" : "todo"));
const items = computed(() => (filter.value === "todo" ? todoQuests.value : doneQuests.value));

function setFilter(value: string) {
  router.replace({
    name: "journal",
    query: { filter: value === "done" ? "done" : "todo" },
  });
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
