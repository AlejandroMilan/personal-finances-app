<script setup lang="ts">
import { computed } from 'vue';
import type { ScheduledTransactionView } from '../../types/scheduled-transaction';
import { formatCurrency } from '../../utils/money';
import { isOverdue } from '../../utils/schedule';

const props = defineProps<{
  scheduled: ScheduledTransactionView;
  accountName?: string;
  categoryName?: string;
  /** En modo compacto solo se ofrecen confirmar y cancelar. */
  compact?: boolean;
}>();

defineEmits<{ execute: []; cancel: []; edit: []; delete: [] }>();

const overdue = computed(() => isOverdue(props.scheduled));
const isPending = computed(() => props.scheduled.status === 'pending');
const isIncome = computed(() => props.scheduled.type === 'income');

const signedAmount = computed(
  () =>
    `${isIncome.value ? '+' : '-'}${formatCurrency(props.scheduled.amount)}`,
);

const statusLabels: Record<ScheduledTransactionView['status'], string> = {
  pending: 'Pendiente',
  executed: 'Ejecutada',
  cancelled: 'Cancelada',
};

const statusColors: Record<ScheduledTransactionView['status'], string> = {
  pending: 'secondary',
  executed: 'success',
  cancelled: 'error',
};

const scheduledDate = computed(() =>
  new Date(props.scheduled.scheduledFor).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }),
);
</script>

<template>
  <v-card
    class="pa-4"
    color="surface"
    :data-test="overdue && isPending ? 'scheduled-card-overdue' : 'scheduled-card'"
  >
    <div class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon
          :icon="isIncome ? 'mdi-arrow-down-bold-circle' : 'mdi-arrow-up-bold-circle'"
          :color="isIncome ? 'success' : 'warning'"
          size="22"
          class="mr-3"
        />
        <div>
          <div class="text-subtitle-1 font-weight-bold">
            {{ props.scheduled.title }}
          </div>
          <div class="text-caption text-medium-emphasis">
            <span v-if="props.accountName">{{ props.accountName }}</span>
            <span v-if="props.categoryName"> · {{ props.categoryName }}</span>
            <span v-if="props.scheduled.recurring"> · Recurrente</span>
          </div>
        </div>
      </div>

      <div class="text-right">
        <div
          class="text-subtitle-1 font-weight-medium"
          :class="isIncome ? 'text-success' : 'text-warning'"
        >
          {{ signedAmount }}
        </div>
        <div class="text-caption" :class="overdue && isPending ? 'text-error' : 'text-medium-emphasis'">
          {{ scheduledDate }}
        </div>
      </div>
    </div>

    <div class="d-flex align-center justify-space-between mt-3">
      <div>
        <v-chip
          size="x-small"
          variant="tonal"
          :color="statusColors[props.scheduled.status]"
        >
          {{ statusLabels[props.scheduled.status] }}
        </v-chip>
        <v-chip
          v-if="overdue && isPending"
          size="x-small"
          variant="tonal"
          color="error"
          class="ml-2"
          data-test="overdue-chip"
        >
          Vencida
        </v-chip>
      </div>

      <div v-if="isPending" data-test="pending-actions">
        <v-btn
          icon="mdi-check"
          variant="text"
          size="small"
          color="primary"
          data-test="execute-action"
          aria-label="Confirmar"
          @click="$emit('execute')"
        />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="error"
          data-test="cancel-action"
          aria-label="Cancelar"
          @click="$emit('cancel')"
        />
        <v-btn
          v-if="!props.compact"
          icon="mdi-pencil"
          variant="text"
          size="small"
          data-test="edit-action"
          aria-label="Editar"
          @click="$emit('edit')"
        />
        <v-btn
          v-if="!props.compact"
          icon="mdi-delete"
          variant="text"
          size="small"
          data-test="delete-action"
          aria-label="Eliminar"
          @click="$emit('delete')"
        />
      </div>
    </div>
  </v-card>
</template>
