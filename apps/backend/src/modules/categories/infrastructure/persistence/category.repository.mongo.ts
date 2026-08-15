import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryRepository } from '../../application/ports/category.repository';
import { Category } from '../../domain/entities/category.entity';
import { CategoryDocument, CategoryModel } from './category.schema';

@Injectable()
export class MongoCategoryRepository implements CategoryRepository {
  constructor(
    @InjectModel(CategoryModel.name)
    private readonly model: Model<CategoryModel>,
  ) {}

  async findById(id: string): Promise<Category | null> {
    const doc = await this.model.findOne({ uuid: id }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(userId: string): Promise<Category[]> {
    const docs = await this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async save(category: Category): Promise<Category> {
    const doc = await this.model
      .findOneAndUpdate(
        { uuid: category.id },
        {
          $set: {
            userId: category.userId,
            name: category.name,
            color: category.color,
            createdAt: category.createdAt,
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

  private toEntity(doc: CategoryDocument): Category {
    return Category.restore({
      id: doc.uuid,
      userId: doc.userId,
      name: doc.name,
      color: doc.color,
      createdAt: doc.createdAt,
    });
  }
}
