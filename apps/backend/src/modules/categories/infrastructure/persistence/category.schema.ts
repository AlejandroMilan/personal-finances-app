import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<CategoryModel>;

@Schema({ collection: 'categories' })
export class CategoryModel {
  @Prop({ required: true, unique: true, index: true })
  uuid: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  color: string;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(CategoryModel);
CategorySchema.index({ userId: 1, name: 1 }, { unique: true });
