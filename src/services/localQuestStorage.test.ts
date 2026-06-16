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
});
