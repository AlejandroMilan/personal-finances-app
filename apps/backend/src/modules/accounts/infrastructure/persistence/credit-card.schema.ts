import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CreditCardDocument = HydratedDocument<CreditCardModel>;

@Schema({ collection: 'credit_cards' })
export class CreditCardModel {
  @Prop({ required: true, unique: true, index: true })
  uuid: string;

  @Prop({ required: true, unique: true, index: true })
  accountId: string;

  @Prop({ required: true })
  creditLimit: number;

  @Prop({ required: true })
  usedAmount: number;

  @Prop({ type: Date, required: true })
  cutoffDate: Date;

  @Prop({ type: Date, required: true })
  paymentDate: Date;
}

export const CreditCardSchema = SchemaFactory.createForClass(CreditCardModel);
