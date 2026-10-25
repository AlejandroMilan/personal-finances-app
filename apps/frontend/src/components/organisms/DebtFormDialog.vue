<script setup lang="ts">
import { ref, watch } from 'vue';
import type {
  CreateDebtPayload,
  Debt,
  DebtPaymentMode,
  UpdateDebtPayload,
} from '../../types/debt';

const props = defineProps<{
  modelValue: boolean;
  debt: Debt | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [payload: CreateDebtPayload | UpdateDebtPayload];
}>();

const paymentModes: { title: string; value: DebtPaymentMode }[] = [
  { title: 'Descontar sólo el capital', value: 'capital' },
  { title: 'Descontar el monto completo', value: 'total' },
];

const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const name = ref('');
const totalAmount = ref('');
const revolving = ref(false);
const annualInterestRate = ref('');
const paymentMode = ref<DebtPaymentMode>('capital');
const saving = ref(false);

const nameRules = [(value: string) => !!value.trim() || 'El nombre es obligatorio'];
const amountRules = [
  (value: string) =>
    (value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) ||
    'Indica un adeudo válido (0 o mayor)',
];
const rateRules = [
  (value: string) =>
    value === '' ||
    (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100) ||
    'La tasa debe estar entre 0 y 100',
];

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    name.value = props.debt?.name ?? '';
    totalAmount.value = props.debt ? String(props.debt.totalAmount) : '';
    revolving.value = props.debt?.revolving ?? false;
    annualInterestRate.value =
      props.debt?.annualInterestRate === null || props.debt?.annualInterestRate === undefined
        ? ''
        : String(props.debt.annualInterestRate);
    paymentMode.value = props.debt?.paymentMode ?? 'capital';
  },
);

async function save(): Promise<void> {
  const result = form.value ? await form.value.validate() : { valid: true };
  if (!result.valid) return;

  saving.value = true;
  try {
    emit('save', {
      name: name.value.trim(),
      totalAmount: Number(totalAmount.value),
      revolving: revolving.value,
      annualInterestRate: annualInterestRate.value === '' ? null : Number(annualInterestRate.value),
      paymentMode: paymentMode.value,
    });
  } finally {
    saving.value = false;
  }
}

function close(): void {
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card color="surface" class="pa-6">
      <v-card-title class="text-h5 font-weight-bold pa-0 pb-4">
        {{ debt ? 'Editar deuda' : 'Nueva deuda' }}
      </v-card-title>

      <v-form ref="form" @submit.prevent="save">
        <v-text-field
          v-model="name"
          label="Nombre"
          :rules="nameRules"
          prepend-icon="mdi-hand-coin"
          data-test="debt-name-input"
        />
        <v-text-field
          v-model="totalAmount"
          label="Adeudo total"
          type="number"
          step="0.01"
          prepend-icon="mdi-cash"
          :rules="amountRules"
          :hint="debt ? 'Cambiarlo registra un ajuste en el log' : ''"
          persistent-hint
          data-test="debt-total-input"
        />
        <v-switch v-model="revolving" label="Es revolvente" color="primary" data-test="debt-revolving" />
        <v-text-field
          v-model="annualInterestRate"
          label="Interés anual (opcional, %)"
          type="number"
          step="0.01"
          prepend-icon="mdi-percent"
          :rules="rateRules"
          data-test="debt-rate-input"
        />
        <v-select
          v-model="paymentMode"
          :items="paymentModes"
          item-title="title"
          item-value="value"
          label="Al registrar un pago"
          prepend-icon="mdi-calculator-variant"
          data-test="debt-mode-select"
        />
      </v-form>

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" class="mr-2" @click="close">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" data-test="save-debt" @click="save">
          Guardar
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
