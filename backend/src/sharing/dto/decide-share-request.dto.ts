import { IsEnum } from 'class-validator';

export class DecideShareRequestDto {
  @IsEnum(['APPROVED', 'REJECTED'] as const)
  status!: 'APPROVED' | 'REJECTED';
}

