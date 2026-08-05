import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AccountType } from '../../domain/account-type.enum';

export class CreditCardDto {
  @IsNumber()
  @IsPositive()
  creditLimit: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usedAmount?: number;

  @IsDateString()
  cutoffDate: string;

  @IsDateString()
  paymentDate: string;
}

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsNumber()
  balance: number;

  @IsHexColor()
  color: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreditCardDto)
  creditCard?: CreditCardDto;
}
