import { IsEnum } from 'class-validator';
import {
  SUBSCRIPTION_PLAN,
  SubscriptionPlanCode,
} from 'src/shared/enums/subscription-plan.enum';

export class UpdateUserSubscriptionDto {
  @IsEnum(SUBSCRIPTION_PLAN)
  plan: SubscriptionPlanCode;
}
