import { User } from './user.entity';

describe('User', () => {
  it('creates a user with generated id and registration date', () => {
    const user = User.create({ fullName: 'Ana García', email: 'ana@mail.com', passwordHash: 'hashed' });

    expect(user.id).toBeTruthy();
    expect(user.fullName).toBe('Ana García');
    expect(user.email).toBe('ana@mail.com');
    expect(user.passwordHash).toBe('hashed');
    expect(user.registeredAt).toBeInstanceOf(Date);
  });

  it('restores a user from persistence', () => {
    const registeredAt = new Date('2026-01-01T00:00:00.000Z');
    const user = User.restore({
      id: 'u1',
      fullName: 'Ana García',
      email: 'ana@mail.com',
      passwordHash: 'hashed',
      registeredAt,
    });

    expect(user.id).toBe('u1');
    expect(user.registeredAt).toBe(registeredAt);
  });
});
