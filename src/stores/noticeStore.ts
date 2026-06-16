import { defineStore } from "pinia";
import { ref } from "vue";

export type NoticeTone = "success" | "info" | "warning";

export const useNoticeStore = defineStore("notice", () => {
  const message = ref("");
  const tone = ref<NoticeTone>("info");
  let timer: number | undefined;

  function showNotice(nextMessage: string, nextTone: NoticeTone = "info") {
    message.value = nextMessage;
    tone.value = nextTone;

    if (timer) {
      window.clearTimeout(timer);
    }

    timer = window.setTimeout(() => {
      message.value = "";
      timer = undefined;
    }, 2600);
  }

  function clearNotice() {
    message.value = "";

    if (timer) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  }

  return {
    message,
    tone,
    showNotice,
    clearNotice,
  };
});
