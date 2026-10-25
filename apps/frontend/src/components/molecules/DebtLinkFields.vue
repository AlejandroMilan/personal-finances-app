<script setup lang="ts">
import { computed } from 'vue';
import type { Debt } from '../../types/debt';
import { paymentInterest } from '../../utils/debt';
import {
  debtLinkKindFor,
  emptyDebtLinkForm,
  isDebtLinkActive,
  type DebtLinkForm,
} from '../../utils/debt-link';
import { formatCurrency } from '../../utils/money';

const props = defineProps<{
  modelValue: DebtLinkForm;
  type: string;
  amount: number;
  debts: Debt[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: DebtLinkForm];
}>();

const kind = computed(() => debtLinkKindFor(props.type));
const active = computed(() => isDebtLinkActive(props.modelValue, props.type));
const interest = computed(() => paymentInterest(props.amount, props.modelValue.capital));

const switchLabel = computed(() =>
  kind.value === 'payment' ? 'Es pago de deuda' : 'Es ingreso de deuda',
);

const debtRules = [(value: string | null) => !!value || 'Elige la deuda'];

function update(patch: Partial<DebtLinkForm>): void {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

/** Al desactivar se limpian los campos: nada de un vínculo apagado queda en el formulario. */
function toggle(enabled: boolean | null): void {
  const nextKind = kind.value ?? 'payment';
  emit(
    'update:modelValue',
    enabled
      ? { ...props.modelValue, enabled: true, kind: nextKind }
      : { ...emptyDebtLinkForm(), kind: nextKind },
  );
}
</script>

<template>
  <div v-if="kind" data-test="debt-link-fields">
    <v-switch
      :model-value="active"
      :label="switchLabel"
      color="primary"
      inset
      data-test="debt-link-switch"
      @update:model-value="toggle"
    />

    <template v-if="active">
      <v-select
        :model-value="modelValue.debtId"
        :items="debts"
        item-title="name"
        item-value="id"
        label="Deuda"
        :rules="debtRules"
        prepend-icon="mdi-hand-coin"
        data-test="debt-link-debt"
        @update:model-value="update({ debtId: $event })"
      />

      <template v-if="kind === 'payment'">
        <v-text-field
          :model-value="modelValue.capital"
          label="Cantidad a capital"
          type="number"
          step="0.01"
          prepend-icon="mdi-cash-minus"
          data-test="debt-link-capital"
          @update:model-value="update({ capital: Number($event) })"
        />
        <v-text-field
          :model-value="formatCurrency(interest)"
          label="Cantidad a interés"
          readonly
          prepend-icon="mdi-percent"
          hint="Lo pagado que no abona al capital"
          persistent-hint
          data-test="debt-link-interest"
        />
      </template>

      <v-text-field
        v-else
        :model-value="modelValue.extraInterest"
        label="Cantidad adicional de interés"
        type="number"
        step="0.01"
        prepend-icon="mdi-percent"
        data-test="debt-link-extra-interest"
        @update:model-value="update({ extraInterest: Number($event) })"
      />
    </template>
  </div>
</template>
