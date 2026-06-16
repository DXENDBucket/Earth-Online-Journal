import { mount, flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/app/App.vue";
import { router } from "@/app/router";

describe("App smoke flow", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    installDialogPolyfill();
    await router.replace({ name: "home" });
  });

  it("lets a user draw and complete a quest from the home page", async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await router.isReady();
    await flushPromises();

    expect(wrapper.text()).toContain("发布/接取");

    await wrapper.get("button.draw-button").trigger("click");
    await flushPromises();

    expect(wrapper.get(".quest-card").text()).toContain("未完成");
    expect(wrapper.text()).toContain("已接取一张新的现实任务。");

    const completeButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("确认完成"));

    expect(completeButton).toBeTruthy();
    await completeButton?.trigger("click");
    await flushPromises();

    expect(wrapper.get("dialog").attributes("open")).toBeDefined();

    await wrapper.get("dialog textarea").setValue("今天认真观察了一件小事。");
    await wrapper.get("dialog form").trigger("submit");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("journal");
    expect(router.currentRoute.value.query.filter).toBe("done");
    expect(wrapper.text()).toContain("完成记录已保存。");
    expect(wrapper.text()).toContain("今天认真观察了一件小事。");

    wrapper.unmount();
  });
});

function installDialogPolyfill() {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
    this.setAttribute("open", "");
  };

  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
