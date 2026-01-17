import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean()
  allowDeceasedDiscoveryDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDeceasedDetailsDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAdminSupportAccess?: boolean;
}
