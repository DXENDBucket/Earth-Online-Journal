<template>
  <div class="app-shell">
    <main class="app-main" aria-live="polite">
      <RouterView />
    </main>
    <AppNotice />
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { RouterView } from "vue-router";

import AppNotice from "@/components/AppNotice.vue";
import BottomNav from "@/components/BottomNav.vue";
import {
  QUEST_STORAGE_ERROR_EVENT,
  type QuestStorageErrorReason,
} from "@/services/localQuestStorage";
import { useNoticeStore } from "@/stores/noticeStore";

const notice = useNoticeStore();

function handleStorageError(event: Event) {
  const reason = event instanceof CustomEvent
    ? (event.detail?.reason as QuestStorageErrorReason | undefined)
    : undefined;
  const message = reason === "full"
    ? "这台设备的记录空间快满了。可以先下载记录，再删除一些照片或旧记录。"
    : "这台设备暂时无法保存记录。可以先下载记录，稍后再试。";

  notice.showNotice(message, "warning");
}

onMounted(() => {
  window.addEventListener(QUEST_STORAGE_ERROR_EVENT, handleStorageError);
});

onUnmounted(() => {
  window.removeEventListener(QUEST_STORAGE_ERROR_EVENT, handleStorageError);
});
</script>
