import { ref } from 'vue';
import { defineStore } from 'pinia';
import { categoriesService } from '../services/categories';
import type {
  CategoryView,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/category';

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<CategoryView[]>([]);
  const loading = ref(false);

  async function fetchCategories(): Promise<void> {
    loading.value = true;
    try {
      categories.value = await categoriesService.list();
    } finally {
      loading.value = false;
    }
  }

  async function createCategory(payload: CreateCategoryPayload): Promise<void> {
    const created = await categoriesService.create(payload);
    categories.value.unshift(created);
  }

  async function updateCategory(
    id: string,
    payload: UpdateCategoryPayload,
  ): Promise<void> {
    const updated = await categoriesService.update(id, payload);
    const index = categories.value.findIndex((category) => category.id === id);
    if (index !== -1) {
      categories.value[index] = updated;
    }
  }

  async function deleteCategory(id: string): Promise<void> {
    await categoriesService.remove(id);
    categories.value = categories.value.filter((category) => category.id !== id);
  }

  return {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
});
