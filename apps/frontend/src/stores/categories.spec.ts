import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/categories', () => ({
  categoriesService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { categoriesService } from '../services/categories';
import type { CategoryView } from '../types/category';
import { useCategoriesStore } from './categories';

const category: CategoryView = {
  id: 'c1',
  name: 'Food',
  color: '#2E6B4F',
};

describe('categories store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches the categories of the user', async () => {
    vi.mocked(categoriesService.list).mockResolvedValue([category]);
    const store = useCategoriesStore();

    await store.fetchCategories();

    expect(store.categories).toHaveLength(1);
    expect(store.categories[0].name).toBe('Food');
    expect(store.loading).toBe(false);
  });

  it('ignores a delayed response from an invalidated session', async () => {
    let resolvePrevious: (value: CategoryView[]) => void = () => undefined;
    const previousResponse = new Promise<CategoryView[]>((resolve) => {
      resolvePrevious = resolve;
    });
    vi.mocked(categoriesService.list)
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce([{ ...category, id: 'c2', name: 'Transport' }]);
    const store = useCategoriesStore();

    const previousFetch = store.fetchCategories();
    store.clear();
    const currentFetch = store.fetchCategories();
    resolvePrevious([category]);

    await Promise.all([previousFetch, currentFetch]);

    expect(store.categories.map((entry) => entry.name)).toEqual(['Transport']);
  });

  it('keeps the newest response when same-session requests finish out of order', async () => {
    let resolvePrevious: (value: CategoryView[]) => void = () => undefined;
    const previousResponse = new Promise<CategoryView[]>((resolve) => {
      resolvePrevious = resolve;
    });
    vi.mocked(categoriesService.list)
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce([{ ...category, id: 'c2', name: 'Transport' }]);
    const store = useCategoriesStore();

    const previousFetch = store.fetchCategories();
    const currentFetch = store.fetchCategories();
    await currentFetch;
    resolvePrevious([category]);
    await previousFetch;

    expect(store.categories.map((entry) => entry.name)).toEqual(['Transport']);
  });

  it('creates a category prepending it to the list', async () => {
    vi.mocked(categoriesService.create).mockResolvedValue(category);
    const store = useCategoriesStore();

    await store.createCategory({ name: 'Food', color: '#2E6B4F' });

    expect(store.categories).toHaveLength(1);
  });

  it('updates a category in place', async () => {
    vi.mocked(categoriesService.update).mockResolvedValue({ ...category, name: 'Groceries' });
    const store = useCategoriesStore();
    store.categories = [category];

    await store.updateCategory('c1', { name: 'Groceries' });

    expect(store.categories[0].name).toBe('Groceries');
  });

  it('removes a category from the list', async () => {
    vi.mocked(categoriesService.remove).mockResolvedValue(undefined);
    const store = useCategoriesStore();
    store.categories = [category];

    await store.deleteCategory('c1');

    expect(categoriesService.remove).toHaveBeenCalledWith('c1');
    expect(store.categories).toHaveLength(0);
  });
});
