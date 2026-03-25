import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CustomerPagedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  /** Customer classification code (e.g. COMPANY) */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;
}
