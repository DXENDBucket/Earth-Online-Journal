import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";

import * as api from "@/services/apiClient";
import type { AcceptedQuest as ApiAcceptedQuest, Task as ApiTask } from "@/services/apiClient";
import {
  clearQuestSnapshot,
  createInitialSnapshot,
  loadQuestSnapshot,
  normalizeQuestSnapshot,
  saveQuestSnapshot,
} from "@/services/localQuestStorage";
import type { QuestStoreSnapshot } from "@/services/localQuestStorage";
import { useAuthStore } from "@/stores/authStore";
import type {
  AcceptedQuest,
  CompletionPayload,
  DrawQuestResult,
  PublishQuestPayload,
  PublishQuestResult,
  QuestIntensity,
  QuestPreferences,
  QuestPool,
  QuestTask,
  UserProfile,
} from "@/types/quest";

const PREFERENCES_KEY = "eoj_preferences";

export const useQuestStore = defineStore("quests", () => {
  const authStore = useAuthStore();
  const snapshot = loadQuestSnapshot();

  const pools = ref<QuestPool[]>(snapshot.pools);
  const tasks = ref<QuestTask[]>(snapshot.tasks);
  const accepted = ref<AcceptedQuest[]>(snapshot.accepted);
  const preferences = reactive<QuestPreferences>({
    ...snapshot.preferences,
    ...loadSavedPreferences(),
  });
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

  async function syncFromServer() {
    if (!authStore.token) {
      return;
    }

    const data = await api.sync(authStore.token);
    tasks.value = data.tasks.map(mapApiTask);
    accepted.value = data.accepted.map(mapApiAcceptedQuest);

    if (authStore.user) {
      user.name = authStore.user.display_name || "地球旅人";
      user.handle = authStore.user.handle || "EOJ-2049";
    }

    if (currentDrawId.value && !accepted.value.find((quest) => quest.id === currentDrawId.value)) {
      currentDrawId.value = todoQuests.value[0]?.id || "";
    }
  }

  async function publishTask(payload: PublishQuestPayload): Promise<PublishQuestResult> {
    const text = payload.text.trim();

    if (!text) {
      return { status: "empty" };
    }

    if (isCloudMode()) {
      try {
        const task = await api.publishTask(authStore.token, {
          text,
          category: payload.category,
          intensity: payload.intensity,
          pool_id: currentPoolId.value,
        });
        const mappedTask = mapApiTask(task);
        tasks.value.unshift(mappedTask);
        return { status: "created", task: mappedTask };
      } catch (error) {
        return getApiErrorMessage(error).includes("已经在你的卡池里")
          ? { status: "duplicate" }
          : { status: "storage-error", task: createDraftTask(text, payload) };
      }
    }

    if (hasSameTask(text)) {
      return { status: "duplicate" };
    }

    const task = createDraftTask(text, payload);
    tasks.value.unshift(task);
    return persistLocalSnapshot() ? { status: "created", task } : { status: "storage-error", task };
  }

  async function approveTask(id: string) {
    if (isCloudMode()) {
      try {
        const task = await api.approveTask(authStore.token, toApiId(id));
        replaceTask(mapApiTask(task));
        return true;
      } catch {
        return false;
      }
    }

    const task = tasks.value.find((item) => item.id === id);

    if (!task) {
      return false;
    }

    task.status = "approved";
    task.approvedAt = Date.now();
    return persistLocalSnapshot();
  }

  async function removeTask(id: string) {
    if (isCloudMode()) {
      try {
        await api.deleteTask(authStore.token, toApiId(id));
      } catch {
        return false;
      }
    }

    const index = tasks.value.findIndex((task) => task.id === id);

    if (index < 0) {
      return false;
    }

    tasks.value.splice(index, 1);
    return isCloudMode() || persistLocalSnapshot();
  }

  async function drawQuest(): Promise<DrawQuestResult> {
    if (isCloudMode()) {
      try {
        const quest = await api.drawQuest(authStore.token, {
          pool_id: currentPoolId.value,
          light_only: preferences.lightOnly,
        });
        const mappedQuest = mapApiAcceptedQuest(quest);
        accepted.value.unshift(mappedQuest);
        currentDrawId.value = mappedQuest.id;
        return { status: "created", quest: mappedQuest };
      } catch (error) {
        return getApiErrorMessage(error).includes("没有可抽取的任务")
          ? { status: "empty" }
          : { status: "storage-error", quest: createEmptyQuest() };
      }
    }

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
    return persistLocalSnapshot() ? { status: "created", quest } : { status: "storage-error", quest };
  }

  async function completeQuest(id: string, payload: CompletionPayload) {
    if (isCloudMode()) {
      try {
        const quest = await api.completeQuest(authStore.token, toApiId(id), {
          reflection: payload.reflection,
          photo_name: payload.photoName,
          photo_data_url: payload.photoDataUrl,
        });
        replaceAcceptedQuest(mapApiAcceptedQuest(quest));
        if (currentDrawId.value === id) {
          currentDrawId.value = todoQuests.value[0]?.id || "";
        }
        return true;
      } catch {
        return false;
      }
    }

    const quest = accepted.value.find((item) => item.id === id);

    if (!quest) {
      return false;
    }

    quest.status = "done";
    quest.completedAt = quest.completedAt || Date.now();
    quest.reflection = payload.reflection.trim();
    quest.photoName = payload.photoName;
    quest.photoDataUrl = payload.photoDataUrl;
    return persistLocalSnapshot();
  }

  async function deleteAcceptedQuest(id: string) {
    if (isCloudMode()) {
      try {
        await api.deleteAcceptedQuest(authStore.token, toApiId(id));
      } catch {
        return false;
      }
    }

    const index = accepted.value.findIndex((quest) => quest.id === id);

    if (index < 0) {
      return false;
    }

    accepted.value.splice(index, 1);

    if (currentDrawId.value === id) {
      currentDrawId.value = todoQuests.value[0]?.id || "";
    }

    return isCloudMode() || persistLocalSnapshot();
  }

  async function returnQuest(id: string) {
    if (isCloudMode()) {
      try {
        await api.returnQuest(authStore.token, toApiId(id));
      } catch {
        return false;
      }
    }

    const index = accepted.value.findIndex((quest) => quest.id === id && quest.status === "todo");

    if (index < 0) {
      return false;
    }

    accepted.value.splice(index, 1);

    if (currentDrawId.value === id) {
      currentDrawId.value = todoQuests.value[0]?.id || "";
    }

    return isCloudMode() || persistLocalSnapshot();
  }

  function setLightOnly(value: boolean) {
    preferences.lightOnly = value;
    return persistPreferences();
  }

  function setDrawAnimation(value: boolean) {
    preferences.drawAnimation = value;
    return persistPreferences();
  }

  function setCurrentPool(poolId: string) {
    if (!pools.value.some((pool) => pool.id === poolId)) {
      return false;
    }

    preferences.selectedPoolId = poolId;
    currentDrawId.value = todoQuests.value[0]?.id || "";
    return persistPreferences();
  }

  function updateUserProfile(nextUser: UserProfile) {
    user.name = nextUser.name.trim() || "地球旅人";
    user.handle = nextUser.handle.trim() || "EOJ-2049";
    return persistLocalSnapshot();
  }

  function clearLocalProgress() {
    clearQuestSnapshot();
    localStorage.removeItem(PREFERENCES_KEY);
    applySnapshot(createInitialSnapshot());
    return persistLocalSnapshot();
  }

  function clearData() {
    applySnapshot(loadQuestSnapshot());
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
    return persistLocalSnapshot();
  }

  function applySnapshot(snapshot: QuestStoreSnapshot) {
    pools.value = snapshot.pools;
    tasks.value = snapshot.tasks;
    accepted.value = snapshot.accepted;
    Object.assign(preferences, snapshot.preferences, loadSavedPreferences());
    Object.assign(user, snapshot.user);
    currentDrawId.value = snapshot.currentDrawId;
  }

  function persistLocalSnapshot() {
    return saveQuestSnapshot(getSnapshot());
  }

  function persistPreferences() {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...preferences }));
    } catch {
      return false;
    }

    return isCloudMode() || persistLocalSnapshot();
  }

  function isCloudMode() {
    return Boolean(authStore.token && authStore.user);
  }

  function hasSameTask(text: string) {
    const normalizedText = normalizeTaskText(text);
    return tasks.value.some((task) => normalizeTaskText(task.text) === normalizedText);
  }

  function createDraftTask(text: string, payload: PublishQuestPayload): QuestTask {
    return {
      id: uid("task"),
      poolId: currentPoolId.value,
      text,
      category: payload.category,
      intensity: payload.intensity,
      status: "pending",
      source: "用户发布",
      createdAt: Date.now(),
    };
  }

  function replaceTask(task: QuestTask) {
    const index = tasks.value.findIndex((item) => item.id === task.id);

    if (index >= 0) {
      tasks.value[index] = task;
      return;
    }

    tasks.value.unshift(task);
  }

  function replaceAcceptedQuest(quest: AcceptedQuest) {
    const index = accepted.value.findIndex((item) => item.id === quest.id);

    if (index >= 0) {
      accepted.value[index] = quest;
      return;
    }

    accepted.value.unshift(quest);
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
    syncFromServer,
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
    clearData,
    getSnapshot,
    importSnapshot,
  };
});

function mapApiTask(task: ApiTask): QuestTask {
  return {
    id: String(task.id),
    poolId: task.pool_id || "public",
    text: task.text,
    category: task.category,
    intensity: toQuestIntensity(task.intensity),
    status: task.status,
    source: task.source,
    createdAt: toTimestamp(task.created_at) || Date.now(),
    approvedAt: toTimestamp(task.approved_at) || undefined,
  };
}

function mapApiAcceptedQuest(quest: ApiAcceptedQuest): AcceptedQuest {
  return {
    id: String(quest.id),
    poolId: quest.pool_id || "public",
    taskId: String(quest.task_id),
    text: quest.text,
    category: quest.category,
    source: quest.source,
    status: quest.status,
    acceptedAt: toTimestamp(quest.accepted_at) || Date.now(),
    completedAt: toTimestamp(quest.completed_at),
    reflection: quest.reflection || "",
    photoName: quest.photo_name || "",
    photoDataUrl: quest.photo_data_url || "",
  };
}

function toQuestIntensity(value: string): QuestIntensity {
  return value === "normal" ? "normal" : "light";
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toApiId(id: string) {
  const value = Number(id);

  if (!Number.isFinite(value)) {
    throw new Error("Invalid server id");
  }

  return value;
}

function createEmptyQuest(): AcceptedQuest {
  return {
    id: "",
    poolId: "public",
    taskId: "",
    text: "",
    category: "",
    source: "",
    status: "todo",
    acceptedAt: Date.now(),
    completedAt: null,
    reflection: "",
    photoName: "",
    photoDataUrl: "",
  };
}

function loadSavedPreferences(): Partial<QuestPreferences> {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null") as Partial<QuestPreferences> | null;

    if (!saved || typeof saved !== "object") {
      return {};
    }

    return saved;
  } catch {
    return {};
  }
}

function getApiErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function uid(prefix: string) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTaskText(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
