import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountRepository } from '../../application/ports/account.repository';
import { Account } from '../../domain/entities/account.entity';
import { AccountDocument, AccountModel } from './account.schema';

@Injectable()
export class MongoAccountRepository implements AccountRepository {
  constructor(
    @InjectModel(AccountModel.name) private readonly model: Model<AccountModel>,
  ) {}

  async findById(id: string): Promise<Account | null> {
    const doc = await this.model.findOne({ uuid: id }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(userId: string): Promise<Account[]> {
    const docs = await this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async save(account: Account): Promise<Account> {
    const doc = await this.model
      .findOneAndUpdate(
        { uuid: account.id },
        {
          $set: {
            userId: account.userId,
            name: account.name,
            balance: account.balance,
            color: account.color,
            type: account.type,
            createdAt: account.createdAt,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    return this.toEntity(doc);
  }

  async adjustBalance(id: string, delta: number): Promise<Account | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { uuid: id },
        { $inc: { balance: delta } },
        { new: true },
      )
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ uuid: id }).exec();
  }

  private toEntity(doc: AccountDocument): Account {
    return Account.restore({
      id: doc.uuid,
      userId: doc.userId,
      name: doc.name,
      balance: doc.balance,
      color: doc.color,
      type: doc.type,
      createdAt: doc.createdAt,
    });
  }
}
