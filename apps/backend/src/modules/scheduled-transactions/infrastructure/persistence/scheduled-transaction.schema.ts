import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';

export type ScheduledTransactionDocument =
  HydratedDocument<ScheduledTransactionModel>;

@Schema({ collection: 'scheduled_transactions' })
export class ScheduledTransactionModel {
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

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Date, required: true, index: true })
  scheduledFor: Date;

  @Prop({ required: true, default: false })
  recurring: boolean;

  @Prop({ required: true, enum: ScheduledTransactionStatus })
  status: ScheduledTransactionStatus;

  @Prop()
  transactionId: string;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  updatedAt: Date;
}

export const ScheduledTransactionSchema = SchemaFactory.createForClass(
  ScheduledTransactionModel,
);
ScheduledTransactionSchema.index({ userId: 1, status: 1, scheduledFor: 1 });
