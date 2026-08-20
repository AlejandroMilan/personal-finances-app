import { IsDateString, IsEnum, IsOptional, IsTimeZone } from 'class-validator';

export enum SummaryGranularityDto {
  HOUR = 'hour',
  DAY = 'day',
  MONTH = 'month',
}

export class GetSummaryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsEnum(SummaryGranularityDto)
  granularity: SummaryGranularityDto;

  /** Zona IANA del cliente; alinea los buckets a su calendario local. */
  @IsOptional()
  @IsTimeZone()
  timeZone?: string;
}
