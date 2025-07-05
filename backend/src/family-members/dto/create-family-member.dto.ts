import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateFamilyMemberDto {
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  lastName: string;

  @IsString()
  gender: string;

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

  @IsOptional()
  @IsString()
  biography?: string;

  @IsString()
  role: string;
}
