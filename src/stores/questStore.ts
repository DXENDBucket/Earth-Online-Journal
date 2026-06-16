import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";

import {
  clearQuestSnapshot,
  createInitialSnapshot,
  loadQuestSnapshot,
  saveQuestSnapshot,
} from "@/services/localQuestStorage";
import type { QuestStoreSnapshot } from "@/services/localQuestStorage";
import type {
  AcceptedQuest,
  CompletionPayload,
  PublishQuestPayload,
  QuestPreferences,
  QuestTask,
  UserProfile,
} from "@/types/quest";

export const useQuestStore = defineStore("quests", () => {
  const snapshot = loadQuestSnapshot();

  const tasks = ref<QuestTask[]>(snapshot.tasks);
  const accepted = ref<AcceptedQuest[]>(snapshot.accepted);
  const preferences = reactive<QuestPreferences>(snapshot.preferences);
  const currentDrawId = ref(snapshot.currentDrawId);
  const user = reactive<UserProfile>(snapshot.user);

  const approvedTasks = computed(() => tasks.value.filter((task) => task.status === "approved"));
  const pendingTasks = computed(() => tasks.value.filter((task) => task.status === "pending"));
  const todoQuests = computed(() => accepted.value.filter((quest) => quest.status === "todo"));
  const doneQuests = computed(() => accepted.value.filter((quest) => quest.status === "done"));

  const drawPool = computed(() =>
    approvedTasks.value.filter((task) => !preferences.lightOnly || task.intensity === "light"),
  );

  const currentDraw = computed(() => {
    return accepted.value.find((quest) => quest.id === currentDrawId.value) || todoQuests.value[0] || null;
  });

  const userApprovedTasks = computed(() =>
    tasks.value.filter((task) => task.source === "用户发布" && task.status === "approved"),
  );

  const stats = computed(() => ({
    approved: approvedTasks.value.length,
    pending: pendingTasks.value.length,
    todo: todoQuests.value.length,
    done: doneQuests.value.length,
    userApproved: userApprovedTasks.value.length,
  }));

  function publishTask(payload: PublishQuestPayload) {
    const text = payload.text.trim();

    if (!text) {
      return null;
    }

    const task: QuestTask = {
      id: uid("task"),
      text,
      category: payload.category,
      intensity: payload.intensity,
      status: "pending",
      source: "用户发布",
      createdAt: Date.now(),
    };

    tasks.value.unshift(task);
    persist();
    return task;
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

  function drawQuest() {
    if (!drawPool.value.length) {
      return null;
    }

    const picked = drawPool.value[Math.floor(Math.random() * drawPool.value.length)];
    const quest: AcceptedQuest = {
      id: uid("accepted"),
      taskId: picked.id,
      text: picked.text,
      category: picked.category,
      source: picked.source,
      status: "todo",
      acceptedAt: Date.now(),
      completedAt: null,
      reflection: "",
      photoName: "",
    };

    accepted.value.unshift(quest);
    currentDrawId.value = quest.id;
    persist();
    return quest;
  }

  function completeQuest(id: string, payload: CompletionPayload) {
    const quest = accepted.value.find((item) => item.id === id);

    if (!quest) {
      return;
    }

    quest.status = "done";
    quest.completedAt = Date.now();
    quest.reflection = payload.reflection.trim();
    quest.photoName = payload.photoName;
    persist();
  }

  function setLightOnly(value: boolean) {
    preferences.lightOnly = value;
    persist();
  }

  function updateUserProfile(nextUser: UserProfile) {
    user.name = nextUser.name.trim() || "地球旅人";
    user.handle = nextUser.handle.trim() || "EOJ-2049";
    persist();
  }

  function clearLocalProgress() {
    clearQuestSnapshot();
    const fresh = createInitialSnapshot();
    applySnapshot(fresh);
    persist();
  }

  function getSnapshot(): QuestStoreSnapshot {
    return {
      tasks: tasks.value,
      accepted: accepted.value,
      preferences: { ...preferences },
      currentDrawId: currentDrawId.value,
      user: { ...user },
    };
  }

  function importSnapshot(snapshot: QuestStoreSnapshot) {
    applySnapshot(snapshot);
    persist();
  }

  function applySnapshot(snapshot: QuestStoreSnapshot) {
    tasks.value = snapshot.tasks;
    accepted.value = snapshot.accepted;
    Object.assign(preferences, snapshot.preferences);
    Object.assign(user, snapshot.user);
    currentDrawId.value = snapshot.currentDrawId;
  }

  function persist() {
    saveQuestSnapshot({
      tasks: tasks.value,
      accepted: accepted.value,
      preferences: { ...preferences },
      currentDrawId: currentDrawId.value,
      user: { ...user },
    });
  }

  return {
    tasks,
    accepted,
    preferences,
    currentDrawId,
    user,
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
    setLightOnly,
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
