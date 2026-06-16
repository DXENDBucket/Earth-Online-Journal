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
        <button class="danger-button" type="button" @click="clearLocalProgress">
          <RotateCcw />
          <span>清空本机记录</span>
        </button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { RotateCcw } from "@lucide/vue";
import { computed } from "vue";

import { useQuestStore } from "@/stores/questStore";

const store = useQuestStore();

const lightOnly = computed({
  get: () => store.preferences.lightOnly,
  set: (value: boolean) => store.setLightOnly(value),
});

function clearLocalProgress() {
  if (window.confirm("要清空这台设备上的任务和完成记录吗？")) {
    store.clearLocalProgress();
  }
}
</script>
