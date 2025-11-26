import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator';
import {
  SUBSCRIPTION_PLAN_CODES,
  SubscriptionPlanCode,
} from 'src/shared/enums/subscription-plan.enum';

export class CreateCheckoutSessionDto {
  @IsIn(SUBSCRIPTION_PLAN_CODES)
  plan!: SubscriptionPlanCode;

  @IsOptional()
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  successUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  cancelUrl?: string;
}
