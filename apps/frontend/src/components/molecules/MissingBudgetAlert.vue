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
        <div class="text-body-1 font-weight-medium">Falta el presupuesto del mes</div>
        <div class="text-body-2 text-medium-emphasis">
          No has creado un presupuesto para {{ month }}.
        </div>
      </div>
      <v-btn
        color="primary"
        variant="flat"
        to="/budgets"
        data-test="missing-budget-link"
      >
        Crear presupuesto
      </v-btn>
    </div>
  </v-alert>
</template>
