<script setup lang="ts">
import type { Debt } from '../../types/debt';
import { formatCurrency } from '../../utils/money';

const props = defineProps<{ debt: Debt }>();

const emit = defineEmits<{
  edit: [debt: Debt];
  remove: [debt: Debt];
}>();

const modeLabel = (mode: Debt['paymentMode']): string =>
  mode === 'total' ? 'Descuenta monto total' : 'Descuenta sólo capital';
</script>

<template>
  <v-card color="surface" class="pa-4" data-test="debt-card">
    <v-card-title class="d-flex align-center justify-space-between pa-0 pb-2">
      <span class="d-flex align-center">
        <v-icon icon="mdi-hand-coin" color="primary" size="20" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold" data-test="debt-name">
          {{ props.debt.name }}
        </span>
      </span>
      <span>
        <v-btn icon="mdi-pencil" variant="text" size="small" data-test="edit-debt" @click="emit('edit', props.debt)" />
        <v-btn
          icon="mdi-delete"
          variant="text"
          size="small"
          color="error"
          data-test="delete-debt"
          @click="emit('remove', props.debt)"
        />
      </span>
    </v-card-title>

    <div class="text-h5 font-weight-bold mb-2" data-test="debt-total">
      {{ formatCurrency(props.debt.totalAmount) }}
    </div>

    <div class="d-flex flex-wrap ga-2">
      <v-chip size="small" variant="tonal" color="primary">
        {{ props.debt.revolving ? 'Revolvente' : 'Simple' }}
      </v-chip>
      <v-chip size="small" variant="tonal" color="secondary" data-test="debt-rate">
        {{
          props.debt.annualInterestRate === null
            ? 'Sin tasa'
            : `${props.debt.annualInterestRate}% anual`
        }}
      </v-chip>
      <v-chip size="small" variant="outlined">{{ modeLabel(props.debt.paymentMode) }}</v-chip>
    </div>
  </v-card>
</template>
