import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserRepository } from '../../application/ports/user-repository';
import { User } from '../../domain/entities/user.entity';
import { UserDocument, UserModel } from './user.schema';

@Injectable()
export class MongoUserRepository implements UserRepository {
  constructor(@InjectModel(UserModel.name) private readonly model: Model<UserModel>) {}

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.model.findOne({ email }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async save(user: User): Promise<User> {
    const doc = new this.model({
      uuid: user.id,
      fullName: user.fullName,
      email: user.email,
      passwordHash: user.passwordHash,
      registeredAt: user.registeredAt,
    });
    const saved = await doc.save();
    return this.toEntity(saved);
  }

  private toEntity(doc: UserDocument): User {
    return User.restore({
      id: doc.uuid,
      fullName: doc.fullName,
      email: doc.email,
      passwordHash: doc.passwordHash,
      registeredAt: doc.registeredAt,
    });
  }
}
