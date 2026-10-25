import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ListDebtMovementsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  debtId?: string;
}
