import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthenticateUserUseCase } from '../application/use-cases/authenticate-user.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { User } from '../domain/entities/user.entity';
import { AuthResponse, UserView } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly authenticateUser: AuthenticateUserUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUserDto): Promise<AuthResponse> {
    const user = await this.registerUser.execute({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
    });
    return { user: this.toUserView(user) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    const { token, user } = await this.authenticateUser.execute({
      email: dto.email,
      password: dto.password,
    });
    return { token, user: this.toUserView(user) };
  }

  private toUserView(user: User): UserView {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      registeredAt: user.registeredAt,
    };
  }
}
