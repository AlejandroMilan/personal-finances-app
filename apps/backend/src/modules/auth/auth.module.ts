import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PasswordHasher, PASSWORD_HASHER } from './application/ports/password-hasher';
import { TokenService, TOKEN_SERVICE } from './application/ports/token-service';
import { UserRepository, USER_REPOSITORY } from './application/ports/user-repository';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { MongoUserRepository } from './infrastructure/persistence/user.repository.mongo';
import { UserModel, UserSchema } from './infrastructure/persistence/user.schema';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }])],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    AuthenticateUserUseCase,
    { provide: USER_REPOSITORY, useClass: MongoUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    {
      provide: TOKEN_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): TokenService =>
        new JwtTokenService(
          new JwtService(),
          config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
          config.get<string>('JWT_EXPIRES_IN', '1h'),
        ),
    },
  ],
})
export class AuthModule {}
