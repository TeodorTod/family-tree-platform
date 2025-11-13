import { IsString } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  memberId!: string;

  @IsString()
  newRole!: string;
}

