import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CategoryTotal,
  PaginatedTransactions,
  SummaryBucket,
  SummaryQuery,
  TransactionFilters,
  TransactionRepository,
  TransactionsSummary,
} from '../../application/ports/transaction.repository';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import { TransactionDocument, TransactionModel } from './transaction.schema';
import {
  buildBucketSequence,
  roundToCents,
} from './bucket-range.util';

interface TransactionFilterQuery {
  userId: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  title?: { $regex: string; $options: string };
  tags?: { $in: string[] };
  timestamp?: { $gte?: Date; $lte?: Date };
}

interface CategoryGroup {
  _id: { type: TransactionType; categoryId: string | null };
  total: number;
}

interface SeriesGroup {
  _id: { bucket: Date; type: TransactionType };
  total: number;
}

interface SummaryFacets {
  byCategory: CategoryGroup[];
  series: SeriesGroup[];
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
            destinationAccountId: transaction.destinationAccountId,
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

  async deleteByAccountId(userId: string, accountId: string): Promise<void> {
    await this.model
      .deleteMany({
        userId,
        $or: [{ accountId }, { destinationAccountId: accountId }],
      })
      .exec();
  }

  async clearCategoryReferences(categoryId: string): Promise<void> {
    await this.model
      .updateMany({ categoryId }, { $set: { categoryId: null } })
      .exec();
  }

  async summarize(
    userId: string,
    query: SummaryQuery,
  ): Promise<TransactionsSummary> {
    const truncatedBucket = {
      $dateTrunc: {
        date: '$timestamp',
        unit: query.granularity,
        timezone: query.timeZone,
      },
    };

    const [facets] = await this.model
      .aggregate<SummaryFacets>([
        {
          $match: {
            userId,
            type: { $ne: TransactionType.TRANSFER },
            timestamp: { $gte: query.from, $lte: query.to },
          },
        },
        {
          $facet: {
            byCategory: [
              {
                $group: {
                  _id: {
                    type: '$type',
                    categoryId: { $ifNull: ['$categoryId', null] },
                  },
                  total: { $sum: '$amount' },
                },
              },
            ],
            series: [
              {
                $group: {
                  _id: { bucket: truncatedBucket, type: '$type' },
                  total: { $sum: '$amount' },
                },
              },
            ],
          },
        },
      ])
      .exec();

    return {
      totals: this.toTotals(facets?.byCategory ?? []),
      byCategory: {
        income: this.toCategoryTotals(
          facets?.byCategory ?? [],
          TransactionType.INCOME,
        ),
        expense: this.toCategoryTotals(
          facets?.byCategory ?? [],
          TransactionType.EXPENSE,
        ),
      },
      series: this.toSeries(facets?.series ?? [], query),
    };
  }

  private toTotals(groups: CategoryGroup[]): {
    income: number;
    expense: number;
  } {
    const sumOf = (type: TransactionType): number =>
      groups
        .filter((group) => group._id.type === type)
        .reduce((total, group) => total + group.total, 0);

    return {
      income: roundToCents(sumOf(TransactionType.INCOME)),
      expense: roundToCents(sumOf(TransactionType.EXPENSE)),
    };
  }

  private toCategoryTotals(
    groups: CategoryGroup[],
    type: TransactionType,
  ): CategoryTotal[] {
    return groups
      .filter((group) => group._id.type === type)
      .map((group) => ({
        categoryId: group._id.categoryId ?? null,
        total: roundToCents(group.total),
      }))
      .sort((a, b) => b.total - a.total);
  }

  /** Rellena con ceros los intervalos sin movimientos para que la serie no tenga huecos. */
  private toSeries(
    groups: SeriesGroup[],
    query: SummaryQuery,
  ): SummaryBucket[] {
    const totals = new Map<string, { income: number; expense: number }>();

    for (const group of groups) {
      const key = new Date(group._id.bucket).toISOString();
      const entry = totals.get(key) ?? { income: 0, expense: 0 };
      if (group._id.type === TransactionType.INCOME) {
        entry.income += group.total;
      } else if (group._id.type === TransactionType.EXPENSE) {
        entry.expense += group.total;
      }
      totals.set(key, entry);
    }

    return buildBucketSequence(
      query.from,
      query.to,
      query.granularity,
      query.timeZone,
    ).map((bucket) => {
      const entry = totals.get(bucket.toISOString()) ?? { income: 0, expense: 0 };
      return {
        bucket,
        income: roundToCents(entry.income),
        expense: roundToCents(entry.expense),
      };
    });
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
      destinationAccountId: doc.destinationAccountId ?? null,
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
