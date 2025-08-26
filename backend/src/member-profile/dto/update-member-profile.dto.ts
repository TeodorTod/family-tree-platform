import { PartialType } from '@nestjs/mapped-types';
import { CreateMemberProfileDto } from './create-member-profile.dto';

export class UpdateMemberProfileDto extends PartialType(
  CreateMemberProfileDto,
) {}
