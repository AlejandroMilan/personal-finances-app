<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AccountType, AccountView, CreateAccountPayload, UpdateAccountPayload } from '../../types/account';

const props = defineProps<{
  modelValue: boolean;
  account: AccountView | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [payload: CreateAccountPayload | UpdateAccountPayload];
}>();

const presetColors = ['#2E6B4F', '#7FA56E', '#D9C5A0', '#C98A2D', '#2F6D80', '#B3261E'];

const form = ref<{ validate: () => Promise<string[]> } | null>(null);
const name = ref('');
const balance = ref(0);
const color = ref(presetColors[0]);
const type = ref<AccountType>('cash');
const creditLimit = ref(0);
const usedAmount = ref(0);
const cutoffDate = ref('');
const paymentDate = ref('');
const saving = ref(false);
const error = ref('');

const isCredit = computed(() => type.value === 'credit');

const typeOptions: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'debit', label: 'Debit card' },
  { value: 'credit', label: 'Credit card' },
];

const nameRules = [(value: string) => !!value.trim() || 'Name is required'];
const numberRules = [(value: number) => Number.isFinite(value) || 'Enter a valid number'];
const creditLimitRules = [
  (value: number) => Number.isFinite(value) && value > 0 || 'Limit must be greater than zero',
];
const dateRules = [(value: string) => !!value || 'Date is required'];

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    error.value = '';
    if (props.account) {
      name.value = props.account.name;
      balance.value = props.account.balance;
      color.value = props.account.color;
      type.value = props.account.type;
      creditLimit.value = props.account.creditCard?.creditLimit ?? 0;
      usedAmount.value = props.account.creditCard?.usedAmount ?? 0;
      cutoffDate.value = props.account.creditCard?.cutoffDate.slice(0, 10) ?? '';
      paymentDate.value = props.account.creditCard?.paymentDate.slice(0, 10) ?? '';
    } else {
      name.value = '';
      balance.value = 0;
      color.value = presetColors[0];
      type.value = 'cash';
      creditLimit.value = 0;
      usedAmount.value = 0;
      cutoffDate.value = '';
      paymentDate.value = '';
    }
  },
);

async function save(): Promise<void> {
  const errors = form.value ? await form.value.validate() : [];
  if (errors.length > 0) return;

  if (isCredit.value && usedAmount.value > creditLimit.value) {
    error.value = 'Used amount cannot exceed the credit limit';
    return;
  }

  const payload = {
    name: name.value,
    balance: balance.value,
    color: color.value,
    type: type.value,
    creditCard: isCredit.value
      ? {
          creditLimit: creditLimit.value,
          usedAmount: usedAmount.value,
          cutoffDate: cutoffDate.value,
          paymentDate: paymentDate.value,
        }
      : undefined,
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
        {{ account ? 'Edit account' : 'New account' }}
      </v-card-title>

      <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

      <v-form ref="form" @submit.prevent="save">
        <v-text-field v-model="name" label="Name" :rules="nameRules" prepend-icon="mdi-wallet" />
        <v-text-field
          v-model.number="balance"
          label="Balance"
          type="number"
          :rules="numberRules"
          prepend-icon="mdi-currency-usd"
        />
        <v-select
          v-model="type"
          label="Type"
          :items="typeOptions"
          item-title="label"
          item-value="value"
          prepend-icon="mdi-credit-card-multiple-outline"
        />

        <div class="d-flex align-center mb-2">
          <span class="text-body-2 text-medium-emphasis mr-3">Color</span>
          <v-btn
            v-for="preset in presetColors"
            :key="preset"
            :color="preset"
            size="x-small"
            class="ma-1"
            :variant="color === preset ? 'elevated' : 'tonal'"
            @click="color = preset"
          />
        </div>

        <template v-if="isCredit">
          <v-divider class="my-4" />
          <v-card-subtitle class="pa-0 pb-2 text-subtitle-1 font-weight-medium">
            Credit card
          </v-card-subtitle>
          <v-text-field
            v-model.number="creditLimit"
            label="Credit limit"
            type="number"
            :rules="creditLimitRules"
            prepend-icon="mdi-card-account-details-outline"
          />
          <v-text-field
            v-model.number="usedAmount"
            label="Currently used"
            type="number"
            :rules="numberRules"
            prepend-icon="mdi-credit-card-outline"
          />
          <v-text-field v-model="cutoffDate" label="Cutoff date" type="date" :rules="dateRules" />
          <v-text-field v-model="paymentDate" label="Payment date" type="date" :rules="dateRules" />
        </template>

        <div class="d-flex justify-end mt-4">
          <v-btn variant="text" class="mr-2" @click="close">Cancel</v-btn>
          <v-btn color="primary" type="submit" :loading="saving">
            {{ account ? 'Save changes' : 'Create account' }}
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
