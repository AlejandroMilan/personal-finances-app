import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { scheduledTransactionsService } from '../services/scheduled-transactions';
import { useAccountsStore } from './accounts';
import type {
  CreateScheduledTransactionPayload,
  ExecuteScheduledTransactionPayload,
  ScheduledTransactionStatus,
  ScheduledTransactionView,
  UpdateScheduledTransactionPayload,
} from '../types/scheduled-transaction';
import { splitPendingSchedule, sortByScheduledFor } from '../utils/schedule';

export const useScheduledTransactionsStore = defineStore(
  'scheduled-transactions',
  () => {
    const items = ref<ScheduledTransactionView[]>([]);
    const status = ref<ScheduledTransactionStatus>('pending');
    const loading = ref(false);
    const error = ref<string | null>(null);

    const sorted = computed(() => sortByScheduledFor(items.value));
    const pending = computed(() =>
      sorted.value.filter((item) => item.status === 'pending'),
    );
    const buckets = computed(() => splitPendingSchedule(items.value));

    async function fetchScheduled(): Promise<void> {
      loading.value = true;
      error.value = null;
      try {
        items.value = await scheduledTransactionsService.list({
          status: status.value,
        });
      } catch (caught) {
        items.value = [];
        error.value =
          caught instanceof Error
            ? caught.message
            : 'No se pudo cargar la agenda';
      } finally {
        loading.value = false;
      }
    }

    function selectStatus(next: ScheduledTransactionStatus): Promise<void> {
      status.value = next;
      return fetchScheduled();
    }

    async function createScheduled(
      payload: CreateScheduledTransactionPayload,
    ): Promise<void> {
      await scheduledTransactionsService.create(payload);
      await fetchScheduled();
    }

    async function updateScheduled(
      id: string,
      payload: UpdateScheduledTransactionPayload,
    ): Promise<void> {
      await scheduledTransactionsService.update(id, payload);
      await fetchScheduled();
    }

    async function deleteScheduled(id: string): Promise<void> {
      await scheduledTransactionsService.remove(id);
      await fetchScheduled();
    }

    async function executeScheduled(
      id: string,
      payload: ExecuteScheduledTransactionPayload = {},
    ): Promise<void> {
      await scheduledTransactionsService.execute(id, payload);
      // Ejecutar crea una transacción real: el saldo de la cuenta cambió.
      await refreshAffected();
    }

    async function cancelScheduled(id: string): Promise<void> {
      await scheduledTransactionsService.cancel(id);
      await fetchScheduled();
    }

    async function refreshAffected(): Promise<void> {
      await fetchScheduled();
      const accountsStore = useAccountsStore();
      await accountsStore.fetchAccounts();
    }

    return {
      items,
      status,
      loading,
      error,
      sorted,
      pending,
      buckets,
      fetchScheduled,
      selectStatus,
      createScheduled,
      updateScheduled,
      deleteScheduled,
      executeScheduled,
      cancelScheduled,
    };
  },
);
