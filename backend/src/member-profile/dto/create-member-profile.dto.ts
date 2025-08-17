import { IsOptional, IsString, IsUrl, IsObject } from 'class-validator';

export class CreateMemberProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsUrl()
  coverMediaUrl?: string;

  @IsOptional()
  @IsObject()
  achievements?: any;

  @IsOptional()
  @IsObject()
  facts?: any;

  @IsOptional()
  @IsObject()
  favorites?: any;

  @IsOptional()
  @IsObject()
  education?: any;

  @IsOptional()
  @IsObject()
  work?: any;

  @IsOptional()
  @IsObject()
  personalInfo?: any;
}
