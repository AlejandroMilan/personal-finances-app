import type {
  CategoryView,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/category';
import { apiFetch } from './api';

export const categoriesService = {
  list(): Promise<CategoryView[]> {
    return apiFetch<CategoryView[]>('/categories');
  },

  create(payload: CreateCategoryPayload): Promise<CategoryView> {
    return apiFetch<CategoryView>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateCategoryPayload): Promise<CategoryView> {
    return apiFetch<CategoryView>(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`/categories/${id}`, { method: 'DELETE' });
  },
};
