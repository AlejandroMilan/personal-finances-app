<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAccountsStore } from '../../stores/accounts';
import { useCategoriesStore } from '../../stores/categories';
import type {
  CreateScheduledTransactionPayload,
  ScheduledTransactionView,
  UpdateScheduledTransactionPayload,
} from '../../types/scheduled-transaction';
import type { TransactionType } from '../../types/transaction';
import { fromDateInputValue, toDateInputValue } from '../../utils/schedule';
import {
  getDestinationAccountOptions,
  transactionTypeOptions,
} from '../../utils/transaction';

const props = defineProps<{
  modelValue: boolean;
  scheduled: ScheduledTransactionView | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [
    payload:
      | CreateScheduledTransactionPayload
      | UpdateScheduledTransactionPayload,
  ];
}>();

const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();

const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const accountId = ref('');
const type = ref<TransactionType>('expense');
const destinationAccountId = ref<string | null>(null);
const title = ref('');
const amount = ref(0);
const categoryId = ref<string | null>(null);
const scheduledFor = ref('');
const recurring = ref(false);
const tags = ref<string[]>([]);
const saving = ref(false);

const isTransfer = computed(() => type.value === 'transfer');
const destinationAccounts = computed(() =>
  getDestinationAccountOptions(accountsStore.accounts, accountId.value),
);
const canSave = computed(
  () =>
    !isTransfer.value ||
    (!!destinationAccountId.value && destinationAccountId.value !== accountId.value),
);

const typeOptions = transactionTypeOptions;

const titleRules = [(value: string) => !!value.trim() || 'El título es obligatorio'];
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
    if (!open) return;
    if (props.scheduled) {
      accountId.value = props.scheduled.accountId;
      type.value = props.scheduled.type;
      destinationAccountId.value = props.scheduled.destinationAccountId;
      title.value = props.scheduled.title;
      amount.value = props.scheduled.amount;
      categoryId.value = props.scheduled.categoryId;
      scheduledFor.value = toDateInputValue(
        new Date(props.scheduled.scheduledFor),
      );
      recurring.value = props.scheduled.recurring;
      tags.value = [...props.scheduled.tags];
    } else {
      accountId.value = accountsStore.accounts[0]?.id ?? '';
      type.value = 'expense';
      destinationAccountId.value = null;
      title.value = '';
      amount.value = 0;
      categoryId.value = null;
      scheduledFor.value = toDateInputValue(new Date());
      recurring.value = false;
      tags.value = [];
    }
  },
);

watch(accountId, (sourceAccountId) => {
  if (destinationAccountId.value === sourceAccountId) {
    destinationAccountId.value = null;
  }
});

watch(type, (transactionType) => {
  if (transactionType !== 'transfer') {
    destinationAccountId.value = null;
  }
});

async function save(): Promise<void> {
  const result = form.value ? await form.value.validate() : { valid: true };
  if (!result.valid) return;
  if (!canSave.value) return;

  saving.value = true;
  try {
    emit('save', {
      title: title.value,
      amount: amount.value,
      type: type.value,
      accountId: accountId.value,
      ...(isTransfer.value
        ? { destinationAccountId: destinationAccountId.value ?? undefined }
        : { categoryId: categoryId.value ?? undefined }),
      scheduledFor: fromDateInputValue(scheduledFor.value).toISOString(),
      recurring: recurring.value,
      tags: tags.value,
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
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card color="surface" class="pa-6">
      <v-card-title class="text-h5 font-weight-bold pa-0 pb-4">
        {{ scheduled ? 'Editar agendada' : 'Nueva transacción agendada' }}
      </v-card-title>

      <v-form ref="form" @submit.prevent="save">
        <v-select
          v-model="type"
          label="Tipo"
          :items="typeOptions"
          item-title="label"
          item-value="value"
          :disabled="scheduled !== null"
          prepend-icon="mdi-swap-horizontal"
        />
        <v-text-field
          v-model="title"
          label="Título"
          :rules="titleRules"
          prepend-icon="mdi-format-title"
        />
        <v-text-field
          v-model.number="amount"
          label="Monto"
          type="number"
          :rules="amountRules"
          prepend-icon="mdi-currency-usd"
        />
        <v-select
          v-model="accountId"
          label="Cuenta"
          :items="accountsStore.accounts"
          item-title="name"
          item-value="id"
          :rules="accountRules"
          prepend-icon="mdi-wallet"
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
        />
        <v-text-field
          v-model="scheduledFor"
          label="Fecha prevista"
          type="date"
          :rules="dateRules"
          prepend-icon="mdi-calendar-clock"
        />
        <v-combobox
          v-model="tags"
          label="Etiquetas"
          multiple
          chips
          closable-chips
          clearable
          prepend-icon="mdi-tag"
          hint="Presiona enter para agregar una etiqueta"
        />
        <v-switch
          v-model="recurring"
          color="primary"
          label="Recurrente"
          hide-details
          data-test="recurring-switch"
        />

        <div class="d-flex justify-end mt-4">
          <v-btn variant="text" class="mr-2" @click="close">Cancelar</v-btn>
          <v-btn
            color="primary"
            type="submit"
            :loading="saving"
            :disabled="!canSave"
          >
            {{ scheduled ? 'Guardar cambios' : 'Agendar' }}
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
