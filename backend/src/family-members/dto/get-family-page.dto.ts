import { IsInt, Min, IsString, IsIn } from 'class-validator';

export class GetFamilyPagedDto {
  @IsInt()
  @Min(0)
  page: number;

  @IsInt()
  @Min(1)
  size: number;

  @IsString()
  @IsIn(['firstName', 'lastName', 'dob', 'role'])
  sortField: string;

  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc';
}