import { UnauthorizedException } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { PasswordHasher } from '../ports/password-hasher';
import { TokenService } from '../ports/token-service';
import { UserRepository } from '../ports/user-repository';
import { AuthenticateUserUseCase } from './authenticate-user.use-case';

describe('AuthenticateUserUseCase', () => {
  const repository = { findByEmail: jest.fn(), save: jest.fn() };
  const hasher = { hash: jest.fn(), compare: jest.fn() };
  const tokenService = { sign: jest.fn() };
  let useCase: AuthenticateUserUseCase;

  const user = () =>
    User.restore({
      id: 'u1',
      fullName: 'Ana García',
      email: 'ana@mail.com',
      passwordHash: 'hashed-password',
      registeredAt: new Date(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AuthenticateUserUseCase(
      repository as unknown as UserRepository,
      hasher as unknown as PasswordHasher,
      tokenService as unknown as TokenService,
    );
  });

  it('returns a token and the user for valid credentials', async () => {
    repository.findByEmail.mockResolvedValue(user());
    hasher.compare.mockResolvedValue(true);
    tokenService.sign.mockReturnValue('jwt-token');

    const result = await useCase.execute({ email: ' ANA@mail.com ', password: 'secret123' });

    expect(repository.findByEmail).toHaveBeenCalledWith('ana@mail.com');
    expect(hasher.compare).toHaveBeenCalledWith('secret123', 'hashed-password');
    expect(tokenService.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'ana@mail.com' });
    expect(result.token).toBe('jwt-token');
    expect(result.user.id).toBe('u1');
  });

  it('throws UnauthorizedException when the user does not exist', async () => {
    repository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'ghost@mail.com', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(hasher.compare).not.toHaveBeenCalled();
    expect(tokenService.sign).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the password does not match', async () => {
    repository.findByEmail.mockResolvedValue(user());
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'ana@mail.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(tokenService.sign).not.toHaveBeenCalled();
  });
});
