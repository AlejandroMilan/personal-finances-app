<script setup lang="ts">
import { ref, watch } from 'vue';
import type {
  CategoryView,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../../types/category';

const props = defineProps<{
  modelValue: boolean;
  category: CategoryView | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [payload: CreateCategoryPayload | UpdateCategoryPayload];
}>();

const presetColors = ['#2E6B4F', '#7FA56E', '#D9C5A0', '#C98A2D', '#2F6D80', '#B3261E'];

const form = ref<{ validate: () => Promise<string[]> } | null>(null);
const name = ref('');
const color = ref(presetColors[0]);
const saving = ref(false);
const error = ref('');

const nameRules = [(value: string) => !!value.trim() || 'Name is required'];

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    error.value = '';
    if (props.category) {
      name.value = props.category.name;
      color.value = props.category.color;
    } else {
      name.value = '';
      color.value = presetColors[0];
    }
  },
);

async function save(): Promise<void> {
  const errors = form.value ? await form.value.validate() : [];
  if (errors.length > 0) return;

  saving.value = true;
  try {
    emit('save', { name: name.value, color: color.value });
  } finally {
    saving.value = false;
  }
}

function close(): void {
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="420" @update:model-value="emit('update:modelValue', $event)">
    <v-card color="surface" class="pa-6">
      <v-card-title class="text-h5 font-weight-bold pa-0 pb-4">
        {{ category ? 'Edit category' : 'New category' }}
      </v-card-title>

      <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

      <v-form ref="form" @submit.prevent="save">
        <v-text-field v-model="name" label="Name" :rules="nameRules" prepend-icon="mdi-tag-multiple" />

        <div class="d-flex align-center mb-2">
          <span class="text-body-2 text-medium-emphasis mr-3">Color</span>
          <v-btn
            v-for="preset in presetColors"
            :key="preset"
            :color="preset"
            size="x-small"
            class="ma-1"
            :variant="color === preset ? 'elevated' : 'tonal'"
            @click="color = preset"
          />
        </div>

        <div class="d-flex justify-end mt-4">
          <v-btn variant="text" class="mr-2" @click="close">Cancel</v-btn>
          <v-btn color="primary" type="submit" :loading="saving">
            {{ category ? 'Save changes' : 'Create category' }}
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
