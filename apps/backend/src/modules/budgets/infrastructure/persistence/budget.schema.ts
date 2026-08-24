import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BudgetItemType } from '../../domain/budget-item-type.enum';
import {
  MAX_BUDGET_ITEMS,
  MAX_BUDGET_NOTE_LENGTH,
} from '../../domain/budget-limits';

@Schema({ _id: false })
export class BudgetItemModel {
  @Prop({ required: true })
  categoryId: string;

  @Prop({ required: true, enum: BudgetItemType })
  type: BudgetItemType;

  @Prop({ required: true })
  amount: number;

  @Prop({ trim: true, maxlength: MAX_BUDGET_NOTE_LENGTH })
  note?: string;
}

export const BudgetItemSchema = SchemaFactory.createForClass(BudgetItemModel);

export type BudgetDocument = HydratedDocument<BudgetModel>;

@Schema({ collection: 'budgets' })
export class BudgetModel {
  @Prop({ required: true, unique: true, index: true })
  uuid: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  month: string;

  @Prop({
    type: [BudgetItemSchema],
    default: [],
    validate: {
      validator: (items: BudgetItemModel[]) =>
        items.length <= MAX_BUDGET_ITEMS,
      message: `A budget cannot contain more than ${MAX_BUDGET_ITEMS} items`,
    },
  })
  items: BudgetItemModel[];

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  updatedAt: Date;
}

export const BudgetSchema = SchemaFactory.createForClass(BudgetModel);
BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });
BudgetSchema.pre('findOneAndUpdate', function () {
  this.setOptions({ runValidators: true });
});
