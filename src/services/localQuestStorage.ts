import { seedTasks } from "@/data/seedTasks";
import type {
  AcceptedQuest,
  QuestPreferences,
  QuestTask,
  UserProfile,
} from "@/types/quest";

const STORE_KEY = "earth-online-journal-v1";

export interface QuestStoreSnapshot {
  tasks: QuestTask[];
  accepted: AcceptedQuest[];
  preferences: QuestPreferences;
  currentDrawId: string;
  user: UserProfile;
}

export function createInitialSnapshot(): QuestStoreSnapshot {
  return {
    tasks: seedTasks.map((task) => ({ ...task })),
    accepted: [],
    preferences: {
      lightOnly: false,
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

    const savedTaskIds = new Set(saved.tasks.map((task) => task.id));
    const missingSeeds = fresh.tasks.filter((task) => !savedTaskIds.has(task.id));

    return {
      ...fresh,
      ...saved,
      tasks: [...missingSeeds, ...saved.tasks],
      accepted: saved.accepted,
      preferences: {
        ...fresh.preferences,
        ...(saved.preferences || {}),
      },
      user: {
        ...fresh.user,
        ...(saved.user || {}),
      },
    };
  } catch {
    return fresh;
  }
}

export function saveQuestSnapshot(snapshot: QuestStoreSnapshot) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
}

export function clearQuestSnapshot() {
  if (canUseStorage()) {
    localStorage.removeItem(STORE_KEY);
  }
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
