import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsEnum,
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
  dob: string;

  @IsOptional()
  @IsDateString()
  dod?: string;

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
