import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ScheduledTransactionFilters,
  ScheduledTransactionRepository,
} from '../../application/ports/scheduled-transaction.repository';
import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import {
  ScheduledTransactionDocument,
  ScheduledTransactionModel,
} from './scheduled-transaction.schema';

interface ScheduledTransactionFilterQuery {
  userId: string;
  status?: ScheduledTransactionStatus;
  scheduledFor?: { $gte?: Date; $lte?: Date };
}

@Injectable()
export class MongoScheduledTransactionRepository implements ScheduledTransactionRepository {
  constructor(
    @InjectModel(ScheduledTransactionModel.name)
    private readonly model: Model<ScheduledTransactionModel>,
  ) {}

  async findById(id: string): Promise<ScheduledTransaction | null> {
    const doc = await this.model.findOne({ uuid: id }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(
    userId: string,
    filters: ScheduledTransactionFilters,
  ): Promise<ScheduledTransaction[]> {
    const docs = await this.model
      .find(this.buildQuery(userId, filters))
      .sort({ scheduledFor: 1 })
      .exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async save(scheduled: ScheduledTransaction): Promise<ScheduledTransaction> {
    const doc = await this.model
      .findOneAndUpdate(
        { uuid: scheduled.id },
        {
          $set: {
            userId: scheduled.userId,
            accountId: scheduled.accountId,
            categoryId: scheduled.categoryId,
            type: scheduled.type,
            title: scheduled.title,
            amount: scheduled.amount,
            tags: scheduled.tags,
            scheduledFor: scheduled.scheduledFor,
            recurring: scheduled.recurring,
            status: scheduled.status,
            transactionId: scheduled.transactionId,
            createdAt: scheduled.createdAt,
            updatedAt: scheduled.updatedAt,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    return this.toEntity(doc);
  }

  async deleteById(id: string): Promise<void> {
    await this.model.deleteOne({ uuid: id }).exec();
  }

  private buildQuery(
    userId: string,
    filters: ScheduledTransactionFilters,
  ): ScheduledTransactionFilterQuery {
    const query: ScheduledTransactionFilterQuery = { userId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.from || filters.to) {
      query.scheduledFor = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }

    return query;
  }

  private toEntity(doc: ScheduledTransactionDocument): ScheduledTransaction {
    return ScheduledTransaction.restore({
      id: doc.uuid,
      userId: doc.userId,
      accountId: doc.accountId,
      categoryId: doc.categoryId ?? null,
      type: doc.type,
      title: doc.title,
      amount: doc.amount,
      tags: doc.tags ?? [],
      scheduledFor: doc.scheduledFor,
      recurring: doc.recurring,
      status: doc.status,
      transactionId: doc.transactionId ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
