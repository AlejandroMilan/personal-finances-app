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
  let sessionGeneration = 0;
  let requestId = 0;

  function isCurrentRequest(generation: number, request: number): boolean {
    return generation === sessionGeneration && request === requestId;
  }

  function clear(): void {
    sessionGeneration += 1;
    requestId += 1;
    categories.value = [];
    loading.value = false;
  }

  async function fetchCategories(): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    loading.value = true;
    try {
      const loadedCategories = await categoriesService.list();
      if (isCurrentRequest(generation, request)) {
        categories.value = loadedCategories;
      }
    } finally {
      if (isCurrentRequest(generation, request)) {
        loading.value = false;
      }
    }
  }

  async function createCategory(payload: CreateCategoryPayload): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    loading.value = false;
    const created = await categoriesService.create(payload);
    if (!isCurrentRequest(generation, request)) return;
    categories.value.unshift(created);
  }

  async function updateCategory(
    id: string,
    payload: UpdateCategoryPayload,
  ): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    loading.value = false;
    const updated = await categoriesService.update(id, payload);
    if (!isCurrentRequest(generation, request)) return;
    const index = categories.value.findIndex((category) => category.id === id);
    if (index !== -1) {
      categories.value[index] = updated;
    }
  }

  async function deleteCategory(id: string): Promise<void> {
    const generation = sessionGeneration;
    const request = ++requestId;
    loading.value = false;
    await categoriesService.remove(id);
    if (!isCurrentRequest(generation, request)) return;
    categories.value = categories.value.filter((category) => category.id !== id);
  }

  return {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    clear,
  };
});
