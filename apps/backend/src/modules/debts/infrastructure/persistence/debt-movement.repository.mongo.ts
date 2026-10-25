import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DebtMovementRepository } from '../../application/ports/debt-movement.repository';
import { DebtMovement } from '../../domain/entities/debt-movement.entity';
import {
  DebtMovementDocument,
  DebtMovementModel,
} from './debt-movement.schema';

@Injectable()
export class MongoDebtMovementRepository implements DebtMovementRepository {
  constructor(
    @InjectModel(DebtMovementModel.name)
    private readonly model: Model<DebtMovementModel>,
  ) {}

  async findByUserId(userId: string): Promise<DebtMovement[]> {
    const docs = await this.model.find({ userId }).exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async findByDebtId(debtId: string): Promise<DebtMovement[]> {
    const docs = await this.model.find({ debtId }).exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async findByTransactionId(transactionId: string): Promise<DebtMovement[]> {
    const docs = await this.model.find({ transactionId }).exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async save(movement: DebtMovement): Promise<DebtMovement> {
    const doc = await this.model
      .findOneAndUpdate(
        { uuid: movement.id },
        {
          $set: {
            userId: movement.userId,
            debtId: movement.debtId,
            kind: movement.kind,
            delta: movement.delta,
            amount: movement.amount,
            capitalAmount: movement.capitalAmount,
            interestAmount: movement.interestAmount,
            transactionId: movement.transactionId,
            occurredAt: movement.occurredAt,
            createdAt: movement.createdAt,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    return this.toEntity(doc);
  }

  async deleteByDebtId(debtId: string): Promise<void> {
    await this.model.deleteMany({ debtId }).exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.model.deleteOne({ uuid: id }).exec();
  }

  private toEntity(doc: DebtMovementDocument): DebtMovement {
    return DebtMovement.restore({
      id: doc.uuid,
      userId: doc.userId,
      debtId: doc.debtId,
      kind: doc.kind,
      delta: doc.delta,
      amount: doc.amount,
      capitalAmount: doc.capitalAmount,
      interestAmount: doc.interestAmount,
      transactionId: doc.transactionId ?? null,
      occurredAt: doc.occurredAt,
      createdAt: doc.createdAt,
    });
  }
}
