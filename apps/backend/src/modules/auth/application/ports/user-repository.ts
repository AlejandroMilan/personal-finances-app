import { User } from '../../domain/entities/user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

export const USER_REPOSITORY = 'USER_REPOSITORY';
