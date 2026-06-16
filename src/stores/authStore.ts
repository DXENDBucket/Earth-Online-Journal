import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/services/apiClient';
import type { User } from '@/services/apiClient';
import { useQuestStore } from './questStore';

const TOKEN_KEY = 'eoj_token';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '');
  const user = ref<User | null>(null);

  async function login(username: string, password: string) {
    const result = await api.login(username, password);
    token.value = result.access_token;
    localStorage.setItem(TOKEN_KEY, token.value);
    await fetchProfile();
    const questStore = useQuestStore();
    await questStore.syncFromServer();
  }

  async function register(username: string, password: string) {
    await api.register(username, password);
    await login(username, password);
  }

  async function fetchProfile() {
    if (!token.value) return;
    user.value = await api.getMe(token.value);
  }

  async function updateProfile(display_name: string) {
    if (!token.value) throw new Error('未登录');
    user.value = await api.updateMe(token.value, { display_name });
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    // 清空任务数据（可选，让用户重新登录时重新加载）
    const questStore = useQuestStore();
    questStore.clearData();
  }

  function isLoggedIn() {
    return !!token.value && !!user.value;
  }

  // 自动登录尝试
  if (token.value) {
    fetchProfile()
      .then(() => {
        const questStore = useQuestStore();
        questStore.syncFromServer();
      })
      .catch(() => {
        logout();
      });
  }

  return {
    token,
    user,
    login,
    register,
    fetchProfile,
    updateProfile,
    logout,
    isLoggedIn,
  };
});