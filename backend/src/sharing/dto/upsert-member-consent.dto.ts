import { IsBoolean, IsString } from 'class-validator';

export class UpsertMemberConsentDto {
  @IsString()
  memberId!: string;

  @IsBoolean()
  allowDiscovery!: boolean;

  @IsBoolean()
  allowDetails!: boolean;
}

