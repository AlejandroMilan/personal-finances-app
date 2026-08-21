<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAccountsStore } from '../../stores/accounts';
import { useCategoriesStore } from '../../stores/categories';
import type {
  ExecuteScheduledTransactionPayload,
  ScheduledTransactionView,
} from '../../types/scheduled-transaction';
import {
  fromDateInputValue,
  suggestedNextDate,
  toDateInputValue,
} from '../../utils/schedule';
import { getDestinationAccountOptions } from '../../utils/transaction';

const props = defineProps<{
  modelValue: boolean;
  scheduled: ScheduledTransactionView | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [payload: ExecuteScheduledTransactionPayload];
}>();

const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();

const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const amount = ref(0);
const timestamp = ref('');
const accountId = ref('');
const destinationAccountId = ref<string | null>(null);
const categoryId = ref<string | null>(null);
const reschedule = ref(false);
const rescheduleFor = ref('');
const saving = ref(false);

const isRecurring = computed(() => props.scheduled?.recurring === true);
const isTransfer = computed(() => props.scheduled?.type === 'transfer');
const destinationAccounts = computed(() =>
  getDestinationAccountOptions(accountsStore.accounts, accountId.value),
);
const canConfirm = computed(
  () =>
    !isTransfer.value ||
    (!!destinationAccountId.value && destinationAccountId.value !== accountId.value),
);

const amountRules = [
  (value: number) =>
    (Number.isFinite(value) && value > 0) || 'El monto debe ser mayor que cero',
];
const accountRules = [(value: string) => !!value || 'La cuenta es obligatoria'];
const destinationRules = [
  (value: string | null) =>
    !isTransfer.value ||
    (!!value && value !== accountId.value) ||
    'La cuenta destino es obligatoria',
];
const dateRules = [(value: string) => !!value || 'La fecha es obligatoria'];

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !props.scheduled) return;
    amount.value = props.scheduled.amount;
    accountId.value = props.scheduled.accountId;
    destinationAccountId.value = props.scheduled.destinationAccountId;
    categoryId.value = props.scheduled.categoryId;
    timestamp.value = toDateInputValue(new Date());
    // La siguiente ocurrencia se cuenta desde la fecha prevista, no desde hoy:
    // confirmar con retraso no debe correr toda la serie.
    rescheduleFor.value = toDateInputValue(
      suggestedNextDate(props.scheduled.scheduledFor),
    );
    reschedule.value = props.scheduled.recurring;
  },
);

watch(accountId, (sourceAccountId) => {
  if (destinationAccountId.value === sourceAccountId) {
    destinationAccountId.value = null;
  }
});

async function confirm(): Promise<void> {
  const result = form.value ? await form.value.validate() : { valid: true };
  if (!result.valid) return;
  if (!canConfirm.value) return;

  saving.value = true;
  try {
    emit('confirm', {
      amount: amount.value,
      timestamp: fromDateInputValue(timestamp.value).toISOString(),
      accountId: accountId.value,
      ...(isTransfer.value
        ? { destinationAccountId: destinationAccountId.value ?? undefined }
        : { categoryId: categoryId.value }),
      ...(isRecurring.value && reschedule.value
        ? {
            rescheduleFor: fromDateInputValue(rescheduleFor.value).toISOString(),
          }
        : {}),
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
    <v-card v-if="scheduled" color="surface" class="pa-6">
      <v-card-title class="text-h5 font-weight-bold pa-0 pb-1">
        Confirmar «{{ scheduled.title }}»
      </v-card-title>
      <v-card-subtitle class="pa-0 pb-4">
        Al confirmar se crea la transacción real y se mueve el saldo.
      </v-card-subtitle>

      <v-form ref="form" @submit.prevent="confirm">
        <v-text-field
          v-model.number="amount"
          label="Monto"
          type="number"
          :rules="amountRules"
          prepend-icon="mdi-currency-usd"
          data-test="amount-field"
        />
        <v-text-field
          v-model="timestamp"
          label="Fecha"
          type="date"
          :rules="dateRules"
          prepend-icon="mdi-calendar"
          data-test="timestamp-field"
        />
        <v-select
          v-model="accountId"
          label="Cuenta"
          :items="accountsStore.accounts"
          item-title="name"
          item-value="id"
          :rules="accountRules"
          prepend-icon="mdi-wallet"
          data-test="account-field"
        />
        <v-select
          v-if="isTransfer"
          v-model="destinationAccountId"
          label="Destination account"
          :items="destinationAccounts"
          item-title="name"
          item-value="id"
          :rules="destinationRules"
          clearable
          prepend-icon="mdi-wallet-plus"
          data-test="destination-field"
        />
        <v-select
          v-if="!isTransfer"
          v-model="categoryId"
          label="Categoría"
          :items="categoriesStore.categories"
          item-title="name"
          item-value="id"
          clearable
          prepend-icon="mdi-tag-multiple"
          data-test="category-field"
        />

        <template v-if="isRecurring">
          <v-divider class="my-4" />
          <v-switch
            v-model="reschedule"
            color="primary"
            label="Volver a agendar"
            hide-details
            data-test="reschedule-switch"
          />
          <v-text-field
            v-if="reschedule"
            v-model="rescheduleFor"
            label="Próxima fecha"
            type="date"
            :rules="dateRules"
            prepend-icon="mdi-calendar-refresh"
            class="mt-2"
            data-test="reschedule-date"
          />
        </template>

        <div class="d-flex justify-end mt-4">
          <v-btn variant="text" class="mr-2" @click="close">Cancelar</v-btn>
          <v-btn
            color="primary"
            type="submit"
            :loading="saving"
            :disabled="!canConfirm"
            data-test="confirm-action"
          >
            Confirmar
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
