import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class DebtLinkDto {
  @IsIn(['payment', 'increase'])
  kind: 'payment' | 'increase';

  @IsString()
  @IsNotEmpty()
  debtId: string;

  /** Sólo para pagos: parte del monto que abona al capital. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  capitalAmount?: number;

  /** Sólo para aumentos: interés adicional sobre lo recibido. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestAmount?: number;
}
