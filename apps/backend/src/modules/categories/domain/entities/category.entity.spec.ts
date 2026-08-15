import { Category } from './category.entity';

describe('Category', () => {
  it('creates a category with generated id and creation date', () => {
    const category = Category.create({
      userId: 'u1',
      name: 'Food',
      color: '#2E6B4F',
    });

    expect(category.id).toBeTruthy();
    expect(category.userId).toBe('u1');
    expect(category.name).toBe('Food');
    expect(category.color).toBe('#2E6B4F');
    expect(category.createdAt).toBeInstanceOf(Date);
  });

  it('restores a category from persistence', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const category = Category.restore({
      id: 'c1',
      userId: 'u1',
      name: 'Transport',
      color: '#C98A2D',
      createdAt,
    });

    expect(category.id).toBe('c1');
    expect(category.name).toBe('Transport');
    expect(category.color).toBe('#C98A2D');
    expect(category.createdAt).toBe(createdAt);
  });
});
