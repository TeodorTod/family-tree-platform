// dto/set-partner.dto.ts
import { IsString, IsEnum } from 'class-validator';
import { PartnerStatus } from 'src/shared/enums/partner-status.enum';

export class SetPartnerDto {
  @IsString() memberId: string; 
  @IsString() partnerId: string; 
  @IsEnum(PartnerStatus) status: PartnerStatus;
}
