import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreditCardRepository } from '../../application/ports/credit-card.repository';
import { CreditCard } from '../../domain/entities/credit-card.entity';
import { CreditCardDocument, CreditCardModel } from './credit-card.schema';

@Injectable()
export class MongoCreditCardRepository implements CreditCardRepository {
  constructor(
    @InjectModel(CreditCardModel.name)
    private readonly model: Model<CreditCardModel>,
  ) {}

  async findByAccountId(accountId: string): Promise<CreditCard | null> {
    const doc = await this.model.findOne({ accountId }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByAccountIds(accountIds: string[]): Promise<CreditCard[]> {
    const docs = await this.model
      .find({ accountId: { $in: accountIds } })
      .exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async save(card: CreditCard): Promise<CreditCard> {
    const doc = await this.model
      .findOneAndUpdate(
        { uuid: card.id },
        {
          $set: {
            accountId: card.accountId,
            creditLimit: card.creditLimit,
            usedAmount: card.usedAmount,
            cutoffDate: card.cutoffDate,
            paymentDate: card.paymentDate,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    return this.toEntity(doc);
  }

  async adjustUsedAmount(
    accountId: string,
    delta: number,
  ): Promise<CreditCard | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { accountId },
        { $inc: { usedAmount: delta } },
        { new: true },
      )
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async deleteByAccountId(accountId: string): Promise<void> {
    await this.model.deleteMany({ accountId }).exec();
  }

  private toEntity(doc: CreditCardDocument): CreditCard {
    return CreditCard.restore({
      id: doc.uuid,
      accountId: doc.accountId,
      creditLimit: doc.creditLimit,
      usedAmount: doc.usedAmount,
      cutoffDate: doc.cutoffDate,
      paymentDate: doc.paymentDate,
    });
  }
}
