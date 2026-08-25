<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CategoryView } from '../../types/category';
import type {
  BudgetItem,
  BudgetItemType,
  CreateBudgetPayload,
} from '../../types/budget';

interface EditableBudgetItem {
  key: number;
  categoryId: string;
  type: BudgetItemType;
  amount: number;
  note: string;
}

const props = defineProps<{
  modelValue: boolean;
  month: string;
  items: BudgetItem[];
  categories: CategoryView[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [payload: CreateBudgetPayload];
}>();

const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const items = ref<EditableBudgetItem[]>([]);
const saving = ref(false);
let nextKey = 0;

const typeOptions: { value: BudgetItemType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

const categoryRules = [
  (value: string) => !!value || 'Category is required',
];
const amountRules = [
  (value: number) =>
    (Number.isFinite(value) && value > 0) || 'Amount must be greater than zero',
];

function cloneItems(source: BudgetItem[]): EditableBudgetItem[] {
  return source.map((item) => ({
    key: nextKey++,
    categoryId: item.categoryId,
    type: item.type,
    amount: item.amount,
    note: item.note ?? '',
  }));
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    items.value = cloneItems(props.items);
  },
  { immediate: true },
);

function addItem(): void {
  items.value.push({
    key: nextKey++,
    categoryId: props.categories[0]?.id ?? '',
    type: 'expense',
    amount: 0,
    note: '',
  });
}

function removeItem(key: number): void {
  items.value = items.value.filter((item) => item.key !== key);
}

function toPayload(item: EditableBudgetItem): BudgetItem {
  const note = item.note.trim();
  return {
    categoryId: item.categoryId,
    type: item.type,
    amount: item.amount,
    ...(note ? { note } : {}),
  };
}

async function save(): Promise<void> {
  const result = form.value ? await form.value.validate() : { valid: true };
  if (!result.valid) return;

  saving.value = true;
  try {
    emit('save', {
      month: props.month,
      items: items.value.map(toPayload),
    });
  } finally {
    saving.value = false;
  }
}

function close(): void {
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="760"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card color="surface" class="pa-6" data-test="budget-form-dialog">
      <v-card-title class="text-h5 font-weight-bold pa-0 pb-1">
        {{ items.length > 0 ? 'Edit budget' : 'New budget' }}
      </v-card-title>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ month }}</div>

      <v-form ref="form" @submit.prevent="save">
        <div v-if="items.length === 0" class="text-body-2 text-medium-emphasis py-4 text-center">
          No proposed items for this month.
        </div>

        <v-card
          v-for="(item, index) in items"
          :key="item.key"
          variant="tonal"
          color="surface"
          class="pa-3 mb-3"
          data-test="budget-item-row"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2 font-weight-medium">Item {{ index + 1 }}</span>
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              aria-label="Remove item"
              data-test="remove-budget-item"
              @click="removeItem(item.key)"
            />
          </div>

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-select
                v-model="item.categoryId"
                label="Category"
                :items="categories"
                item-title="name"
                item-value="id"
                :rules="categoryRules"
                prepend-icon="mdi-tag-multiple"
                data-test="budget-item-category"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="item.type"
                label="Type"
                :items="typeOptions"
                item-title="label"
                item-value="value"
                prepend-icon="mdi-swap-vertical"
                data-test="budget-item-type"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="item.amount"
                label="Planned amount"
                type="number"
                :rules="amountRules"
                prepend-icon="mdi-currency-usd"
                data-test="budget-item-amount"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="item.note"
                label="Note"
                prepend-icon="mdi-note-text-outline"
                data-test="budget-item-note"
              />
            </v-col>
          </v-row>
        </v-card>

        <v-btn
          variant="tonal"
          color="secondary"
          prepend-icon="mdi-plus"
          class="mb-2"
          data-test="add-budget-item"
          @click="addItem"
        >
          Add item
        </v-btn>

        <div class="d-flex justify-end mt-4">
          <v-btn variant="text" class="mr-2" @click="close">Cancel</v-btn>
          <v-btn color="primary" type="submit" :loading="saving" data-test="save-budget">
            Save budget
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
