<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  buildCustomPeriodRange,
  buildPeriodRange,
  parseDateInput,
  toDateInput,
  type PeriodKind,
  type PeriodPreset,
  type PeriodRange,
} from '../../utils/period';

const props = defineProps<{ kind: PeriodKind }>();

const emit = defineEmits<{ select: [PeriodRange] }>();

const presets: { value: PeriodPreset; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
];

const dialogOpen = ref(false);
const customFrom = ref(toDateInput(new Date()));
const customTo = ref(toDateInput(new Date()));

const customIsValid = computed(() => {
  const from = parseDateInput(customFrom.value);
  const to = parseDateInput(customTo.value);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return false;
  }
  return from.getTime() <= to.getTime();
});

function selectPreset(preset: PeriodPreset): void {
  emit('select', buildPeriodRange(preset));
}

function applyCustom(): void {
  if (!customIsValid.value) {
    return;
  }
  emit(
    'select',
    buildCustomPeriodRange(
      parseDateInput(customFrom.value),
      parseDateInput(customTo.value),
    ),
  );
  dialogOpen.value = false;
}
</script>

<template>
  <div class="d-flex flex-wrap align-center ga-2">
    <v-chip
      v-for="preset in presets"
      :key="preset.value"
      :data-test="`preset-${preset.value}`"
      :variant="props.kind === preset.value ? 'flat' : 'tonal'"
      :color="props.kind === preset.value ? 'primary' : 'secondary'"
      size="small"
      @click="selectPreset(preset.value)"
    >
      {{ preset.label }}
    </v-chip>

    <v-chip
      data-test="preset-custom"
      :variant="props.kind === 'custom' ? 'flat' : 'tonal'"
      :color="props.kind === 'custom' ? 'primary' : 'secondary'"
      size="small"
      prepend-icon="mdi-calendar-range"
      @click="dialogOpen = true"
    >
      Personalizado
    </v-chip>

    <v-dialog v-model="dialogOpen" max-width="420">
      <v-card color="surface" class="pa-2">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Periodo personalizado
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="customFrom"
            data-test="custom-from"
            label="Desde"
            type="date"
            density="comfortable"
          />
          <v-text-field
            v-model="customTo"
            data-test="custom-to"
            label="Hasta"
            type="date"
            density="comfortable"
          />
          <div v-if="!customIsValid" class="text-caption text-error">
            La fecha de inicio no puede ser posterior a la de fin.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">Cancelar</v-btn>
          <v-btn
            data-test="custom-apply"
            color="primary"
            variant="flat"
            :disabled="!customIsValid"
            @click="applyCustom"
          >
            Aplicar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
