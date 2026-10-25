import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DebtMovementKind } from '../../domain/debt-movement-kind.enum';

export type DebtMovementDocument = HydratedDocument<DebtMovementModel>;

@Schema({ collection: 'debt_movements' })
export class DebtMovementModel {
  @Prop({ required: true, unique: true, index: true })
  uuid: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  debtId: string;

  @Prop({
    type: String,
    enum: Object.values(DebtMovementKind),
    required: true,
  })
  kind: DebtMovementKind;

  @Prop({ required: true })
  delta: number;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  capitalAmount: number;

  @Prop({ required: true })
  interestAmount: number;

  @Prop({ type: String, default: null, index: true })
  transactionId: string | null;

  @Prop({ type: Date, required: true })
  occurredAt: Date;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export const DebtMovementSchema =
  SchemaFactory.createForClass(DebtMovementModel);
