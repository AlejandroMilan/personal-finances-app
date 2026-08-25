<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildMonthKey, parseMonthKey } from '../../utils/budget';

const props = defineProps<{ modelValue: string }>();

const emit = defineEmits<{ select: [value: string] }>();

const monthLabels = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
    new Date(2000, index, 1),
  ),
);

const selected = computed(() => parseMonthKey(props.modelValue));

const visibleYear = ref(selected.value?.year ?? new Date().getFullYear());

watch(selected, (parts) => {
  if (parts) visibleYear.value = parts.year;
});

function isActive(month: number): boolean {
  const parts = selected.value;
  return parts !== null && parts.year === visibleYear.value && parts.month === month;
}

function shiftYear(offset: number): void {
  visibleYear.value += offset;
}

function pick(month: number): void {
  emit('select', buildMonthKey(visibleYear.value, month));
}
</script>

<template>
  <div data-test="month-year-picker">
    <div class="d-flex align-center justify-space-between mb-2">
      <v-btn
        icon="mdi-chevron-left"
        variant="text"
        size="small"
        aria-label="Previous year"
        data-test="previous-year"
        @click="shiftYear(-1)"
      />
      <span class="text-subtitle-1 font-weight-bold" data-test="visible-year">
        {{ visibleYear }}
      </span>
      <v-btn
        icon="mdi-chevron-right"
        variant="text"
        size="small"
        aria-label="Next year"
        data-test="next-year"
        @click="shiftYear(1)"
      />
    </div>

    <div class="month-grid">
      <v-btn
        v-for="(label, index) in monthLabels"
        :key="label"
        :data-test="`month-option-${index + 1}`"
        :variant="isActive(index + 1) ? 'flat' : 'tonal'"
        :color="isActive(index + 1) ? 'primary' : 'secondary'"
        size="small"
        block
        @click="pick(index + 1)"
      >
        {{ label }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
</style>
