<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ScheduledTransactionCard from '../components/molecules/ScheduledTransactionCard.vue';
import ExecuteScheduledDialog from '../components/organisms/ExecuteScheduledDialog.vue';
import ScheduledTransactionFormDialog from '../components/organisms/ScheduledTransactionFormDialog.vue';
import { useAccountsStore } from '../stores/accounts';
import { useCategoriesStore } from '../stores/categories';
import { useScheduledTransactionsStore } from '../stores/scheduled-transactions';
import type {
  CreateScheduledTransactionPayload,
  ExecuteScheduledTransactionPayload,
  ScheduledTransactionStatus,
  ScheduledTransactionView,
  UpdateScheduledTransactionPayload,
} from '../types/scheduled-transaction';

const scheduleStore = useScheduledTransactionsStore();
const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();

const formOpen = ref(false);
const editing = ref<ScheduledTransactionView | null>(null);
const executeOpen = ref(false);
const executing = ref<ScheduledTransactionView | null>(null);
const actionError = ref('');

const statusOptions: { value: ScheduledTransactionStatus; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'executed', label: 'Ejecutadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

const showingPending = computed(() => scheduleStore.status === 'pending');
const overdue = computed(() => scheduleStore.buckets.overdue);
const upcoming = computed(() =>
  scheduleStore.sorted.filter(
    (item) => !overdue.value.some((late) => late.id === item.id),
  ),
);
const isEmpty = computed(
  () => !scheduleStore.loading && scheduleStore.sorted.length === 0,
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
  void accountsStore.fetchAccounts();
  void categoriesStore.fetchCategories();
});

function selectStatus(status: ScheduledTransactionStatus): void {
  void scheduleStore.selectStatus(status);
}

function openCreate(): void {
  editing.value = null;
  formOpen.value = true;
}

function openEdit(scheduled: ScheduledTransactionView): void {
  editing.value = scheduled;
  formOpen.value = true;
}

async function save(
  payload:
    | CreateScheduledTransactionPayload
    | UpdateScheduledTransactionPayload,
): Promise<void> {
  actionError.value = '';
  try {
    if (editing.value) {
      await scheduleStore.updateScheduled(
        editing.value.id,
        payload as UpdateScheduledTransactionPayload,
      );
    } else {
      await scheduleStore.createScheduled(
        payload as CreateScheduledTransactionPayload,
      );
    }
    formOpen.value = false;
  } catch (caught) {
    actionError.value = message(caught, 'No se pudo guardar la agendada');
  }
}

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

async function remove(scheduled: ScheduledTransactionView): Promise<void> {
  actionError.value = '';
  try {
    await scheduleStore.deleteScheduled(scheduled.id);
  } catch (caught) {
    actionError.value = message(caught, 'No se pudo eliminar la agendada');
  }
}

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
</script>

<template>
  <v-container class="py-6">
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold">Agenda</h1>
        <div class="text-body-2 text-medium-emphasis">
          Lo que tienes por pagar y por cobrar, hasta que lo confirmes.
        </div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" data-test="new-scheduled" @click="openCreate">
        Agendar
      </v-btn>
    </div>

    <v-btn-toggle
      :model-value="scheduleStore.status"
      color="primary"
      variant="outlined"
      density="comfortable"
      mandatory
      class="mb-4"
      data-test="status-filter"
      @update:model-value="selectStatus"
    >
      <v-btn v-for="option in statusOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </v-btn>
    </v-btn-toggle>

    <v-alert v-if="actionError" type="error" class="mb-4" data-test="action-error">
      {{ actionError }}
    </v-alert>
    <v-alert v-if="scheduleStore.error" type="error" class="mb-4" data-test="load-error">
      {{ scheduleStore.error }}
    </v-alert>

    <v-progress-linear v-if="scheduleStore.loading" indeterminate color="primary" class="mb-4" />

    <div v-if="isEmpty" class="text-center py-12" data-test="schedule-empty">
      <v-icon icon="mdi-calendar-check" size="48" color="secondary" class="mb-3" />
      <div class="text-subtitle-1 font-weight-medium">
        {{ showingPending ? 'No tienes nada agendado' : 'No hay nada en este estado' }}
      </div>
      <div class="text-body-2 text-medium-emphasis">
        {{
          showingPending
            ? 'Agenda un gasto o un ingreso para verlo aquí.'
            : 'Prueba con otro filtro de estado.'
        }}
      </div>
    </div>

    <template v-else>
      <div v-if="overdue.length > 0" class="mb-6" data-test="overdue-section">
        <div class="d-flex align-center mb-2">
          <v-icon icon="mdi-alert-circle" color="error" size="20" class="mr-2" />
          <span class="text-subtitle-2 font-weight-bold text-error">
            Vencidas ({{ overdue.length }})
          </span>
        </div>
        <v-row dense>
          <v-col v-for="item in overdue" :key="item.id" cols="12" md="6">
            <ScheduledTransactionCard
              :scheduled="item"
              :account-name="accountName(item.accountId)"
              :destination-name="destinationName(item.destinationAccountId)"
              :category-name="categoryName(item.categoryId)"
              @execute="openExecute(item)"
              @cancel="cancel(item)"
              @edit="openEdit(item)"
              @delete="remove(item)"
            />
          </v-col>
        </v-row>
      </div>

      <div v-if="upcoming.length > 0" data-test="upcoming-section">
        <div class="text-subtitle-2 font-weight-bold mb-2">
          {{ showingPending ? 'Próximas' : 'Historial' }}
        </div>
        <v-row dense>
          <v-col v-for="item in upcoming" :key="item.id" cols="12" md="6">
            <ScheduledTransactionCard
              :scheduled="item"
              :account-name="accountName(item.accountId)"
              :destination-name="destinationName(item.destinationAccountId)"
              :category-name="categoryName(item.categoryId)"
              @execute="openExecute(item)"
              @cancel="cancel(item)"
              @edit="openEdit(item)"
              @delete="remove(item)"
            />
          </v-col>
        </v-row>
      </div>
    </template>

    <ScheduledTransactionFormDialog
      v-model="formOpen"
      :scheduled="editing"
      @save="save"
    />
    <ExecuteScheduledDialog
      v-model="executeOpen"
      :scheduled="executing"
      @confirm="confirmExecute"
    />
  </v-container>
</template>
