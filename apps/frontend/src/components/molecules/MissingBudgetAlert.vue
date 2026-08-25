<script setup lang="ts">
defineProps<{
  month: string;
}>();
</script>

<template>
  <v-alert
    type="warning"
    variant="tonal"
    border="start"
    class="mb-4"
    data-test="missing-budget-alert"
  >
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 w-100">
      <div>
        <div class="text-body-1 font-weight-medium">Monthly budget is missing</div>
        <div class="text-body-2 text-medium-emphasis">
          You haven't created a budget for {{ month }}.
        </div>
      </div>
      <v-btn
        color="primary"
        variant="flat"
        to="/budgets"
        data-test="missing-budget-link"
      >
        Create budget
      </v-btn>
    </div>
  </v-alert>
</template>
