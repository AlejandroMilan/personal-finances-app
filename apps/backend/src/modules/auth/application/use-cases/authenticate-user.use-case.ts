import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { PasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher';
import { TokenService, TOKEN_SERVICE } from '../ports/token-service';
import { UserRepository, USER_REPOSITORY } from '../ports/user-repository';

export interface AuthenticateUserInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  token: string;
  user: User;
}

@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<AuthenticatedUser> {
    const email = input.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.tokenService.sign({ sub: user.id, email: user.email });
    return { token, user };
  }
}
