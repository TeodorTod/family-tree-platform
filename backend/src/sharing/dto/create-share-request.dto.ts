import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShareRequestDto {
  @IsString()
  targetMemberId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

