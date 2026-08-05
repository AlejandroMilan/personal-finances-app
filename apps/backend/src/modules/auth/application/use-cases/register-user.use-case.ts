import { ConflictException, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { PasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher';
import { UserRepository, USER_REPOSITORY } from '../ports/user-repository';
import { Inject } from '@nestjs/common';

export interface RegisterUserInput {
  fullName: string;
  email: string;
  password: string;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = User.create({ fullName: input.fullName.trim(), email, passwordHash });
    return this.userRepository.save(user);
  }
}
