import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsEnum,
  MaxLength,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { PartnerStatus } from 'generated/prisma';

export class CreateFamilyMemberDto {
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  gender?: string | null;

  @IsDateString()
  @IsOptional()
  dob: string;

  @IsOptional()
  @IsDateString()
  dod?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  birthNote?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  deathYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deathNote?: string;

  @IsBoolean()
  isAlive: boolean;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsString()
  role: string;

  @IsString()
  @IsOptional()
  relationLabel?: string;

  @IsOptional()
  @IsString()
  translatedRole?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsEnum(PartnerStatus)
  partnerStatus?: PartnerStatus;
}
