<script setup lang="ts">
import type { AccountView, AccountType } from '../../types/account';
import { formatCurrency } from '../../utils/money';

const props = defineProps<{ account: AccountView }>();

defineEmits<{ edit: []; delete: [] }>();

const typeLabels: Record<AccountType, string> = {
  cash: 'Cash',
  debit: 'Debit card',
  credit: 'Credit card',
};

const typeIcons: Record<AccountType, string> = {
  cash: 'mdi-cash',
  debit: 'mdi-credit-card-outline',
  credit: 'mdi-credit-card',
};

const available = (card: AccountView['creditCard']): number => {
  if (!card) return 0;
  return card.creditLimit - card.usedAmount;
};
</script>

<template>
  <v-card
    class="pa-4"
    color="surface"
    :style="{ borderTop: `4px solid ${props.account.color}` }"
  >
    <v-card-title class="d-flex align-center justify-space-between pa-0 pb-2">
      <span class="d-flex align-center">
        <v-icon
          :icon="typeIcons[props.account.type]"
          color="primary"
          size="20"
          class="mr-2"
        />
        <span class="text-subtitle-1 font-weight-bold">{{ props.account.name }}</span>
      </span>
      <span>
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="$emit('edit')" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="$emit('delete')" />
      </span>
    </v-card-title>

    <v-card-text class="pa-0">
      <v-chip size="small" variant="tonal" color="secondary" class="mb-3">
        {{ typeLabels[props.account.type] }}
      </v-chip>
      <div class="text-h6 font-weight-medium mb-3">
        {{ formatCurrency(props.account.balance) }}
      </div>

      <div v-if="props.account.creditCard" class="mt-2">
        <v-divider class="mb-3" />
        <v-row dense>
          <v-col cols="6">
            <div class="text-caption text-medium-emphasis">Credit limit</div>
            <div class="text-body-2 font-weight-medium">
              {{ formatCurrency(props.account.creditCard.creditLimit) }}
            </div>
          </v-col>
          <v-col cols="6">
            <div class="text-caption text-medium-emphasis">Used</div>
            <div class="text-body-2 font-weight-medium">
              {{ formatCurrency(props.account.creditCard.usedAmount) }}
            </div>
          </v-col>
          <v-col cols="6">
            <div class="text-caption text-medium-emphasis">Cutoff date</div>
            <div class="text-body-2 font-weight-medium">
              {{ props.account.creditCard.cutoffDate.slice(0, 10) }}
            </div>
          </v-col>
          <v-col cols="6">
            <div class="text-caption text-medium-emphasis">Payment date</div>
            <div class="text-body-2 font-weight-medium">
              {{ props.account.creditCard.paymentDate.slice(0, 10) }}
            </div>
          </v-col>
          <v-col cols="12">
            <div class="text-caption text-medium-emphasis">Available</div>
            <div class="text-body-2 font-weight-medium" :class="available(props.account.creditCard) < 0 ? 'text-error' : ''">
              {{ formatCurrency(available(props.account.creditCard)) }}
            </div>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>
</template>
