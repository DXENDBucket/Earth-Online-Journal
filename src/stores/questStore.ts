import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";

import {
  clearQuestSnapshot,
  createInitialSnapshot,
  loadQuestSnapshot,
  normalizeQuestSnapshot,
  saveQuestSnapshot,
} from "@/services/localQuestStorage";
import type { QuestStoreSnapshot } from "@/services/localQuestStorage";
import type {
  AcceptedQuest,
  CompletionPayload,
  DrawQuestResult,
  PublishQuestPayload,
  PublishQuestResult,
  QuestPreferences,
  QuestPool,
  QuestTask,
  UserProfile,
} from "@/types/quest";

export const useQuestStore = defineStore("quests", () => {
  const snapshot = loadQuestSnapshot();

  const pools = ref<QuestPool[]>(snapshot.pools);
  const tasks = ref<QuestTask[]>(snapshot.tasks);
  const accepted = ref<AcceptedQuest[]>(snapshot.accepted);
  const preferences = reactive<QuestPreferences>(snapshot.preferences);
  const currentDrawId = ref(snapshot.currentDrawId);
  const user = reactive<UserProfile>(snapshot.user);

  const currentPool = computed(() => {
    return pools.value.find((pool) => pool.id === preferences.selectedPoolId) || pools.value[0];
  });
  const currentPoolId = computed(() => currentPool.value.id);
  const tasksInCurrentPool = computed(() => tasks.value.filter((task) => task.poolId === currentPoolId.value));
  const acceptedInCurrentPool = computed(() =>
    accepted.value.filter((quest) => quest.poolId === currentPoolId.value),
  );
  const approvedTasks = computed(() => tasksInCurrentPool.value.filter((task) => task.status === "approved"));
  const pendingTasks = computed(() => tasksInCurrentPool.value.filter((task) => task.status === "pending"));
  const todoQuests = computed(() => acceptedInCurrentPool.value.filter((quest) => quest.status === "todo"));
  const doneQuests = computed(() => acceptedInCurrentPool.value.filter((quest) => quest.status === "done"));
  const activeTaskIds = computed(() => new Set(todoQuests.value.map((quest) => quest.taskId)));

  const drawPool = computed(() =>
    approvedTasks.value.filter((task) => {
      const matchesPreference = !preferences.lightOnly || task.intensity === "light";
      return matchesPreference && !activeTaskIds.value.has(task.id);
    }),
  );

  const currentDraw = computed(() => {
    return accepted.value.find((quest) => quest.id === currentDrawId.value) || todoQuests.value[0] || null;
  });

  const userApprovedTasks = computed(() =>
    tasksInCurrentPool.value.filter((task) => task.source === "用户发布" && task.status === "approved"),
  );

  const stats = computed(() => ({
    approved: approvedTasks.value.length,
    pending: pendingTasks.value.length,
    todo: todoQuests.value.length,
    done: doneQuests.value.length,
    userApproved: userApprovedTasks.value.length,
  }));

  function publishTask(payload: PublishQuestPayload): PublishQuestResult {
    const text = payload.text.trim();

    if (!text) {
      return { status: "empty" };
    }

    if (hasSameTask(text)) {
      return { status: "duplicate" };
    }

    const task: QuestTask = {
      id: uid("task"),
      poolId: currentPoolId.value,
      text,
      category: payload.category,
      intensity: payload.intensity,
      status: "pending",
      source: "用户发布",
      createdAt: Date.now(),
    };

    tasks.value.unshift(task);
    return persist() ? { status: "created", task } : { status: "storage-error", task };
  }

  function hasSameTask(text: string) {
    const normalizedText = normalizeTaskText(text);
    return tasks.value.some((task) => normalizeTaskText(task.text) === normalizedText);
  }

  function approveTask(id: string) {
    const task = tasks.value.find((item) => item.id === id);

    if (!task) {
      return;
    }

    task.status = "approved";
    task.approvedAt = Date.now();
    persist();
  }

  function removeTask(id: string) {
    const index = tasks.value.findIndex((task) => task.id === id);

    if (index < 0) {
      return;
    }

    tasks.value.splice(index, 1);
    persist();
  }

  function drawQuest(): DrawQuestResult {
    if (!drawPool.value.length) {
      return { status: "empty" };
    }

    const picked = drawPool.value[Math.floor(Math.random() * drawPool.value.length)];
    const quest: AcceptedQuest = {
      id: uid("accepted"),
      poolId: picked.poolId,
      taskId: picked.id,
      text: picked.text,
      category: picked.category,
      source: picked.source,
      status: "todo",
      acceptedAt: Date.now(),
      completedAt: null,
      reflection: "",
      photoName: "",
      photoDataUrl: "",
    };

    accepted.value.unshift(quest);
    currentDrawId.value = quest.id;
    return persist() ? { status: "created", quest } : { status: "storage-error", quest };
  }

  function completeQuest(id: string, payload: CompletionPayload) {
    const quest = accepted.value.find((item) => item.id === id);

    if (!quest) {
      return false;
    }

    quest.status = "done";
    quest.completedAt = quest.completedAt || Date.now();
    quest.reflection = payload.reflection.trim();
    quest.photoName = payload.photoName;
    quest.photoDataUrl = payload.photoDataUrl;
    return persist();
  }

  function deleteAcceptedQuest(id: string) {
    const index = accepted.value.findIndex((quest) => quest.id === id);

    if (index < 0) {
      return false;
    }

    accepted.value.splice(index, 1);

    if (currentDrawId.value === id) {
      currentDrawId.value = todoQuests.value[0]?.id || "";
    }

    return persist();
  }

  function returnQuest(id: string) {
    const index = accepted.value.findIndex((quest) => quest.id === id && quest.status === "todo");

    if (index < 0) {
      return false;
    }

    accepted.value.splice(index, 1);

    if (currentDrawId.value === id) {
      currentDrawId.value = todoQuests.value[0]?.id || "";
    }

    return persist();
  }

  function setLightOnly(value: boolean) {
    preferences.lightOnly = value;
    return persist();
  }

  function setDrawAnimation(value: boolean) {
    preferences.drawAnimation = value;
    return persist();
  }

  function setCurrentPool(poolId: string) {
    if (!pools.value.some((pool) => pool.id === poolId)) {
      return false;
    }

    preferences.selectedPoolId = poolId;
    currentDrawId.value = todoQuests.value[0]?.id || "";
    return persist();
  }

  function updateUserProfile(nextUser: UserProfile) {
    user.name = nextUser.name.trim() || "地球旅人";
    user.handle = nextUser.handle.trim() || "EOJ-2049";
    return persist();
  }

  function clearLocalProgress() {
    clearQuestSnapshot();
    const fresh = createInitialSnapshot();
    applySnapshot(fresh);
    return persist();
  }

  function getSnapshot(): QuestStoreSnapshot {
    return {
      pools: pools.value,
      tasks: tasks.value,
      accepted: accepted.value,
      preferences: { ...preferences },
      currentDrawId: currentDrawId.value,
      user: { ...user },
    };
  }

  function importSnapshot(snapshot: QuestStoreSnapshot) {
    applySnapshot(normalizeQuestSnapshot(snapshot));
    return persist();
  }

  function applySnapshot(snapshot: QuestStoreSnapshot) {
    pools.value = snapshot.pools;
    tasks.value = snapshot.tasks;
    accepted.value = snapshot.accepted;
    Object.assign(preferences, snapshot.preferences);
    Object.assign(user, snapshot.user);
    currentDrawId.value = snapshot.currentDrawId;
  }

  function persist() {
    return saveQuestSnapshot({
      pools: pools.value,
      tasks: tasks.value,
      accepted: accepted.value,
      preferences: { ...preferences },
      currentDrawId: currentDrawId.value,
      user: { ...user },
    });
  }

  return {
    pools,
    tasks,
    accepted,
    preferences,
    currentDrawId,
    user,
    currentPool,
    currentPoolId,
    approvedTasks,
    pendingTasks,
    todoQuests,
    doneQuests,
    drawPool,
    currentDraw,
    userApprovedTasks,
    stats,
    publishTask,
    approveTask,
    removeTask,
    drawQuest,
    completeQuest,
    deleteAcceptedQuest,
    returnQuest,
    setLightOnly,
    setDrawAnimation,
    setCurrentPool,
    updateUserProfile,
    clearLocalProgress,
    getSnapshot,
    importSnapshot,
  };
});

function uid(prefix: string) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTaskText(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
