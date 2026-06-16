import { seedTasks } from "@/data/seedTasks";
import type {
  AcceptedQuest,
  QuestPreferences,
  QuestPool,
  QuestTask,
  UserProfile,
} from "@/types/quest";

const STORE_KEY = "earth-online-journal-v1";
export const PUBLIC_POOL_ID = "public";
export const PRIVATE_POOL_ID = "private";
export const QUEST_STORAGE_ERROR_EVENT = "earth-online-storage-error";
export type QuestStorageErrorReason = "full" | "unavailable";

export interface QuestStoreSnapshot {
  pools: QuestPool[];
  tasks: QuestTask[];
  accepted: AcceptedQuest[];
  preferences: QuestPreferences;
  currentDrawId: string;
  user: UserProfile;
}

export function createInitialSnapshot(): QuestStoreSnapshot {
  return {
    pools: createDefaultPools(),
    tasks: seedTasks.map((task) => ({ ...task, poolId: PUBLIC_POOL_ID })),
    accepted: [],
    preferences: {
      lightOnly: false,
      selectedPoolId: PUBLIC_POOL_ID,
    },
    currentDrawId: "",
    user: {
      name: "地球旅人",
      handle: "EOJ-2049",
    },
  };
}

export function loadQuestSnapshot(): QuestStoreSnapshot {
  const fresh = createInitialSnapshot();

  if (!canUseStorage()) {
    return fresh;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null") as Partial<QuestStoreSnapshot> | null;

    if (!saved || !Array.isArray(saved.tasks) || !Array.isArray(saved.accepted)) {
      return fresh;
    }

    return normalizeQuestSnapshot(saved);
  } catch {
    return fresh;
  }
}

export function normalizeQuestSnapshot(snapshot: Partial<QuestStoreSnapshot> | null | undefined): QuestStoreSnapshot {
  const fresh = createInitialSnapshot();

  if (!snapshot || !Array.isArray(snapshot.tasks) || !Array.isArray(snapshot.accepted)) {
    return fresh;
  }

  const pools = mergePools(snapshot.pools);
  const poolIds = new Set(pools.map((pool) => pool.id));
  const savedTaskIds = new Set(snapshot.tasks.map((task) => task.id));
  const missingSeeds = fresh.tasks.filter((task) => !savedTaskIds.has(task.id));
  const tasks = [...missingSeeds, ...snapshot.tasks].map((task) => normalizeTask(task, poolIds));
  const taskPoolById = new Map(tasks.map((task) => [task.id, task.poolId]));
  const accepted = snapshot.accepted.map((quest) => normalizeAcceptedQuest(quest, taskPoolById, poolIds));
  const selectedPoolId = poolIds.has(snapshot.preferences?.selectedPoolId || "")
    ? snapshot.preferences?.selectedPoolId || PUBLIC_POOL_ID
    : PUBLIC_POOL_ID;

  return {
    pools,
    tasks,
    accepted,
    preferences: {
      ...fresh.preferences,
      ...(snapshot.preferences || {}),
      selectedPoolId,
    },
    currentDrawId: typeof snapshot.currentDrawId === "string" ? snapshot.currentDrawId : "",
    user: {
      ...fresh.user,
      ...(snapshot.user || {}),
    },
  };
}

export function saveQuestSnapshot(snapshot: QuestStoreSnapshot) {
  if (!canUseStorage()) {
    emitStorageError("unavailable");
    return false;
  }

  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
    return true;
  } catch (error) {
    emitStorageError(isQuotaError(error) ? "full" : "unavailable");
    return false;
  }
}

export function clearQuestSnapshot() {
  if (!canUseStorage()) {
    emitStorageError("unavailable");
    return false;
  }

  try {
    localStorage.removeItem(STORE_KEY);
    return true;
  } catch {
    emitStorageError("unavailable");
    return false;
  }
}

function canUseStorage() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function createDefaultPools(): QuestPool[] {
  return [
    {
      id: PUBLIC_POOL_ID,
      name: "公共池",
      description: "默认任务池，里面放着现在这批基础任务卡。",
      kind: "public",
      createdAt: 0,
    },
    {
      id: PRIVATE_POOL_ID,
      name: "私人池",
      description: "只放你自己准备的小任务，初始没有内容。",
      kind: "private",
      createdAt: 0,
    },
  ];
}

function mergePools(savedPools: QuestPool[] | undefined) {
  const poolsById = new Map(createDefaultPools().map((pool) => [pool.id, pool]));

  if (Array.isArray(savedPools)) {
    savedPools.forEach((pool) => {
      if (!pool?.id || !pool.name) {
        return;
      }

      poolsById.set(pool.id, {
        id: pool.id,
        name: pool.name,
        description: pool.description || "",
        kind: pool.kind === "private" ? "private" : "public",
        createdAt: pool.createdAt || Date.now(),
      });
    });
  }

  return [...poolsById.values()];
}

function normalizeTask(task: QuestTask, poolIds: Set<string>): QuestTask {
  const poolId = poolIds.has(task.poolId) ? task.poolId : PUBLIC_POOL_ID;

  return {
    ...task,
    poolId,
  };
}

function normalizeAcceptedQuest(
  quest: AcceptedQuest,
  taskPoolById: Map<string, string>,
  poolIds: Set<string>,
): AcceptedQuest {
  const fallbackPoolId = taskPoolById.get(quest.taskId) || PUBLIC_POOL_ID;
  const poolId = poolIds.has(quest.poolId) ? quest.poolId : fallbackPoolId;

  return {
    ...quest,
    poolId,
  };
}

function emitStorageError(reason: QuestStorageErrorReason) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(QUEST_STORAGE_ERROR_EVENT, {
      detail: { reason },
    }),
  );
}

function isQuotaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const storageError = error as { code?: number; name?: string };
  return (
    storageError.name === "QuotaExceededError" ||
    storageError.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    storageError.code === 22 ||
    storageError.code === 1014
  );
}
