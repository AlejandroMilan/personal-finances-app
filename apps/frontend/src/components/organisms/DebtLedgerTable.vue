<script setup lang="ts">
import { computed } from 'vue';
import type { Debt, DebtMovement, DebtMovementKind } from '../../types/debt';
import { formatCurrency } from '../../utils/money';

const props = defineProps<{
  movements: DebtMovement[];
  debts: Debt[];
  /** En el log general cada fila indica su deuda; en el de una deuda no hace falta. */
  showDebt?: boolean;
}>();

const kindLabels: Record<DebtMovementKind, string> = {
  alta: 'Alta',
  pago: 'Pago',
  aumento: 'Aumento',
  ajuste: 'Ajuste',
};

const nameById = computed(() => new Map(props.debts.map((debt) => [debt.id, debt.name])));

const formatDate = (value: string): string => new Date(value).toLocaleDateString();
</script>

<template>
  <div>
    <div v-if="movements.length === 0" class="text-body-2 text-medium-emphasis py-6 text-center" data-test="ledger-empty">
      Sin movimientos de deuda
    </div>

    <v-table v-else density="compact" data-test="ledger-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th v-if="showDebt">Deuda</th>
          <th>Tipo</th>
          <th class="text-right">Monto</th>
          <th class="text-right">Capital</th>
          <th class="text-right">Interés</th>
          <th class="text-right">Saldo</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in movements" :key="row.id" data-test="ledger-row">
          <td>{{ formatDate(row.occurredAt) }}</td>
          <td v-if="showDebt">{{ nameById.get(row.debtId) ?? '—' }}</td>
          <td>{{ kindLabels[row.kind] }}</td>
          <td class="text-right">{{ formatCurrency(row.amount) }}</td>
          <td class="text-right">{{ formatCurrency(row.capitalAmount) }}</td>
          <td class="text-right">{{ formatCurrency(row.interestAmount) }}</td>
          <td class="text-right font-weight-bold">{{ formatCurrency(row.balanceAfter) }}</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>
