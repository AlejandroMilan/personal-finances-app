import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DebtRepository } from '../../application/ports/debt.repository';
import { Debt } from '../../domain/entities/debt.entity';
import { DebtDocument, DebtModel } from './debt.schema';

@Injectable()
export class MongoDebtRepository implements DebtRepository {
  constructor(
    @InjectModel(DebtModel.name)
    private readonly model: Model<DebtModel>,
  ) {}

  async findById(id: string): Promise<Debt | null> {
    const doc = await this.model.findOne({ uuid: id }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(userId: string): Promise<Debt[]> {
    const docs = await this.model
      .find({ userId })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async save(debt: Debt): Promise<Debt> {
    const doc = await this.model
      .findOneAndUpdate(
        { uuid: debt.id },
        {
          $set: {
            userId: debt.userId,
            name: debt.name,
            totalAmount: debt.totalAmount,
            revolving: debt.revolving,
            annualInterestRate: debt.annualInterestRate,
            paymentMode: debt.paymentMode,
            createdAt: debt.createdAt,
            updatedAt: debt.updatedAt,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    return this.toEntity(doc);
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ uuid: id }).exec();
  }

  private toEntity(doc: DebtDocument): Debt {
    return Debt.restore({
      id: doc.uuid,
      userId: doc.userId,
      name: doc.name,
      totalAmount: doc.totalAmount,
      revolving: doc.revolving,
      annualInterestRate: doc.annualInterestRate ?? null,
      paymentMode: doc.paymentMode,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
