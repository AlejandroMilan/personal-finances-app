import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaginatedTransactions,
  TransactionFilters,
  TransactionRepository,
} from '../../application/ports/transaction.repository';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import { TransactionDocument, TransactionModel } from './transaction.schema';

interface TransactionFilterQuery {
  userId: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  title?: { $regex: string; $options: string };
  tags?: { $in: string[] };
  timestamp?: { $gte?: Date; $lte?: Date };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class MongoTransactionRepository implements TransactionRepository {
  constructor(
    @InjectModel(TransactionModel.name)
    private readonly model: Model<TransactionModel>,
  ) {}

  async findById(id: string): Promise<Transaction | null> {
    const doc = await this.model.findOne({ uuid: id }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(
    userId: string,
    filters: TransactionFilters,
  ): Promise<PaginatedTransactions> {
    const query = this.buildQuery(userId, filters);
    const skip = (filters.page - 1) * filters.limit;

    const [docs, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(filters.limit)
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toEntity(doc)),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async save(transaction: Transaction): Promise<Transaction> {
    const doc = await this.model
      .findOneAndUpdate(
        { uuid: transaction.id },
        {
          $set: {
            userId: transaction.userId,
            accountId: transaction.accountId,
            categoryId: transaction.categoryId,
            type: transaction.type,
            title: transaction.title,
            amount: transaction.amount,
            timestamp: transaction.timestamp,
            tags: transaction.tags,
            createdAt: transaction.createdAt,
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

  async deleteByAccountId(accountId: string): Promise<void> {
    await this.model.deleteMany({ accountId }).exec();
  }

  async clearCategoryReferences(categoryId: string): Promise<void> {
    await this.model
      .updateMany({ categoryId }, { $set: { categoryId: null } })
      .exec();
  }

  private buildQuery(
    userId: string,
    filters: TransactionFilters,
  ): TransactionFilterQuery {
    const query: TransactionFilterQuery = { userId };

    if (filters.accountId) {
      query.accountId = filters.accountId;
    }
    if (filters.categoryId) {
      query.categoryId = filters.categoryId;
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.title) {
      query.title = { $regex: escapeRegex(filters.title), $options: 'i' };
    }
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }
    if (filters.from || filters.to) {
      query.timestamp = {};
      if (filters.from) {
        query.timestamp.$gte = filters.from;
      }
      if (filters.to) {
        query.timestamp.$lte = filters.to;
      }
    }

    return query;
  }

  private toEntity(doc: TransactionDocument): Transaction {
    return Transaction.restore({
      id: doc.uuid,
      userId: doc.userId,
      accountId: doc.accountId,
      categoryId: doc.categoryId ?? null,
      type: doc.type,
      title: doc.title,
      amount: doc.amount,
      timestamp: doc.timestamp,
      tags: doc.tags ?? [],
      createdAt: doc.createdAt,
    });
  }
}
