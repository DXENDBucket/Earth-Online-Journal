import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QUEST_STORAGE_ERROR_EVENT } from "@/services/localQuestStorage";
import { useQuestStore } from "@/stores/questStore";

describe("questStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("publishes a task once and keeps duplicates out", async () => {
    const store = useQuestStore();

    const created = await store.publishTask({
      text: "Notice a detail on your way home",
      category: "观察",
      intensity: "light",
    });
    const duplicate = await store.publishTask({
      text: "  notice   a detail on your way home  ",
      category: "观察",
      intensity: "light",
    });

    expect(created.status).toBe("created");
    expect(duplicate.status).toBe("duplicate");
    expect(store.pendingTasks).toHaveLength(1);
  });

  it("draws a quest and saves a completion record", async () => {
    const store = useQuestStore();
    const draw = await store.drawQuest();

    expect(draw.status).toBe("created");

    if (draw.status !== "created") {
      throw new Error("Expected a quest to be drawn from the seed pool.");
    }

    expect(store.todoQuests).toHaveLength(1);
    expect(await store.completeQuest(draw.quest.id, {
      reflection: "  I noticed the evening light.  ",
      photoName: "light.jpg",
      photoDataUrl: "data:image/jpeg;base64,test",
    })).toBe(true);
    expect(store.todoQuests).toHaveLength(0);
    expect(store.doneQuests).toHaveLength(1);
    expect(store.doneQuests[0]?.reflection).toBe("I noticed the evening light.");
    expect(store.doneQuests[0]?.photoName).toBe("light.jpg");
  });

  it("switches between the public pool and an empty private pool", async () => {
    const store = useQuestStore();

    expect(store.currentPool.name).toBe("公共池");
    expect(store.approvedTasks.length).toBeGreaterThan(0);
    expect(store.setCurrentPool("private")).toBe(true);
    expect(store.currentPool.name).toBe("私人池");
    expect(store.approvedTasks).toHaveLength(0);
    expect((await store.drawQuest()).status).toBe("empty");

    const created = await store.publishTask({
      text: "Write a secret mission for myself",
      category: "记录",
      intensity: "light",
    });

    expect(created.status).toBe("created");
    expect(created.status === "created" ? created.task.poolId : "").toBe("private");
    expect(store.pendingTasks).toHaveLength(1);
  });

  it("saves the draw animation preference", () => {
    const store = useQuestStore();

    expect(store.preferences.drawAnimation).toBe(true);
    expect(store.setDrawAnimation(false)).toBe(true);

    setActivePinia(createPinia());
    const reloaded = useQuestStore();

    expect(reloaded.preferences.drawAnimation).toBe(false);
  });

  it("returns storage-error when a change cannot be saved", async () => {
    const listener = vi.fn();
    window.addEventListener(QUEST_STORAGE_ERROR_EVENT, listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });

    const store = useQuestStore();
    const result = await store.publishTask({
      text: "Walk a different street for one block",
      category: "行动",
      intensity: "light",
    });

    expect(result.status).toBe("storage-error");
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      reason: "full",
    });

    window.removeEventListener(QUEST_STORAGE_ERROR_EVENT, listener);
  });
});
