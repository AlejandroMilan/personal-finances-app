<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DebtCard from '../components/molecules/DebtCard.vue';
import DebtDistributionChart from '../components/molecules/DebtDistributionChart.vue';
import DebtEvolutionChart from '../components/molecules/DebtEvolutionChart.vue';
import DebtFormDialog from '../components/organisms/DebtFormDialog.vue';
import DebtLedgerTable from '../components/organisms/DebtLedgerTable.vue';
import { useDebtsStore } from '../stores/debts';
import type { CreateDebtPayload, Debt, UpdateDebtPayload } from '../types/debt';
import { totalDebt } from '../utils/debt';
import { formatCurrency } from '../utils/money';

const debtsStore = useDebtsStore();

const ALL = 'all';
const formOpen = ref(false);
const editingDebt = ref<Debt | null>(null);
const deleteTarget = ref<Debt | null>(null);
const ledgerDebtId = ref<string>(ALL);

const deleteOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (value: boolean) => {
    if (!value) deleteTarget.value = null;
  },
});
const deleting = ref(false);
const deleteError = ref('');

const total = computed(() => totalDebt(debtsStore.debts));

const ledgerItems = computed(() => [
  { title: 'Log general', value: ALL },
  ...debtsStore.debts.map((debt) => ({ title: debt.name, value: debt.id })),
]);

const ledgerMovements = computed(() =>
  ledgerDebtId.value === ALL
    ? debtsStore.movements
    : debtsStore.movementsOf(ledgerDebtId.value),
);

onMounted(() => {
  void debtsStore.fetchAll();
});

function openCreate(): void {
  editingDebt.value = null;
  formOpen.value = true;
}

function openEdit(debt: Debt): void {
  editingDebt.value = debt;
  formOpen.value = true;
}

async function handleSave(payload: CreateDebtPayload | UpdateDebtPayload): Promise<void> {
  try {
    if (editingDebt.value) {
      await debtsStore.update(editingDebt.value.id, payload);
    } else {
      await debtsStore.create(payload as CreateDebtPayload);
    }
    formOpen.value = false;
  } catch (e) {
    window.alert(e instanceof Error ? e.message : 'Save failed');
  }
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await debtsStore.remove(deleteTarget.value.id);
    if (ledgerDebtId.value === deleteTarget.value.id) ledgerDebtId.value = ALL;
    deleteTarget.value = null;
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'Delete failed';
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <v-container class="py-6">
    <div class="d-flex flex-wrap align-center justify-space-between mb-6 ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Deudas</h1>
        <div class="text-body-2 text-medium-emphasis" data-test="total-debt">
          Total adeudado: <strong>{{ formatCurrency(total) }}</strong>
        </div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" data-test="add-debt" @click="openCreate">
        Nueva deuda
      </v-btn>
    </div>

    <v-progress-linear v-if="debtsStore.loading" indeterminate color="primary" class="mb-4" />

    <v-alert v-if="debtsStore.error" type="error" class="mb-4">{{ debtsStore.error }}</v-alert>

    <v-row v-if="debtsStore.debts.length > 0" dense>
      <v-col v-for="debt in debtsStore.debts" :key="debt.id" cols="12" sm="6" md="4">
        <DebtCard :debt="debt" @edit="openEdit" @remove="deleteTarget = $event" />
      </v-col>
    </v-row>

    <v-card v-else-if="!debtsStore.loading" color="surface" class="pa-8 text-center">
      <v-icon icon="mdi-hand-coin-outline" size="48" color="secondary" class="mb-3" />
      <div class="text-h6">Sin deudas registradas</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Registra una deuda para llevar su saldo y sus pagos.
      </div>
    </v-card>

    <v-row class="mt-6" dense>
      <v-col cols="12" md="7">
        <DebtEvolutionChart :movements="debtsStore.movements" :debts="debtsStore.debts" />
      </v-col>
      <v-col cols="12" md="5">
        <DebtDistributionChart :debts="debtsStore.debts" />
      </v-col>
    </v-row>

    <v-card color="surface" class="pa-4 mt-6">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
        <span class="text-subtitle-1 font-weight-bold">Movimientos</span>
        <v-select
          v-model="ledgerDebtId"
          :items="ledgerItems"
          density="compact"
          variant="outlined"
          hide-details
          data-test="ledger-select"
          class="ledger-select"
        />
      </div>
      <DebtLedgerTable
        :movements="ledgerMovements"
        :debts="debtsStore.debts"
        :show-debt="ledgerDebtId === ALL"
      />
    </v-card>

    <DebtFormDialog v-model="formOpen" :debt="editingDebt" @save="handleSave" />

    <v-dialog v-model="deleteOpen" max-width="420">
      <v-card color="surface" class="pa-6">
        <v-card-title class="text-h6 pa-0 pb-2">¿Eliminar la deuda?</v-card-title>
        <v-card-text class="pa-0 pb-4">
          "{{ deleteTarget?.name }}" sólo se puede eliminar si no tiene pagos ni aumentos registrados.
        </v-card-text>
        <v-alert v-if="deleteError" type="error" class="mb-4">{{ deleteError }}</v-alert>
        <div class="d-flex justify-end">
          <v-btn variant="text" class="mr-2" :disabled="deleting" @click="deleteTarget = null">
            Cancelar
          </v-btn>
          <v-btn color="error" :loading="deleting" data-test="confirm-delete-debt" @click="confirmDelete">
            Eliminar
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.ledger-select {
  max-width: 260px;
}
</style>
