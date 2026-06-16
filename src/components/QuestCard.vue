<template>
  <article v-if="quest" class="quest-card">
    <div class="tag-row">
      <span class="tag green">{{ quest.category }}</span>
      <span class="tag">{{ quest.source }}</span>
      <span class="tag" :class="quest.status === 'done' ? 'yellow' : 'coral'">
        {{ quest.status === "done" ? "已完成" : "未完成" }}
      </span>
    </div>
    <p class="quest-title">{{ quest.text }}</p>
    <div class="card-actions">
      <button
        v-if="quest.status === 'todo'"
        class="primary-button"
        type="button"
        @click="$emit('complete', quest)"
      >
        <Camera />
        <span>确认完成</span>
      </button>
      <button class="secondary-button" type="button" @click="$emit('openJournal', quest.status)">
        <BookOpenCheck v-if="quest.status === 'done'" />
        <ListChecks v-else />
        <span>{{ quest.status === "done" ? "查看记录" : "未完成" }}</span>
      </button>
    </div>
  </article>
  <div v-else class="quest-card empty">
    <img class="hero-art" :src="questCardImage" alt="" />
    <p>{{ emptyText }}</p>
  </div>
</template>

<script setup lang="ts">
import { BookOpenCheck, Camera, ListChecks } from "@lucide/vue";

import questCardImage from "@/assets/quest-card.png";
import type { AcceptedQuest, AcceptedQuestStatus } from "@/types/quest";

withDefaults(
  defineProps<{
    quest: AcceptedQuest | null;
    emptyText?: string;
  }>(),
  {
    emptyText: "等待第一次抽卡",
  },
);

defineEmits<{
  complete: [quest: AcceptedQuest];
  openJournal: [status: AcceptedQuestStatus];
}>();
</script>
