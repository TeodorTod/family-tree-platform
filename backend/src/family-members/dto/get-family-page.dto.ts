import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  toCsvArray,
  FIELD_WHITELIST,
  WITH_WHITELIST,
} from './get-my-tree.query';

export class GetFamilyPagedDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size: number;

  @IsString()
  @IsIn(['firstName', 'lastName', 'dob', 'role'])
  sortField: 'firstName' | 'lastName' | 'dob' | 'role';

  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc';

  @IsOptional()
  @Transform(({ value }) => toCsvArray(value))
  @IsIn(FIELD_WHITELIST as readonly string[], { each: true })
  fields?: string[];

  @IsOptional()
  @Transform(({ value }) => toCsvArray(value))
  @IsIn(WITH_WHITELIST as readonly string[], { each: true })
  with?: string[];
}
