import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class QuoteBouquetDto {
  @IsInt() @Min(1) @Max(2147483647) bouquetId!: number;
  @IsInt() @Min(1) @Max(2147483647) specId!: number;
  @IsInt() @Min(1) @Max(999) quantity!: number;
  @IsString() @MinLength(1) @MaxLength(500) address!: string;
}
export class CreateBouquetOrderDto extends QuoteBouquetDto {
  @IsString() @Matches(/^[a-zA-Z0-9-]{16,64}$/) requestKey!: string;
  @IsString() @MinLength(1) @MaxLength(64) contactName!: string;
  @IsString() @Matches(/^1\d{10}$/) contactPhone!: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  @IsInt() @Min(0) @Max(999999999) expectedAmount!: number;
}
export class BouquetSettingsDto {
  @IsBoolean() customEnabled!: boolean;
  @IsString() @MinLength(1) @MaxLength(500) deliveryArea!: string;
  /** 整数分。 */
  @IsInt() @Min(0) @Max(999999999) deliveryFee!: number;
  @IsString() @MaxLength(255) businessHours!: string;
  @IsString() @MaxLength(32) servicePhone!: string;
  @IsString() @MaxLength(255) deliveryStaff!: string;
}
export class CustomOrderQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsIn(['PENDING_DISPATCH', 'DISPATCHED', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'CLOSED']) status?: 'PENDING_DISPATCH' | 'DISPATCHED' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
}
export class CustomOrderAction {
  @IsIn(['dispatch', 'deliver', 'complete', 'cancel']) action!: string;
  @IsInt() @Min(0) version!: number;
  @IsOptional() @IsString() @MaxLength(100) partnerName?: string;
  @IsOptional() @IsString() @MaxLength(32) partnerPhone?: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}
