import { Model } from 'mongoose';
import { Category } from '../../domain/entities/category.entity';
import { CategoryModel } from './category.schema';
import { MongoCategoryRepository } from './category.repository.mongo';

describe('MongoCategoryRepository', () => {
  const doc = {
    uuid: 'c1',
    userId: 'u1',
    name: 'Food',
    color: '#2E6B4F',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let modelMock: jest.Mock & {
    findOne: jest.Mock;
    find: jest.Mock;
    deleteOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let execMock: jest.Mock;

  beforeEach(() => {
    execMock = jest.fn().mockResolvedValue(doc);
    modelMock = Object.assign(jest.fn(), {
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: execMock }),
      }),
      deleteOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
    });
  });

  const repo = () =>
    new MongoCategoryRepository(modelMock as unknown as Model<CategoryModel>);

  it('saves a category mapping the entity to a document', async () => {
    const category = Category.restore({
      id: 'c1',
      userId: 'u1',
      name: 'Food',
      color: '#2E6B4F',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const expectedSet = expect.objectContaining({
      name: 'Food',
      color: '#2E6B4F',
    }) as Record<string, unknown>;
    const expectedUpdate = expect.objectContaining({
      $set: expectedSet,
    }) as Record<string, unknown>;

    const saved = await repo().save(category);

    expect(modelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { uuid: 'c1' },
      expectedUpdate,
      { upsert: true, new: true },
    );
    expect(saved.id).toBe('c1');
    expect(saved.name).toBe('Food');
  });

  it('returns a category entity when found by id', async () => {
    const found = await repo().findById('c1');

    expect(modelMock.findOne).toHaveBeenCalledWith({ uuid: 'c1' });
    expect(found?.name).toBe('Food');
    expect(found?.userId).toBe('u1');
  });

  it('returns null when not found by id', async () => {
    execMock.mockResolvedValue(null);

    await expect(repo().findById('missing')).resolves.toBeNull();
  });

  it('returns the categories of a user sorted by creation date', async () => {
    execMock.mockResolvedValue([doc]);

    const categories = await repo().findByUserId('u1');

    expect(modelMock.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(categories).toHaveLength(1);
    expect(categories[0].id).toBe('c1');
  });

  it('deletes a category by id', async () => {
    await repo().delete('c1');

    expect(modelMock.deleteOne).toHaveBeenCalledWith({ uuid: 'c1' });
  });
});
