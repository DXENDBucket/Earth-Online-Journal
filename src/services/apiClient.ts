const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);
const isLocalHost =
  typeof window !== 'undefined' && localHostnames.has(window.location.hostname);
const BASE_URL = configuredBaseUrl || (isLocalHost ? 'http://127.0.0.1:8000' : '');

const CLOUD_API_UNCONFIGURED_MESSAGE =
  '云端服务还没有配置。GitHub Pages 只能托管前端，注册/登录需要先部署后端，并设置 VITE_API_BASE_URL。';
const CLOUD_API_UNREACHABLE_MESSAGE =
  '无法连接云端服务，请确认后端已经启动或部署，并且 VITE_API_BASE_URL 地址可访问。';

function apiUrl(path: string) {
  if (!BASE_URL) {
    throw new Error(CLOUD_API_UNCONFIGURED_MESSAGE);
  }

  return `${BASE_URL}${path}`;
}

async function fetchApi(path: string, init?: RequestInit) {
  try {
    return await fetch(apiUrl(path), init);
  } catch {
    throw new Error(BASE_URL ? CLOUD_API_UNREACHABLE_MESSAGE : CLOUD_API_UNCONFIGURED_MESSAGE);
  }
}

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const err = (await res.json()) as { detail?: unknown };
    return typeof err.detail === 'string' ? err.detail : fallback;
  } catch {
    return fallback;
  }
}

// 用户相关类型
export interface User {
  id: number;
  username: string;
  display_name: string;
  handle: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// 任务相关类型（与前端 types/quest.ts 对应）
export interface Task {
  id: number;
  user_id: number;
  pool_id: string;
  text: string;
  category: string;
  intensity: string;
  source: string;
  status: 'pending' | 'approved';
  created_at: string;
  approved_at: string | null;
}

export interface AcceptedQuest {
  id: number;
  user_id: number;
  task_id: number;
  pool_id: string;
  text: string;
  category: string;
  source: string;
  status: 'todo' | 'done';
  accepted_at: string;
  completed_at: string | null;
  reflection: string;
  photo_name: string;
  photo_data_url: string;
}

export interface SyncResponse {
  tasks: Task[];
  accepted: AcceptedQuest[];
}

// ---- 用户认证 ----
export async function register(username: string, password: string): Promise<User> {
  const res = await fetchApi('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '注册失败'));
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await fetchApi('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '登录失败'));
  }
  return res.json();
}

export async function getMe(token: string): Promise<User> {
  const res = await fetchApi('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '获取用户信息失败'));
  }
  return res.json();
}

export async function updateMe(token: string, data: { display_name?: string }): Promise<User> {
  const res = await fetchApi('/api/users/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '更新资料失败'));
  }
  return res.json();
}

// ---- 任务同步 ----
export async function sync(token: string): Promise<SyncResponse> {
  const res = await fetchApi('/api/quests/sync', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '同步失败'));
  }
  return res.json();
}

// ---- 发布任务 ----
export async function publishTask(token: string, data: { text: string; category: string; intensity: string; pool_id: string }): Promise<Task> {
  const res = await fetchApi('/api/quests/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '发布失败'));
  }
  return res.json();
}

// ---- 批准任务 ----
export async function approveTask(token: string, taskId: number): Promise<Task> {
  const res = await fetchApi(`/api/quests/approve/${taskId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '批准失败'));
  }
  return res.json();
}

// ---- 删除任务（撤回） ----
export async function deleteTask(token: string, taskId: number): Promise<void> {
  const res = await fetchApi(`/api/quests/task/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '撤回失败'));
  }
}

// ---- 抽取任务 ----
export async function drawQuest(
  token: string,
  params: { pool_id: string; light_only: boolean },
): Promise<AcceptedQuest> {
  const query = new URLSearchParams({
    pool_id: params.pool_id,
    light_only: String(params.light_only),
  });
  const res = await fetchApi(`/api/quests/draw?${query.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '抽取失败'));
  }
  return res.json();
}

// ---- 完成任务 ----
export async function completeQuest(
  token: string,
  questId: number,
  payload: { reflection: string; photo_name: string; photo_data_url: string }
): Promise<AcceptedQuest> {
  const res = await fetchApi(`/api/quests/complete/${questId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '完成失败'));
  }
  return res.json();
}

// ---- 放回卡池 ----
export async function returnQuest(token: string, questId: number): Promise<void> {
  const res = await fetchApi(`/api/quests/return/${questId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '放回失败'));
  }
}

// ---- 删除已完成记录 ----
export async function deleteAcceptedQuest(token: string, questId: number): Promise<void> {
  const res = await fetchApi(`/api/quests/quest/${questId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, '删除失败'));
  }
}
