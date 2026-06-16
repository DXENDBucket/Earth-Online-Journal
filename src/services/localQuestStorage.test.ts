import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createInitialSnapshot,
  loadQuestSnapshot,
  QUEST_STORAGE_ERROR_EVENT,
  saveQuestSnapshot,
} from "@/services/localQuestStorage";

describe("localQuestStorage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("saves and loads the local quest snapshot", () => {
    const snapshot = createInitialSnapshot();
    snapshot.accepted = [
      {
        id: "accepted-test",
        poolId: "public",
        taskId: "task-test",
        text: "Write down one good thing from today",
        category: "记录",
        source: "测试",
        status: "done",
        acceptedAt: 1,
        completedAt: 2,
        reflection: "A quiet moment",
        photoName: "",
        photoDataUrl: "",
      },
    ];

    expect(saveQuestSnapshot(snapshot)).toBe(true);
    expect(loadQuestSnapshot().accepted).toEqual(snapshot.accepted);
  });

  it("reports a full storage device without throwing", () => {
    const listener = vi.fn();
    window.addEventListener(QUEST_STORAGE_ERROR_EVENT, listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });

    expect(saveQuestSnapshot(createInitialSnapshot())).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      reason: "full",
    });

    window.removeEventListener(QUEST_STORAGE_ERROR_EVENT, listener);
  });

  it("migrates older snapshots into the public pool", () => {
    localStorage.setItem(
      "earth-online-journal-v1",
      JSON.stringify({
        tasks: [
          {
            id: "old-task",
            text: "An older task",
            category: "记录",
            intensity: "light",
            status: "approved",
            source: "旧记录",
            createdAt: 1,
          },
        ],
        accepted: [
          {
            id: "old-accepted",
            taskId: "old-task",
            text: "An older task",
            category: "记录",
            source: "旧记录",
            status: "todo",
            acceptedAt: 2,
            completedAt: null,
            reflection: "",
            photoName: "",
            photoDataUrl: "",
          },
        ],
        preferences: {
          lightOnly: false,
        },
        currentDrawId: "",
        user: {
          name: "Old User",
          handle: "OLD",
        },
      }),
    );

    const loaded = loadQuestSnapshot();

    expect(loaded.pools.map((pool) => pool.id)).toEqual(["public", "private"]);
    expect(loaded.preferences.selectedPoolId).toBe("public");
    expect(loaded.preferences.drawAnimation).toBe(true);
    expect(loaded.tasks.find((task) => task.id === "old-task")?.poolId).toBe("public");
    expect(loaded.accepted[0]?.poolId).toBe("public");
  });
});
