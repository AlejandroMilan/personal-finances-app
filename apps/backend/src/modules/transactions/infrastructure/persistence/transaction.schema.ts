import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TransactionType } from '../../domain/transaction-type.enum';

export type TransactionDocument = HydratedDocument<TransactionModel>;

@Schema({ collection: 'transactions' })
export class TransactionModel {
  @Prop({ required: true, unique: true, index: true })
  uuid: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop({ index: true })
  categoryId: string;

  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: Date, required: true, index: true })
  timestamp: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(TransactionModel);
TransactionSchema.index({ userId: 1, timestamp: -1 });
