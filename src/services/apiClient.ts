const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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
  const res = await fetch(`${BASE_URL}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '注册失败');
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '登录失败');
  }
  return res.json();
}

export async function getMe(token: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '获取用户信息失败');
  }
  return res.json();
}

export async function updateMe(token: string, data: { display_name?: string }): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '更新资料失败');
  }
  return res.json();
}

// ---- 任务同步 ----
export async function sync(token: string): Promise<SyncResponse> {
  const res = await fetch(`${BASE_URL}/api/quests/sync`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '同步失败');
  }
  return res.json();
}

// ---- 发布任务 ----
export async function publishTask(token: string, data: { text: string; category: string; intensity: string; pool_id: string }): Promise<Task> {
  const res = await fetch(`${BASE_URL}/api/quests/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '发布失败');
  }
  return res.json();
}

// ---- 批准任务 ----
export async function approveTask(token: string, taskId: number): Promise<Task> {
  const res = await fetch(`${BASE_URL}/api/quests/approve/${taskId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '批准失败');
  }
  return res.json();
}

// ---- 删除任务（撤回） ----
export async function deleteTask(token: string, taskId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/quests/task/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '撤回失败');
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
  const res = await fetch(`${BASE_URL}/api/quests/draw?${query.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '抽取失败');
  }
  return res.json();
}

// ---- 完成任务 ----
export async function completeQuest(
  token: string,
  questId: number,
  payload: { reflection: string; photo_name: string; photo_data_url: string }
): Promise<AcceptedQuest> {
  const res = await fetch(`${BASE_URL}/api/quests/complete/${questId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '完成失败');
  }
  return res.json();
}

// ---- 放回卡池 ----
export async function returnQuest(token: string, questId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/quests/return/${questId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '放回失败');
  }
}

// ---- 删除已完成记录 ----
export async function deleteAcceptedQuest(token: string, questId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/quests/quest/${questId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '删除失败');
  }
}
