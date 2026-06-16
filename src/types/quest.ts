export type QuestApprovalStatus = "approved" | "pending";
export type QuestIntensity = "light" | "normal";
export type AcceptedQuestStatus = "todo" | "done";
export type QuestPoolKind = "public" | "private";

export interface QuestPool {
  id: string;
  name: string;
  description: string;
  kind: QuestPoolKind;
  createdAt: number;
}

export interface QuestTask {
  id: string;
  poolId: string;
  text: string;
  category: string;
  intensity: QuestIntensity;
  status: QuestApprovalStatus;
  source: string;
  createdAt: number;
  approvedAt?: number;
}

export interface AcceptedQuest {
  id: string;
  poolId: string;
  taskId: string;
  text: string;
  category: string;
  source: string;
  status: AcceptedQuestStatus;
  acceptedAt: number;
  completedAt: number | null;
  reflection: string;
  photoName: string;
  photoDataUrl?: string;
}

export interface QuestPreferences {
  lightOnly: boolean;
  selectedPoolId: string;
}

export interface UserProfile {
  name: string;
  handle: string;
}

export interface CompletionPayload {
  reflection: string;
  photoName: string;
  photoDataUrl: string;
}

export interface PublishQuestPayload {
  text: string;
  category: string;
  intensity: QuestIntensity;
}

export type PublishQuestResult =
  | {
      status: "empty";
    }
  | {
      status: "duplicate";
    }
  | {
      status: "created";
      task: QuestTask;
    }
  | {
      status: "storage-error";
      task: QuestTask;
    };

export type DrawQuestResult =
  | {
      status: "empty";
    }
  | {
      status: "created";
      quest: AcceptedQuest;
    }
  | {
      status: "storage-error";
      quest: AcceptedQuest;
    };
