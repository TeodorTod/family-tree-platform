import { IsString } from 'class-validator';

export class CreateRelationshipDto {
  @IsString()
  fromMemberId!: string;

  @IsString()
  toMemberId!: string;

  @IsString()
  type!: string;
}
