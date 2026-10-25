import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DebtPaymentMode } from '../../domain/debt-payment-mode.enum';

export type DebtDocument = HydratedDocument<DebtModel>;

@Schema({ collection: 'debts' })
export class DebtModel {
  @Prop({ required: true, unique: true, index: true })
  uuid: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true, default: false })
  revolving: boolean;

  @Prop({ type: Number, default: null })
  annualInterestRate: number | null;

  @Prop({
    type: String,
    enum: Object.values(DebtPaymentMode),
    required: true,
  })
  paymentMode: DebtPaymentMode;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  updatedAt: Date;
}

export const DebtSchema = SchemaFactory.createForClass(DebtModel);
