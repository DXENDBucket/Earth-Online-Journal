<template>
  <Transition name="notice">
    <div v-if="notice.message" class="app-notice" :class="`is-${notice.tone}`" role="status">
      <span>{{ notice.message }}</span>
      <button type="button" aria-label="关闭提示" @click="notice.clearNotice">
        <X />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { X } from "@lucide/vue";

import { useNoticeStore } from "@/stores/noticeStore";

const notice = useNoticeStore();
</script>
