<template>
  <dialog ref="dialogRef" class="complete-dialog" @close="handleNativeClose">
    <form class="dialog-panel" @submit.prevent="submit">
      <div class="dialog-head">
        <div>
          <p class="eyebrow">确认完成</p>
          <h2>{{ quest?.text || "任务回收" }}</h2>
        </div>
        <button class="icon-button" type="button" aria-label="关闭" @click="close">
          <X />
        </button>
      </div>
      <label class="field">
        <span>文字感悟</span>
        <textarea v-model="reflection" rows="5" maxlength="240" placeholder="写一句也可以"></textarea>
      </label>
      <label class="field">
        <span>照片记录</span>
        <input type="file" accept="image/*" @change="selectPhoto" />
      </label>
      <div class="dialog-actions">
        <button class="ghost-button" type="button" @click="close">再等等</button>
        <button class="primary-button" type="submit">
          <Check />
          <span>完成</span>
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { Check, X } from "@lucide/vue";
import { nextTick, ref, watch } from "vue";

import type { AcceptedQuest, CompletionPayload } from "@/types/quest";

const props = defineProps<{
  quest: AcceptedQuest | null;
}>();

const emit = defineEmits<{
  close: [];
  complete: [payload: CompletionPayload];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);
const reflection = ref("");
const photoName = ref("");
const closingFromCode = ref(false);

watch(
  () => props.quest,
  async (quest) => {
    if (!quest) {
      closeDialogElement();
      return;
    }

    reflection.value = quest.reflection || "";
    photoName.value = quest.photoName || "";
    await nextTick();

    const dialog = dialogRef.value;
    if (dialog && !dialog.open && typeof dialog.showModal === "function") {
      dialog.showModal();
    } else if (dialog && !dialog.open) {
      dialog.setAttribute("open", "");
    }
  },
);

function selectPhoto(event: Event) {
  const input = event.target as HTMLInputElement;
  photoName.value = input.files?.[0]?.name || "";
}

function submit() {
  emit("complete", {
    reflection: reflection.value,
    photoName: photoName.value,
  });
}

function close() {
  closeDialogElement();
  emit("close");
}

function closeDialogElement() {
  const dialog = dialogRef.value;

  if (!dialog?.open) {
    return;
  }

  closingFromCode.value = true;
  dialog.close();
  closingFromCode.value = false;
}

function handleNativeClose() {
  if (!closingFromCode.value) {
    emit("close");
  }
}
</script>
