<template>
  <section class="screen">
    <div class="screen-title">
      <p class="eyebrow">账号</p>
      <h1>玩家档案</h1>
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
          <span>完成</span>
        </div>
        <div class="metric">
          <strong>{{ store.stats.todo }}</strong>
          <span>进行中</span>
        </div>
        <div class="metric">
          <strong>{{ store.stats.userApproved }}</strong>
          <span>入池</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <h2>设置</h2>
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
        <button class="danger-button" type="button" @click="resetDemo">
          <RotateCcw />
          <span>重置 demo</span>
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

function resetDemo() {
  if (window.confirm("重置本地 demo 数据？")) {
    store.resetDemo();
  }
}
</script>
