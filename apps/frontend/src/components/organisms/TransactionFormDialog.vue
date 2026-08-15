<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAccountsStore } from '../../stores/accounts';
import { useCategoriesStore } from '../../stores/categories';
import type {
  CreateTransactionPayload,
  TransactionType,
  TransactionView,
  UpdateTransactionPayload,
} from '../../types/transaction';

const props = defineProps<{
  modelValue: boolean;
  transaction: TransactionView | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [payload: CreateTransactionPayload | UpdateTransactionPayload];
}>();

const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();

const form = ref<{ validate: () => Promise<string[]> } | null>(null);
const accountId = ref('');
const type = ref<TransactionType>('expense');
const title = ref('');
const amount = ref(0);
const categoryId = ref<string | null>(null);
const timestamp = ref('');
const tags = ref<string[]>([]);
const saving = ref(false);
const error = ref('');

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

const titleRules = [(value: string) => !!value.trim() || 'Title is required'];
const amountRules = [(value: number) => Number.isFinite(value) && value > 0 || 'Amount must be greater than zero'];
const accountRules = [(value: string) => !!value || 'Account is required'];

function toDateTimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    error.value = '';
    if (props.transaction) {
      accountId.value = props.transaction.accountId;
      type.value = props.transaction.type;
      title.value = props.transaction.title;
      amount.value = props.transaction.amount;
      categoryId.value = props.transaction.categoryId;
      timestamp.value = toDateTimeLocal(new Date(props.transaction.timestamp));
      tags.value = [...props.transaction.tags];
    } else {
      accountId.value = accountsStore.accounts[0]?.id ?? '';
      type.value = 'expense';
      title.value = '';
      amount.value = 0;
      categoryId.value = null;
      timestamp.value = toDateTimeLocal(new Date());
      tags.value = [];
    }
  },
);

async function save(): Promise<void> {
  const errors = form.value ? await form.value.validate() : [];
  if (errors.length > 0) return;

  const payload = {
    title: title.value,
    amount: amount.value,
    type: type.value,
    accountId: accountId.value,
    categoryId: categoryId.value ?? undefined,
    timestamp: new Date(timestamp.value).toISOString(),
    tags: tags.value,
  };

  saving.value = true;
  try {
    emit('save', payload);
  } finally {
    saving.value = false;
  }
}

function close(): void {
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520" @update:model-value="emit('update:modelValue', $event)">
    <v-card color="surface" class="pa-6">
      <v-card-title class="text-h5 font-weight-bold pa-0 pb-4">
        {{ transaction ? 'Edit transaction' : 'New transaction' }}
      </v-card-title>

      <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

      <v-form ref="form" @submit.prevent="save">
        <v-select
          v-model="type"
          label="Type"
          :items="typeOptions"
          item-title="label"
          item-value="value"
          prepend-icon="mdi-swap-horizontal"
        />
        <v-text-field v-model="title" label="Title" :rules="titleRules" prepend-icon="mdi-format-title" />
        <v-text-field
          v-model.number="amount"
          label="Amount"
          type="number"
          :rules="amountRules"
          prepend-icon="mdi-currency-usd"
        />
        <v-select
          v-model="accountId"
          label="Account"
          :items="accountsStore.accounts"
          item-title="name"
          item-value="id"
          :rules="accountRules"
          prepend-icon="mdi-wallet"
        />
        <v-select
          v-model="categoryId"
          label="Category"
          :items="categoriesStore.categories"
          item-title="name"
          item-value="id"
          clearable
          prepend-icon="mdi-tag-multiple"
        />
        <v-text-field
          v-model="timestamp"
          label="Timestamp"
          type="datetime-local"
          prepend-icon="mdi-calendar-clock"
        />
        <v-combobox
          v-model="tags"
          label="Tags"
          multiple
          chips
          closable-chips
          clearable
          prepend-icon="mdi-tag"
          hint="Press enter to add a tag"
        />

        <div class="d-flex justify-end mt-4">
          <v-btn variant="text" class="mr-2" @click="close">Cancel</v-btn>
          <v-btn color="primary" type="submit" :loading="saving">
            {{ transaction ? 'Save changes' : 'Create transaction' }}
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
