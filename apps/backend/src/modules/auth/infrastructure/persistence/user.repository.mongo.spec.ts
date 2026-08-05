import { Model } from 'mongoose';
import { User } from '../../domain/entities/user.entity';
import { MongoUserRepository } from './user.repository.mongo';
import { UserModel } from './user.schema';

describe('MongoUserRepository', () => {
  const doc = {
    uuid: 'u1',
    fullName: 'Ana García',
    email: 'ana@mail.com',
    passwordHash: 'hashed-password',
    registeredAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let modelMock: jest.Mock & { findOne: jest.Mock };
  let saveMock: jest.Mock;
  let execMock: jest.Mock;

  beforeEach(() => {
    saveMock = jest.fn().mockResolvedValue(doc);
    execMock = jest.fn().mockResolvedValue(doc);
    modelMock = Object.assign(jest.fn().mockReturnValue({ save: saveMock }), {
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
    });
  });

  const repo = () =>
    new MongoUserRepository(modelMock as unknown as Model<UserModel>);

  it('saves a user mapping the entity to a document', async () => {
    const user = User.restore({
      id: 'u1',
      fullName: 'Ana García',
      email: 'ana@mail.com',
      passwordHash: 'hashed-password',
      registeredAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const saved = await repo().save(user);

    expect(modelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: 'u1',
        fullName: 'Ana García',
        email: 'ana@mail.com',
        passwordHash: 'hashed-password',
      }),
    );
    expect(saveMock).toHaveBeenCalled();
    expect(saved.id).toBe('u1');
    expect(saved.fullName).toBe('Ana García');
    expect(saved.email).toBe('ana@mail.com');
    expect(saved.passwordHash).toBe('hashed-password');
    expect(saved.registeredAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('returns a user entity when the email is found', async () => {
    const found = await repo().findByEmail('ana@mail.com');

    expect(modelMock.findOne).toHaveBeenCalledWith({ email: 'ana@mail.com' });
    expect(found).not.toBeNull();
    expect(found?.id).toBe('u1');
    expect(found?.email).toBe('ana@mail.com');
  });

  it('returns null when the email is not found', async () => {
    execMock.mockResolvedValue(null);

    await expect(repo().findByEmail('ghost@mail.com')).resolves.toBeNull();
  });
});
