<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ScheduledTransactionCard from '../molecules/ScheduledTransactionCard.vue';
import ExecuteScheduledDialog from './ExecuteScheduledDialog.vue';
import { useAccountsStore } from '../../stores/accounts';
import { useCategoriesStore } from '../../stores/categories';
import { useScheduledTransactionsStore } from '../../stores/scheduled-transactions';
import type {
  ExecuteScheduledTransactionPayload,
  ScheduledTransactionView,
} from '../../types/scheduled-transaction';

const scheduleStore = useScheduledTransactionsStore();
const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();

const executeOpen = ref(false);
const executing = ref<ScheduledTransactionView | null>(null);
const actionError = ref('');

const overdue = computed(() => scheduleStore.buckets.overdue);
const currentMonth = computed(() => scheduleStore.buckets.currentMonth);
const isEmpty = computed(
  () => overdue.value.length === 0 && currentMonth.value.length === 0,
);

const accountName = (id: string): string | undefined =>
  accountsStore.accounts.find((account) => account.id === id)?.name;

const destinationName = (id: string | null): string | undefined =>
  id ? accountName(id) : undefined;

const categoryName = (id: string | null): string | undefined =>
  id
    ? categoriesStore.categories.find((category) => category.id === id)?.name
    : undefined;

onMounted(() => {
  void scheduleStore.fetchScheduled();
  if (accountsStore.accounts.length === 0) {
    void accountsStore.fetchAccounts();
  }
  if (categoriesStore.categories.length === 0) {
    void categoriesStore.fetchCategories();
  }
});

function openExecute(scheduled: ScheduledTransactionView): void {
  executing.value = scheduled;
  executeOpen.value = true;
}

async function confirmExecute(
  payload: ExecuteScheduledTransactionPayload,
): Promise<void> {
  if (!executing.value) return;
  actionError.value = '';
  try {
    await scheduleStore.executeScheduled(executing.value.id, payload);
    executeOpen.value = false;
  } catch (caught) {
    actionError.value = message(caught, 'No se pudo confirmar la agendada');
  }
}

async function cancel(scheduled: ScheduledTransactionView): Promise<void> {
  actionError.value = '';
  try {
    await scheduleStore.cancelScheduled(scheduled.id);
  } catch (caught) {
    actionError.value = message(caught, 'No se pudo cancelar la agendada');
  }
}

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
</script>

<template>
  <v-card color="surface" class="pa-4" data-test="upcoming-schedule-card">
    <div class="d-flex align-center justify-space-between mb-3">
      <span class="d-flex align-center">
        <v-icon icon="mdi-calendar-clock" color="primary" size="20" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">Agenda</span>
      </span>
      <v-btn
        variant="text"
        size="small"
        color="primary"
        to="/schedule"
        append-icon="mdi-arrow-right"
        data-test="schedule-link"
      >
        Ver todo
      </v-btn>
    </div>

    <v-alert v-if="actionError" type="error" density="compact" class="mb-3" data-test="schedule-action-error">
      {{ actionError }}
    </v-alert>

    <div v-if="isEmpty" class="text-center py-6" data-test="upcoming-schedule-empty">
      <div class="text-body-2 text-medium-emphasis">
        No tienes nada pendiente este mes.
      </div>
    </div>

    <template v-else>
      <div v-if="overdue.length > 0" class="mb-4" data-test="dashboard-overdue">
        <div class="d-flex align-center mb-2">
          <v-icon icon="mdi-alert-circle" color="error" size="18" class="mr-2" />
          <span class="text-caption font-weight-bold text-error">
            Vencidas ({{ overdue.length }})
          </span>
        </div>
        <v-row dense>
          <v-col v-for="item in overdue" :key="item.id" cols="12">
            <ScheduledTransactionCard
              :scheduled="item"
              :account-name="accountName(item.accountId)"
              :destination-name="destinationName(item.destinationAccountId)"
              :category-name="categoryName(item.categoryId)"
              compact
              @execute="openExecute(item)"
              @cancel="cancel(item)"
            />
          </v-col>
        </v-row>
      </div>

      <div v-if="currentMonth.length > 0" data-test="dashboard-current-month">
        <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
          Este mes ({{ currentMonth.length }})
        </div>
        <v-row dense>
          <v-col v-for="item in currentMonth" :key="item.id" cols="12">
            <ScheduledTransactionCard
              :scheduled="item"
              :account-name="accountName(item.accountId)"
              :destination-name="destinationName(item.destinationAccountId)"
              :category-name="categoryName(item.categoryId)"
              compact
              @execute="openExecute(item)"
              @cancel="cancel(item)"
            />
          </v-col>
        </v-row>
      </div>
    </template>

    <ExecuteScheduledDialog
      v-model="executeOpen"
      :scheduled="executing"
      @confirm="confirmExecute"
    />
  </v-card>
</template>
