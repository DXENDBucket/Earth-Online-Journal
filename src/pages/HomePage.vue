<template>
  <section class="screen">
    <section class="app-hero">
      <div class="hero-copy">
        <p class="eyebrow">Earth Online Journal</p>
        <h1>给今天抽一张现实任务</h1>
        <p class="hero-line">把日常生活当作开放地图，接住一个小小的行动提示。</p>
        <div class="metric-row">
          <div class="metric">
            <strong>{{ drawPool.length }}</strong>
            <span>可抽任务</span>
          </div>
          <div class="metric">
            <strong>{{ stats.todo }}</strong>
            <span>进行中</span>
          </div>
          <div class="metric">
            <strong>{{ stats.done }}</strong>
            <span>已完成</span>
          </div>
        </div>
      </div>
      <img class="hero-art" :src="questCardImage" alt="" />
    </section>

    <SegmentTabs v-model="homeMode" label="发布或接取任务" :options="homeOptions" />

    <section v-if="homeMode === 'draw'" class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">接取</p>
          <h2>抽一张任务</h2>
        </div>
        <span class="pool-count">{{ drawPool.length }} 张可抽</span>
      </div>
      <div class="draw-stage">
        <button class="draw-button" type="button" @click="drawQuest">
          <Dice5 />
          <span>开始抽取</span>
        </button>
        <QuestCard
          :quest="currentDraw"
          @complete="openCompletion"
          @open-journal="openJournal"
          @return-quest="returnQuest"
        />
      </div>
    </section>

    <section v-if="homeMode === 'draw'" class="panel">
      <div class="section-title">
        <h2>任务卡池</h2>
        <small>{{ visiblePoolTasks.length }} 张</small>
      </div>
      <section class="journal-tools" aria-label="筛选任务卡池">
        <label class="field compact-field">
          <span>类型</span>
          <select v-model="poolCategory">
            <option value="">全部类型</option>
            <option v-for="item in poolCategoryOptions" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
        </label>
        <button v-if="poolCategory" class="ghost-button small-button" type="button" @click="poolCategory = ''">
          <X />
          <span>清除筛选</span>
        </button>
      </section>
      <div class="section-title">
        <p class="section-note">{{ poolSummary }}</p>
      </div>
      <div class="task-list">
        <article v-for="task in visiblePoolTasks" :key="task.id" class="list-card">
          <div class="tag-row">
            <span class="tag green">{{ task.category }}</span>
            <span class="tag">{{ task.source }}</span>
          </div>
          <p>{{ task.text }}</p>
        </article>
        <div v-if="!visiblePoolTasks.length" class="empty-state">
          <strong>没有找到这个类型的任务卡</strong>
        </div>
      </div>
    </section>

    <section v-if="homeMode === 'publish'" class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">发布</p>
          <h2>写一张任务卡</h2>
        </div>
        <span class="pool-count">{{ pendingTasks.length }} 张待确认</span>
      </div>
      <form @submit.prevent="submitPublish">
        <label class="field">
          <span>任务内容</span>
          <textarea
            v-model="publishText"
            rows="5"
            maxlength="120"
            placeholder="例如：给今天的天空取一个名字"
          ></textarea>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>类型</span>
            <select v-model="category">
              <option v-for="item in categories" :key="item">{{ item }}</option>
            </select>
          </label>
          <label class="field">
            <span>强度</span>
            <select v-model="intensity">
              <option value="light">轻量</option>
              <option value="normal">普通</option>
            </select>
          </label>
        </div>
        <button class="primary-button" type="submit">
          <Send />
          <span>保存任务卡</span>
        </button>
      </form>
    </section>

    <section v-if="homeMode === 'publish'" class="panel">
      <div class="section-title">
        <div>
          <h2>待加入卡池</h2>
          <p class="section-note">确认内容合适后，就可以让它进入抽取范围。</p>
        </div>
        <small>{{ pendingTasks.length }} 张</small>
      </div>
      <div class="task-list">
        <article v-for="task in pendingTasks" :key="task.id" class="list-card">
          <div class="tag-row">
            <span class="tag yellow">待确认</span>
            <span class="tag green">{{ task.category }}</span>
          </div>
          <p>{{ task.text }}</p>
          <div class="item-actions">
            <button class="primary-button" type="button" @click="store.approveTask(task.id)">
              <BadgeCheck />
              <span>加入卡池</span>
            </button>
            <button class="ghost-button" type="button" @click="store.removeTask(task.id)">
              <Undo2 />
              <span>撤回</span>
            </button>
          </div>
        </article>
        <div v-if="!pendingTasks.length" class="empty-state">
          <strong>还没有待确认的任务卡</strong>
        </div>
      </div>
    </section>

    <section v-if="homeMode === 'publish'" class="panel">
      <div class="section-title">
        <h2>我的任务卡</h2>
        <small>{{ userApprovedTasks.length }} 张</small>
      </div>
      <div class="task-list">
        <article v-for="task in userApprovedTasks.slice(0, 4)" :key="task.id" class="list-card">
          <div class="tag-row">
            <span class="tag green">{{ task.category }}</span>
            <span class="tag">{{ task.source }}</span>
          </div>
          <p>{{ task.text }}</p>
        </article>
        <div v-if="!userApprovedTasks.length" class="empty-state">
          <strong>加入卡池后会出现在这里</strong>
        </div>
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
import { BadgeCheck, Dice5, Send, Undo2, X } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import questCardImage from "@/assets/quest-card.png";
import CompleteDialog from "@/components/CompleteDialog.vue";
import QuestCard from "@/components/QuestCard.vue";
import SegmentTabs from "@/components/SegmentTabs.vue";
import { useNoticeStore } from "@/stores/noticeStore";
import { useQuestStore } from "@/stores/questStore";
import type {
  AcceptedQuest,
  AcceptedQuestStatus,
  CompletionPayload,
  QuestIntensity,
} from "@/types/quest";

const router = useRouter();
const store = useQuestStore();
const notice = useNoticeStore();
const {
  approvedTasks,
  pendingTasks,
  drawPool,
  currentDraw,
  userApprovedTasks,
  stats,
} = storeToRefs(store);

const homeMode = ref("draw");
const publishText = ref("");
const category = ref("观察");
const intensity = ref<QuestIntensity>("light");
const completionQuest = ref<AcceptedQuest | null>(null);
const poolCategory = ref("");

const homeOptions = [
  { value: "draw", label: "接取" },
  { value: "publish", label: "发布" },
];

const categories = ["观察", "记录", "行动", "尝试", "探索", "随机"];
const poolCategoryOptions = computed(() => [...new Set(approvedTasks.value.map((task) => task.category))]);
const visiblePoolTasks = computed(() => {
  if (!poolCategory.value) {
    return approvedTasks.value;
  }

  return approvedTasks.value.filter((task) => task.category === poolCategory.value);
});
const poolSummary = computed(() => {
  if (!poolCategory.value) {
    return `卡池里共有 ${approvedTasks.value.length} 张任务卡`;
  }

  return `${poolCategory.value}类型有 ${visiblePoolTasks.value.length} 张任务卡`;
});

function submitPublish() {
  const result = store.publishTask({
    text: publishText.value,
    category: category.value,
    intensity: intensity.value,
  });

  if (result.status === "empty") {
    notice.showNotice("先写下任务内容，再保存任务卡。", "warning");
    return;
  }

  if (result.status === "duplicate") {
    notice.showNotice("这张任务卡已经在卡池里了。", "warning");
    return;
  }

  publishText.value = "";
  notice.showNotice("任务卡已保存，确认后就会进入卡池。", "success");
}

function drawQuest() {
  const quest = store.drawQuest();

  if (!quest) {
    const message = approvedTasks.value.length
      ? "可抽任务都在进行中，完成或放回一个后再抽。"
      : "当前没有可抽取的任务卡。";
    notice.showNotice(message, "warning");
    return;
  }

  notice.showNotice("已接取一张新的现实任务。", "success");
}

function openCompletion(quest: AcceptedQuest) {
  completionQuest.value = quest;
}

function completeQuest(payload: CompletionPayload) {
  if (!completionQuest.value) {
    return;
  }

  store.completeQuest(completionQuest.value.id, payload);
  completionQuest.value = null;
  notice.showNotice("完成记录已保存。", "success");
  router.push({ name: "journal", query: { filter: "done" } });
}

function returnQuest(quest: AcceptedQuest) {
  if (store.returnQuest(quest.id)) {
    notice.showNotice("任务已放回卡池。", "success");
  }
}

function openJournal(status: AcceptedQuestStatus) {
  router.push({
    name: "journal",
    query: { filter: status === "done" ? "done" : "todo" },
  });
}
</script>
