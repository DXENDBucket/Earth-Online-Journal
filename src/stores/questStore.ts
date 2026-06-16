import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { useAuthStore } from './authStore';
import * as api from '@/services/apiClient';
import type { Task, AcceptedQuest } from '@/services/apiClient';

export const useQuestStore = defineStore('quests', () => {
  const authStore = useAuthStore();

  const tasks = ref<Task[]>([]);
  const accepted = ref<AcceptedQuest[]>([]);
  const preferences = reactive({
    lightOnly: false,
    drawAnimation: true,
    selectedPoolId: 'public',
  });
  const currentDrawId = ref<number | null>(null);
  const user = reactive({ name: '地球旅人', handle: 'EOJ-2049' });

  const pools = [
    { id: 'public', name: '公共池', description: '默认任务池', kind: 'public' },
    { id: 'private', name: '私人池', description: '只放你自己的小任务', kind: 'private' },
  ];

  const currentPoolId = computed(() => preferences.selectedPoolId);
  const currentPool = computed(() => {
    return pools.find(p => p.id === preferences.selectedPoolId) || pools[0];
  });

  const tasksInCurrentPool = computed(() => tasks.value.filter(t => t.pool_id === currentPoolId.value));
  const acceptedInCurrentPool = computed(() => accepted.value.filter(q => q.pool_id === currentPoolId.value));
  const approvedTasks = computed(() => tasksInCurrentPool.value.filter(t => t.status === 'approved'));
  const pendingTasks = computed(() => tasksInCurrentPool.value.filter(t => t.status === 'pending'));
  const todoQuests = computed(() => acceptedInCurrentPool.value.filter(q => q.status === 'todo'));
  const doneQuests = computed(() => acceptedInCurrentPool.value.filter(q => q.status === 'done'));
  const activeTaskIds = computed(() => new Set(todoQuests.value.map(q => q.task_id)));
  const drawPool = computed(() =>
    approvedTasks.value.filter(t => {
      const matchesPreference = !preferences.lightOnly || t.intensity === 'light';
      return matchesPreference && !activeTaskIds.value.has(t.id);
    })
  );
  const currentDraw = computed(() => {
    if (currentDrawId.value) {
      return accepted.value.find(q => q.id === currentDrawId.value) || null;
    }
    return todoQuests.value[0] || null;
  });
  const userApprovedTasks = computed(() =>
    tasksInCurrentPool.value.filter(t => t.source === '用户发布' && t.status === 'approved')
  );
  const stats = computed(() => ({
    approved: approvedTasks.value.length,
    pending: pendingTasks.value.length,
    todo: todoQuests.value.length,
    done: doneQuests.value.length,
    userApproved: userApprovedTasks.value.length,
  }));

  // ---- 从服务器同步 ----
  async function syncFromServer() {
    if (!authStore.isLoggedIn()) return;
    const data = await api.sync(authStore.token);
    tasks.value = data.tasks;
    accepted.value = data.accepted;
    if (currentDrawId.value && !accepted.value.find(q => q.id === currentDrawId.value)) {
      currentDrawId.value = todoQuests.value[0]?.id || null;
    }
  }

  // ---- 发布任务 ----
  async function publishTask(payload: { text: string; category: string; intensity: string }) {
    const text = payload.text.trim();
    if (!text) return { status: 'empty' };
    try {
      const task = await api.publishTask(authStore.token, {
        text,
        category: payload.category,
        intensity: payload.intensity,
        pool_id: currentPoolId.value,
      });
      tasks.value.unshift(task);
      return { status: 'created', task };
    } catch (err: any) {
      if (err.message?.includes('已经在你的卡池里')) return { status: 'duplicate' };
      return { status: 'storage-error' };
    }
  }

  // ---- 批准任务 ----
  async function approveTask(id: number) {
    const task = await api.approveTask(authStore.token, id);
    const index = tasks.value.findIndex(t => t.id === id);
    if (index >= 0) tasks.value[index] = task;
  }

  // ---- 撤回任务 ----
  async function removeTask(id: number) {
    await api.deleteTask(authStore.token, id);
    tasks.value = tasks.value.filter(t => t.id !== id);
  }

  // ---- 抽取任务 ----
  async function drawQuest() {
    try {
      const quest = await api.drawQuest(authStore.token);
      accepted.value.unshift(quest);
      currentDrawId.value = quest.id;
      return { status: 'created', quest };
    } catch (err: any) {
      if (err.message?.includes('没有可抽取的任务')) return { status: 'empty' };
      return { status: 'storage-error' };
    }
  }

  // ---- 完成任务 ----
  async function completeQuest(id: number, payload: { reflection: string; photoName: string; photoDataUrl: string }) {
    try {
      const quest = await api.completeQuest(authStore.token, id, {
        reflection: payload.reflection,
        photo_name: payload.photoName,
        photo_data_url: payload.photoDataUrl,
      });
      const index = accepted.value.findIndex(q => q.id === id);
      if (index >= 0) accepted.value[index] = quest;
      if (currentDrawId.value === id) currentDrawId.value = todoQuests.value[0]?.id || null;
      return true;
    } catch {
      return false;
    }
  }

  // ---- 放回卡池 ----
  async function returnQuest(id: number) {
    try {
      await api.returnQuest(authStore.token, id);
      accepted.value = accepted.value.filter(q => q.id !== id);
      if (currentDrawId.value === id) currentDrawId.value = todoQuests.value[0]?.id || null;
      return true;
    } catch {
      return false;
    }
  }

  // ---- 删除已完成记录 ----
  async function deleteAcceptedQuest(id: number) {
    try {
      await api.deleteAcceptedQuest(authStore.token, id);
      accepted.value = accepted.value.filter(q => q.id !== id);
      return true;
    } catch {
      return false;
    }
  }

  // ---- 偏好设置 ----
  function setLightOnly(value: boolean) {
    preferences.lightOnly = value;
    localStorage.setItem('eoj_preferences', JSON.stringify({ ...preferences }));
  }
  function setDrawAnimation(value: boolean) {
    preferences.drawAnimation = value;
    localStorage.setItem('eoj_preferences', JSON.stringify({ ...preferences }));
  }
  function setCurrentPool(poolId: string) {
    if (!pools.some(p => p.id === poolId)) return false;
    preferences.selectedPoolId = poolId;
    localStorage.setItem('eoj_preferences', JSON.stringify({ ...preferences }));
    currentDrawId.value = todoQuests.value[0]?.id || null;
    return true;
  }

  // ---- 用户资料（保持接口兼容） ----
  function updateUserProfile(profile: { name: string; handle: string }) {
    // 此函数已废弃，由 authStore 处理，保留空实现防止报错
    return true;
  }

  // ---- 清空本机偏好 ----
  function clearLocalProgress() {
    localStorage.removeItem('eoj_preferences');
    Object.assign(preferences, { lightOnly: false, drawAnimation: true, selectedPoolId: 'public' });
    return true;
  }

  // ---- 导出/导入 ----
  function getSnapshot() {
    return {
      tasks: tasks.value,
      accepted: accepted.value,
      preferences: { ...preferences },
      currentDrawId: String(currentDrawId.value || ''),
      user: { name: authStore.user?.display_name || '', handle: authStore.user?.handle || '' },
    };
  }
  function importSnapshot(snapshot: any) {
    if (snapshot.preferences) {
      Object.assign(preferences, snapshot.preferences);
      localStorage.setItem('eoj_preferences', JSON.stringify(preferences));
    }
  }

  // ---- 加载本地偏好 ----
  const savedPrefs = localStorage.getItem('eoj_preferences');
  if (savedPrefs) {
    try {
      const parsed = JSON.parse(savedPrefs);
      Object.assign(preferences, parsed);
    } catch {}
  }

  return {
    tasks,
    accepted,
    preferences,
    currentDrawId,
    user,
    pools,
    currentPoolId,
    currentPool,
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
    returnQuest,
    deleteAcceptedQuest,
    setLightOnly,
    setDrawAnimation,
    setCurrentPool,
    updateUserProfile,
    clearLocalProgress,
    getSnapshot,
    importSnapshot,
  };
});