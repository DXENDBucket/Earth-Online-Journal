<template>
  <section class="screen">
    <!-- 如果不是嵌入模式，显示标题 -->
    <div v-if="!props.embedded" class="screen-title">
      <p class="eyebrow">账号</p>
      <h1>{{ authStore.isLoggedIn() ? '我的记录' : '登录 / 注册' }}</h1>
    </div>

    <!-- ===== 未登录：显示登录/注册表单 ===== -->
    <section v-if="!authStore.isLoggedIn()" class="panel">
      <div class="segmented" role="tablist">
        <button
          class="segment-button"
          :class="{ 'is-active': authMode === 'login' }"
          @click="authMode = 'login'"
        >
          登录
        </button>
        <button
          class="segment-button"
          :class="{ 'is-active': authMode === 'register' }"
          @click="authMode = 'register'"
        >
          注册
        </button>
      </div>

      <form class="profile-form" @submit.prevent="handleAuth">
        <label class="field">
          <span>用户名</span>
          <input v-model="authUsername" type="text" required />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="authPassword" type="password" required minlength="4" />
        </label>
        <button class="primary-button" type="submit" :disabled="authLoading">
          {{ authLoading ? '处理中...' : authMode === 'login' ? '登录' : '注册' }}
        </button>
        <p v-if="authError" class="field-hint" style="color: var(--coral);">
          {{ authError }}
        </p>
      </form>
    </section>

    <!-- ===== 已登录：显示个人资料（原有内容） ===== -->
    <template v-else>
      <section class="profile-panel">
        <div class="profile-head">
          <div class="avatar">EO</div>
          <div>
            <h2>{{ authStore.user?.display_name || '地球旅人' }}</h2>
            <p class="hero-line">{{ authStore.user?.handle || 'EOJ-2049' }}</p>
            <p style="font-size: 0.78rem; color: var(--muted);">
              @{{ authStore.user?.username }}
            </p>
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
          <div class="field">
            <span>编号（系统分配）</span>
            <input :value="authStore.user?.handle || '加载中...'" disabled style="background:#f0f2f0; color:#666; cursor:not-allowed;" />
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="primary-button" type="submit" :disabled="saving">
              <Save />
              <span>{{ saving ? '保存中...' : '保存资料' }}</span>
            </button>
            <button class="ghost-button" type="button" @click="authStore.logout()">
              退出登录
            </button>
          </div>
          <p v-if="saveMessage" class="field-hint" :style="{ color: saveSuccess ? 'var(--green)' : 'var(--coral)' }">
            {{ saveMessage }}
          </p>
        </form>
      </section>
    </template>

    <!-- ===== 偏好设置（始终显示） ===== -->
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
        <label class="setting-row">
          <div>
            <strong>抽卡动画</strong>
            <p>接取任务时播放一段简约翻卡效果。</p>
          </div>
          <span class="switch">
            <input v-model="drawAnimationEnabled" type="checkbox" />
            <span></span>
          </span>
        </label>
        <div class="setting-row">
          <div>
            <strong>这台设备上的记录</strong>
            <p>任务和完成记录已同步到云端。此处的备份功能仅备份本地偏好设置。</p>
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
          <span>清空本机偏好</span>
        </button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { Download, RotateCcw, Save, Upload } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useNoticeStore } from '@/stores/noticeStore';
import { useQuestStore } from '@/stores/questStore';
import type { QuestStoreSnapshot } from '@/services/localQuestStorage'; // 保留类型

const props = withDefaults(
  defineProps<{
    embedded?: boolean;
  }>(),
  { embedded: false }
);

const store = useQuestStore();
const authStore = useAuthStore();
const notice = useNoticeStore();

// 登录/注册状态
const authMode = ref<'login' | 'register'>('login');
const authUsername = ref('');
const authPassword = ref('');
const authLoading = ref(false);
const authError = ref('');

// 个人资料
const profileName = ref('');
const saving = ref(false);
const saveMessage = ref('');
const saveSuccess = ref(false);

// 偏好
const lightOnly = computed({
  get: () => store.preferences.lightOnly,
  set: (val) => store.setLightOnly(val),
});
const drawAnimationEnabled = computed({
  get: () => store.preferences.drawAnimation,
  set: (val) => store.setDrawAnimation(val),
});

// 监听用户变化，填充表单
watch(
  () => authStore.user,
  (user) => {
    if (user) {
      profileName.value = user.display_name || '地球旅人';
    }
  },
  { immediate: true }
);

// 登录/注册提交
async function handleAuth() {
  authError.value = '';
  authLoading.value = true;
  try {
    if (authMode.value === 'register') {
      await authStore.register(authUsername.value, authPassword.value);
      notice.showNotice('注册成功，已自动登录。', 'success');
    } else {
      await authStore.login(authUsername.value, authPassword.value);
      notice.showNotice('登录成功。', 'success');
    }
    authUsername.value = '';
    authPassword.value = '';
  } catch (err: any) {
    authError.value = err.message || '操作失败，请重试。';
  } finally {
    authLoading.value = false;
  }
}

// 保存资料
async function saveProfile() {
  saving.value = true;
  saveMessage.value = '';
  saveSuccess.value = false;
  try {
    await authStore.updateProfile(profileName.value);
    saveSuccess.value = true;
    saveMessage.value = '个人资料已保存到服务器。';
    notice.showNotice('个人资料已保存。', 'success');
  } catch (err: any) {
    saveSuccess.value = false;
    saveMessage.value = err.message || '保存失败，请重试。';
  } finally {
    saving.value = false;
  }
}

// ----- 原有工具函数（下载、导入、清空）-----
function clearLocalProgress() {
  if (window.confirm('要清空这台设备上的偏好设置吗？（云端数据不受影响）')) {
    store.clearLocalProgress();
    notice.showNotice('本机偏好已清空。', 'success');
  }
}

function downloadRecords() {
  const content = JSON.stringify(store.getSnapshot(), null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `earth-online-journal-${formatDateForFile(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
  notice.showNotice('记录文件已开始下载。', 'success');
}

function importRecords(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const snapshot = JSON.parse(String(reader.result)) as QuestStoreSnapshot;
      if (!isValidSnapshot(snapshot)) {
        notice.showNotice('这个文件不是可导入的记录。', 'warning');
        return;
      }
      store.importSnapshot(snapshot);
      notice.showNotice('偏好设置已导入。', 'success');
    } catch {
      notice.showNotice('记录文件读取失败。', 'warning');
    } finally {
      input.value = '';
    }
  };
  reader.readAsText(file);
}

function isValidSnapshot(value: any) {
  return value && value.preferences && typeof value.currentDrawId === 'string' && value.user;
}

function formatDateForFile(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date)
    .replaceAll('/', '-');
}
</script>