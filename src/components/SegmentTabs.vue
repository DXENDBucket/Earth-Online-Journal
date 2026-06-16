<template>
  <div class="segmented" role="tablist" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      class="segment-button"
      :class="{ 'is-active': modelValue === option.value }"
      type="button"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface SegmentOption {
  value: string;
  label: string;
}

defineProps<{
  label: string;
  modelValue: string;
  options: SegmentOption[];
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>
