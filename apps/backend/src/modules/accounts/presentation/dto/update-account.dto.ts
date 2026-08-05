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

export class UpdateCreditCardDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  creditLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usedAmount?: number;

  @IsOptional()
  @IsDateString()
  cutoffDate?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCreditCardDto)
  creditCard?: UpdateCreditCardDto;
}
