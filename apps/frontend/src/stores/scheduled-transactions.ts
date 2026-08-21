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
    let sessionGeneration = 0;
    let requestId = 0;

    function isCurrentRequest(generation: number, request: number): boolean {
      return generation === sessionGeneration && request === requestId;
    }

    function isCurrentSession(generation: number): boolean {
      return generation === sessionGeneration;
    }

    function clear(): void {
      sessionGeneration += 1;
      requestId += 1;
      items.value = [];
      status.value = 'pending';
      loading.value = false;
      error.value = null;
    }

    const sorted = computed(() => sortByScheduledFor(items.value));
    const pending = computed(() =>
      sorted.value.filter((item) => item.status === 'pending'),
    );
    const buckets = computed(() => splitPendingSchedule(items.value));

    async function fetchScheduled(): Promise<void> {
      const generation = sessionGeneration;
      const request = ++requestId;
      loading.value = true;
      error.value = null;
      try {
        const loadedItems = await scheduledTransactionsService.list({
          status: status.value,
        });
        if (isCurrentRequest(generation, request)) {
          items.value = loadedItems;
        }
      } catch (caught) {
        if (!isCurrentRequest(generation, request)) return;
        items.value = [];
        error.value =
          caught instanceof Error
            ? caught.message
            : 'No se pudo cargar la agenda';
      } finally {
        if (isCurrentRequest(generation, request)) {
          loading.value = false;
        }
      }
    }

    function selectStatus(next: ScheduledTransactionStatus): Promise<void> {
      status.value = next;
      return fetchScheduled();
    }

    async function createScheduled(
      payload: CreateScheduledTransactionPayload,
    ): Promise<void> {
      const generation = sessionGeneration;
      requestId += 1;
      loading.value = false;
      await scheduledTransactionsService.create(payload);
      if (!isCurrentSession(generation)) return;
      await fetchScheduled();
    }

    async function updateScheduled(
      id: string,
      payload: UpdateScheduledTransactionPayload,
    ): Promise<void> {
      const generation = sessionGeneration;
      requestId += 1;
      loading.value = false;
      await scheduledTransactionsService.update(id, payload);
      if (!isCurrentSession(generation)) return;
      await fetchScheduled();
    }

    async function deleteScheduled(id: string): Promise<void> {
      const generation = sessionGeneration;
      requestId += 1;
      loading.value = false;
      await scheduledTransactionsService.remove(id);
      if (!isCurrentSession(generation)) return;
      await fetchScheduled();
    }

    async function executeScheduled(
      id: string,
      payload: ExecuteScheduledTransactionPayload = {},
    ): Promise<void> {
      const generation = sessionGeneration;
      requestId += 1;
      loading.value = false;
      await scheduledTransactionsService.execute(id, payload);
      if (!isCurrentSession(generation)) return;
      // Ejecutar crea una transacción real: el saldo de la cuenta cambió.
      await refreshAffected(generation);
    }

    async function cancelScheduled(id: string): Promise<void> {
      const generation = sessionGeneration;
      requestId += 1;
      loading.value = false;
      await scheduledTransactionsService.cancel(id);
      if (!isCurrentSession(generation)) return;
      await fetchScheduled();
    }

    async function refreshAffected(generation: number): Promise<void> {
      await fetchScheduled();
      if (!isCurrentSession(generation)) return;
      const accountsStore = useAccountsStore();
      await accountsStore.fetchAccounts();
    }

    return {
      items,
      status,
      loading,
      error,
      clear,
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
