<template>
  <section class="screen">
    <div class="screen-title">
      <p class="eyebrow">我的</p>
      <h1>我的</h1>
      <p>查看任务记录、整理个人资料，也可以备份这台设备上的记录。</p>
    </div>

    <SegmentTabs
      :model-value="section"
      label="我的内容"
      :options="sectionOptions"
      @update:model-value="setSection"
    />

    <JournalPage v-if="section === 'journal'" embedded />
    <AccountPage v-else embedded />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import SegmentTabs from "@/components/SegmentTabs.vue";
import AccountPage from "@/pages/AccountPage.vue";
import JournalPage from "@/pages/JournalPage.vue";

type MySection = "journal" | "profile";

const route = useRoute();
const router = useRouter();
const sectionOptions = [
  { value: "journal", label: "任务册" },
  { value: "profile", label: "资料" },
];
const section = computed<MySection>(() => (route.query.tab === "profile" ? "profile" : "journal"));

function setSection(value: string) {
  router.replace({
    name: "me",
    query: {
      ...route.query,
      tab: value === "profile" ? "profile" : undefined,
    },
  });
}
</script>
