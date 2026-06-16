<template>
  <dialog ref="dialogRef" class="complete-dialog" @close="handleNativeClose">
    <form class="dialog-panel" @submit.prevent="submit">
      <div class="dialog-head">
        <div>
          <p class="eyebrow">{{ dialogLabel }}</p>
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
      <div v-if="photoPreview" class="photo-preview">
        <img :src="photoPreview" :alt="photoName ? `照片预览：${photoName}` : '照片预览'" />
        <button class="ghost-button" type="button" @click="removePhoto">
          <Trash2 />
          <span>移除照片</span>
        </button>
      </div>
      <p v-if="photoMessage" class="field-hint">{{ photoMessage }}</p>
      <div class="dialog-actions">
        <button class="ghost-button" type="button" @click="close">再等等</button>
        <button class="primary-button" type="submit" :disabled="isPreparingPhoto">
          <Check />
          <span>{{ submitLabel }}</span>
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { Check, Trash2, X } from "@lucide/vue";
import { computed, nextTick, ref, watch } from "vue";

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
const photoDataUrl = ref("");
const photoPreview = ref("");
const photoMessage = ref("");
const isPreparingPhoto = ref(false);
const closingFromCode = ref(false);

const dialogLabel = computed(() => (props.quest?.status === "done" ? "编辑记录" : "确认完成"));
const submitLabel = computed(() => {
  if (isPreparingPhoto.value) {
    return "整理照片中";
  }

  return props.quest?.status === "done" ? "保存记录" : "完成";
});

watch(
  () => props.quest,
  async (quest) => {
    if (!quest) {
      closeDialogElement();
      return;
    }

    reflection.value = quest.reflection || "";
    photoName.value = quest.photoName || "";
    photoDataUrl.value = quest.photoDataUrl || "";
    photoPreview.value = quest.photoDataUrl || "";
    photoMessage.value = "";
    isPreparingPhoto.value = false;
    await nextTick();

    const dialog = dialogRef.value;
    if (dialog && !dialog.open && typeof dialog.showModal === "function") {
      dialog.showModal();
    } else if (dialog && !dialog.open) {
      dialog.setAttribute("open", "");
    }
  },
);

async function selectPhoto(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  photoMessage.value = "";

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    photoMessage.value = "请选择一张照片。";
    input.value = "";
    return;
  }

  isPreparingPhoto.value = true;

  try {
    const compressed = await compressPhoto(file);
    photoName.value = file.name;
    photoDataUrl.value = compressed;
    photoPreview.value = compressed;
    photoMessage.value = "照片已准备好，会和完成记录一起保存在这台设备上。";
  } catch {
    photoName.value = "";
    photoDataUrl.value = "";
    photoPreview.value = "";
    photoMessage.value = "这张照片暂时无法保存，换一张更小的试试。";
  } finally {
    isPreparingPhoto.value = false;
    input.value = "";
  }
}

function removePhoto() {
  photoName.value = "";
  photoDataUrl.value = "";
  photoPreview.value = "";
  photoMessage.value = "照片已移除。";
}

function submit() {
  if (isPreparingPhoto.value) {
    return;
  }

  emit("complete", {
    reflection: reflection.value,
    photoName: photoName.value,
    photoDataUrl: photoDataUrl.value,
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

async function compressPhoto(file: File) {
  const firstPass = await resizePhoto(file, 1024, 0.72);

  if (firstPass.length <= 850_000) {
    return firstPass;
  }

  const secondPass = await resizePhoto(file, 720, 0.56);

  if (secondPass.length <= 850_000) {
    return secondPass;
  }

  throw new Error("Photo is too large for local storage");
}

function resizePhoto(file: File, maxEdge: number, quality: number) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas is unavailable"));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image cannot be loaded"));
    };

    image.src = objectUrl;
  });
}
</script>
