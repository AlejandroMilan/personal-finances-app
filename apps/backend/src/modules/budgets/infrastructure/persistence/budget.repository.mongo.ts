import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BudgetFilters,
  BudgetRepository,
} from '../../application/ports/budget.repository';
import { Budget } from '../../domain/entities/budget.entity';
import type { BudgetItem } from '../../domain/budget-item.type';
import {
  BudgetDocument,
  BudgetModel,
} from './budget.schema';

interface BudgetFilterQuery {
  userId: string;
  month?: { $gte?: string; $lte?: string };
}

@Injectable()
export class BudgetMongoRepository implements BudgetRepository {
  constructor(
    @InjectModel(BudgetModel.name)
    private readonly model: Model<BudgetModel>,
  ) {}

  async findByMonth(userId: string, month: string): Promise<Budget | null> {
    const doc = await this.model.findOne({ userId, month }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async list(userId: string, filters: BudgetFilters): Promise<Budget[]> {
    const docs = await this.model
      .find(this.buildQuery(userId, filters))
      .sort({ month: 1 })
      .exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async save(budget: Budget): Promise<Budget> {
    const doc = await this.model
      .findOneAndUpdate(
        { userId: budget.userId, month: budget.month },
        {
          $set: {
            uuid: budget.id,
            userId: budget.userId,
            month: budget.month,
            items: budget.items,
            createdAt: budget.createdAt,
            updatedAt: budget.updatedAt,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    return this.toEntity(doc);
  }

  async deleteByMonth(userId: string, month: string): Promise<void> {
    await this.model.deleteOne({ userId, month }).exec();
  }

  private buildQuery(
    userId: string,
    filters: BudgetFilters,
  ): BudgetFilterQuery {
    const query: BudgetFilterQuery = { userId };

    if (filters.from || filters.to) {
      query.month = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }

    return query;
  }

  private toEntity(doc: BudgetDocument): Budget {
    return Budget.restore({
      id: doc.uuid,
      userId: doc.userId,
      month: doc.month,
      items: doc.items.map((item): BudgetItem => ({
        categoryId: item.categoryId,
        type: item.type,
        amount: item.amount,
        ...(item.note === undefined ? {} : { note: item.note }),
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
