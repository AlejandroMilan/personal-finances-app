import { ref } from 'vue';
import { defineStore } from 'pinia';
import { debtsService } from '../services/debts';
import type {
  CreateDebtPayload,
  Debt,
  DebtMovement,
  UpdateDebtPayload,
} from '../types/debt';

export const useDebtsStore = defineStore('debts', () => {
  const debts = ref<Debt[]>([]);
  const movements = ref<DebtMovement[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clear(): void {
    debts.value = [];
    movements.value = [];
    loading.value = false;
    error.value = null;
  }

  /** Carga deudas y log general en paralelo. */
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const [loadedDebts, loadedMovements] = await Promise.all([
        debtsService.list(),
        debtsService.movements(),
      ]);
      debts.value = loadedDebts;
      movements.value = loadedMovements;
    } catch (caught) {
      debts.value = [];
      movements.value = [];
      error.value =
        caught instanceof Error ? caught.message : 'Could not load debts';
    } finally {
      loading.value = false;
    }
  }

  /** Tras una mutación se recargan deudas y log: el saldo cambia en cascada. */
  async function create(payload: CreateDebtPayload): Promise<Debt> {
    const created = await debtsService.create(payload);
    await fetchAll();
    return created;
  }

  async function update(id: string, payload: UpdateDebtPayload): Promise<Debt> {
    const updated = await debtsService.update(id, payload);
    await fetchAll();
    return updated;
  }

  async function remove(id: string): Promise<void> {
    await debtsService.remove(id);
    await fetchAll();
  }

  /** Log de una deuda concreta, sin tocar el log general del store. */
  function movementsOf(debtId: string): DebtMovement[] {
    return movements.value.filter((movement) => movement.debtId === debtId);
  }

  return {
    debts,
    movements,
    loading,
    error,
    clear,
    fetchAll,
    create,
    update,
    remove,
    movementsOf,
  };
});
