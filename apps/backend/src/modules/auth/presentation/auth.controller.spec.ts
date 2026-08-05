import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../domain/entities/user.entity';
import { AuthenticateUserUseCase } from '../application/use-cases/authenticate-user.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { AuthController } from './auth.controller';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';

describe('AuthController', () => {
  let controller: AuthController;
  const registerUseCase = { execute: jest.fn() };
  const authenticateUseCase = { execute: jest.fn() };

  const user = () =>
    User.restore({
      id: 'u1',
      fullName: 'Ana García',
      email: 'ana@mail.com',
      passwordHash: 'hashed-password',
      registeredAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: RegisterUserUseCase, useValue: registerUseCase },
        { provide: AuthenticateUserUseCase, useValue: authenticateUseCase },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('registers a user and returns its public view', async () => {
    registerUseCase.execute.mockResolvedValue(user());
    const dto: RegisterUserDto = {
      fullName: 'Ana García',
      email: 'ana@mail.com',
      password: 'secret123',
    };

    const response = await controller.register(dto);

    expect(registerUseCase.execute).toHaveBeenCalledWith({
      fullName: 'Ana García',
      email: 'ana@mail.com',
      password: 'secret123',
    });
    expect(response).toEqual({
      user: {
        id: 'u1',
        fullName: 'Ana García',
        email: 'ana@mail.com',
        registeredAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
  });

  it('logs in a user returning a token', async () => {
    authenticateUseCase.execute.mockResolvedValue({ token: 'jwt-token', user: user() });
    const dto: LoginDto = { email: 'ana@mail.com', password: 'secret123' };

    const response = await controller.login(dto);

    expect(authenticateUseCase.execute).toHaveBeenCalledWith({
      email: 'ana@mail.com',
      password: 'secret123',
    });
    expect(response.token).toBe('jwt-token');
    expect(response.user).toMatchObject({ id: 'u1', email: 'ana@mail.com' });
  });
});
