import {
  IsOptional,
  IsString,
  IsUrl,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MemberNoteDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() contentHtml?: string;
  @IsOptional() @IsString() createdAt?: string;
  @IsOptional() @IsString() updatedAt?: string;
}

export class CreateMemberProfileDto {
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsUrl() coverMediaUrl?: string;

  @IsOptional() achievements?: any;
  @IsOptional() facts?: any;
  @IsOptional() favorites?: any;
  @IsOptional() education?: any;
  @IsOptional() work?: any;
  @IsOptional() personalInfo?: any;
  @IsOptional() stories?: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberNoteDto)
  notes?: MemberNoteDto[];
}
