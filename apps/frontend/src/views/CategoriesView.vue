<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import CategoryFormDialog from '../components/organisms/CategoryFormDialog.vue';
import { useCategoriesStore } from '../stores/categories';
import type { CategoryView, CreateCategoryPayload, UpdateCategoryPayload } from '../types/category';

const categoriesStore = useCategoriesStore();

const formOpen = ref(false);
const editingCategory = ref<CategoryView | null>(null);
const deleteTarget = ref<CategoryView | null>(null);
const deleteOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (value: boolean) => {
    if (!value) deleteTarget.value = null;
  },
});
const deleting = ref(false);
const deleteError = ref('');

onMounted(() => {
  void categoriesStore.fetchCategories();
});

function openCreate(): void {
  editingCategory.value = null;
  formOpen.value = true;
}

function openEdit(category: CategoryView): void {
  editingCategory.value = category;
  formOpen.value = true;
}

async function handleSave(payload: CreateCategoryPayload | UpdateCategoryPayload): Promise<void> {
  try {
    if (editingCategory.value) {
      await categoriesStore.updateCategory(editingCategory.value.id, payload);
    } else {
      await categoriesStore.createCategory(payload as CreateCategoryPayload);
    }
    formOpen.value = false;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Save failed';
    window.alert(message);
  }
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await categoriesStore.deleteCategory(deleteTarget.value.id);
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
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Categories</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
        Add category
      </v-btn>
    </div>

    <v-progress-linear v-if="categoriesStore.loading" indeterminate color="primary" class="mb-4" />

    <v-row v-if="categoriesStore.categories.length > 0" dense>
      <v-col
        v-for="category in categoriesStore.categories"
        :key="category.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card
          class="pa-4"
          color="surface"
          :style="{ borderTop: `4px solid ${category.color}` }"
        >
          <v-card-title class="d-flex align-center justify-space-between pa-0">
            <span class="d-flex align-center">
              <v-icon icon="mdi-tag-multiple" :color="category.color" size="20" class="mr-2" />
              <span class="text-subtitle-1 font-weight-bold">{{ category.name }}</span>
            </span>
            <span>
              <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(category)" />
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                color="error"
                @click="deleteTarget = category"
              />
            </span>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else-if="!categoriesStore.loading" color="surface" class="pa-8 text-center">
      <v-icon icon="mdi-tag-multiple-outline" size="48" color="secondary" class="mb-3" />
      <div class="text-h6">No categories yet</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Create categories to organize your transactions.
      </div>
    </v-card>

    <CategoryFormDialog v-model="formOpen" :category="editingCategory" @save="handleSave" />

    <v-dialog v-model="deleteOpen" max-width="420">
      <v-card color="surface" class="pa-6">
        <v-card-title class="text-h6 pa-0 pb-2">
          Delete category?
        </v-card-title>
        <v-card-text class="pa-0 pb-4">
          "{{ deleteTarget?.name }}" will be permanently removed. Transactions using it will keep their history without a category.
        </v-card-text>
        <v-alert v-if="deleteError" type="error" class="mb-4">{{ deleteError }}</v-alert>
        <div class="d-flex justify-end">
          <v-btn variant="text" class="mr-2" :disabled="deleting" @click="deleteTarget = null">
            Cancel
          </v-btn>
          <v-btn color="error" :loading="deleting" @click="confirmDelete">
            Delete
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>
