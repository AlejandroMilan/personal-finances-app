import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AccountType } from '../../domain/account-type.enum';

export type AccountDocument = HydratedDocument<AccountModel>;

@Schema({ collection: 'accounts' })
export class AccountModel {
  @Prop({ required: true, unique: true, index: true })
  uuid: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  balance: number;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true, enum: AccountType })
  type: AccountType;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export const AccountSchema = SchemaFactory.createForClass(AccountModel);
