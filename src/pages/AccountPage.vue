<template>
  <section class="screen">
    <div class="screen-title">
      <p class="eyebrow">账号</p>
      <h1>我的记录</h1>
    </div>

    <section class="profile-panel">
      <div class="profile-head">
        <div class="avatar">EO</div>
        <div>
          <h2>{{ store.user.name }}</h2>
          <p class="hero-line">{{ store.user.handle }}</p>
        </div>
      </div>
      <div class="metric-row">
        <div class="metric">
          <strong>{{ store.stats.done }}</strong>
          <span>已完成</span>
        </div>
        <div class="metric">
          <strong>{{ store.stats.todo }}</strong>
          <span>进行中</span>
        </div>
        <div class="metric">
          <strong>{{ store.stats.userApproved }}</strong>
          <span>已发布</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <h2>个人资料</h2>
      </div>
      <form class="profile-form" @submit.prevent="saveProfile">
        <label class="field">
          <span>显示名称</span>
          <input v-model="profileName" type="text" maxlength="24" placeholder="地球旅人" />
        </label>
        <label class="field">
          <span>编号</span>
          <input v-model="profileHandle" type="text" maxlength="24" placeholder="EOJ-2049" />
        </label>
        <button class="primary-button" type="submit">
          <Save />
          <span>保存资料</span>
        </button>
      </form>
    </section>

    <section class="panel">
      <div class="section-title">
        <h2>偏好</h2>
      </div>
      <div class="settings-list">
        <label class="setting-row">
          <div>
            <strong>只抽轻量任务</strong>
            <p>更适合通勤、课间和睡前。</p>
          </div>
          <span class="switch">
            <input v-model="lightOnly" type="checkbox" />
            <span></span>
          </span>
        </label>
        <div class="setting-row">
          <div>
            <strong>这台设备上的记录</strong>
            <p>当前版本会把任务和完成记录保存在本机浏览器里。</p>
          </div>
        </div>
        <div class="account-actions">
          <button class="secondary-button" type="button" @click="downloadRecords">
            <Download />
            <span>下载我的记录</span>
          </button>
          <label class="secondary-button file-button">
            <Upload />
            <span>导入记录</span>
            <input type="file" accept="application/json" @change="importRecords" />
          </label>
        </div>
        <button class="danger-button" type="button" @click="clearLocalProgress">
          <RotateCcw />
          <span>清空本机记录</span>
        </button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { Download, RotateCcw, Save, Upload } from "@lucide/vue";
import { computed, ref, watch } from "vue";

import type { QuestStoreSnapshot } from "@/services/localQuestStorage";
import { useNoticeStore } from "@/stores/noticeStore";
import { useQuestStore } from "@/stores/questStore";

const store = useQuestStore();
const notice = useNoticeStore();
const profileName = ref(store.user.name);
const profileHandle = ref(store.user.handle);

const lightOnly = computed({
  get: () => store.preferences.lightOnly,
  set: (value: boolean) => store.setLightOnly(value),
});

watch(
  () => [store.user.name, store.user.handle],
  ([name, handle]) => {
    profileName.value = name;
    profileHandle.value = handle;
  },
);

function saveProfile() {
  const saved = store.updateUserProfile({
    name: profileName.value,
    handle: profileHandle.value,
  });

  if (!saved) {
    return;
  }

  notice.showNotice("个人资料已保存。", "success");
}

function clearLocalProgress() {
  if (window.confirm("要清空这台设备上的任务和完成记录吗？")) {
    if (store.clearLocalProgress()) {
      notice.showNotice("这台设备上的记录已清空。", "success");
    }
  }
}

function downloadRecords() {
  const content = JSON.stringify(store.getSnapshot(), null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `earth-online-journal-${formatDateForFile(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
  notice.showNotice("记录文件已开始下载。", "success");
}

function importRecords(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const snapshot = JSON.parse(String(reader.result)) as QuestStoreSnapshot;

      if (!isValidSnapshot(snapshot)) {
        notice.showNotice("这个文件不是可导入的记录。", "warning");
        return;
      }

      if (store.importSnapshot(snapshot)) {
        notice.showNotice("记录已导入。", "success");
      }
    } catch {
      notice.showNotice("记录文件读取失败。", "warning");
    } finally {
      input.value = "";
    }
  };

  reader.readAsText(file);
}

function isValidSnapshot(value: QuestStoreSnapshot) {
  return Boolean(
    value &&
      Array.isArray(value.tasks) &&
      Array.isArray(value.accepted) &&
      value.preferences &&
      typeof value.currentDrawId === "string" &&
      value.user,
  );
}

function formatDateForFile(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("/", "-");
}
</script>
