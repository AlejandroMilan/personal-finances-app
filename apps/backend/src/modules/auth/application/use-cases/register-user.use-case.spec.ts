import { ConflictException } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { PasswordHasher } from '../ports/password-hasher';
import { UserRepository } from '../ports/user-repository';
import { RegisterUserUseCase } from './register-user.use-case';

describe('RegisterUserUseCase', () => {
  const repository = { findByEmail: jest.fn(), save: jest.fn() };
  const hasher = { hash: jest.fn(), compare: jest.fn() };
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RegisterUserUseCase(
      repository as unknown as UserRepository,
      hasher as unknown as PasswordHasher,
    );
  });

  it('registers a new user with a hashed password', async () => {
    repository.findByEmail.mockResolvedValue(null);
    hasher.hash.mockResolvedValue('hashed-password');
    const saved = User.restore({
      id: 'u1',
      fullName: 'Ana García',
      email: 'ana@mail.com',
      passwordHash: 'hashed-password',
      registeredAt: new Date(),
    });
    repository.save.mockResolvedValue(saved);

    const result = await useCase.execute({
      fullName: ' Ana García ',
      email: '  ANA@MAIL.COM ',
      password: 'secret123',
    });

    expect(repository.findByEmail).toHaveBeenCalledWith('ana@mail.com');
    expect(hasher.hash).toHaveBeenCalledWith('secret123');
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(result).toBe(saved);
  });

  it('throws ConflictException when the email is already registered', async () => {
    repository.findByEmail.mockResolvedValue(
      User.restore({
        id: 'u1',
        fullName: 'Ana García',
        email: 'ana@mail.com',
        passwordHash: 'hashed',
        registeredAt: new Date(),
      }),
    );

    await expect(
      useCase.execute({ fullName: 'Ana', email: 'ana@mail.com', password: 'secret123' }),
    ).rejects.toThrow(ConflictException);

    expect(hasher.hash).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
