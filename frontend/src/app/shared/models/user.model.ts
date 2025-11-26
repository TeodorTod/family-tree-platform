import { Lang } from '../types/lang.type';
import { SubscriptionPlanCode } from '../types/subscription-plan.type';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  language: Lang;
  displayName?: string | null;
  provider?: string | null;
  picture?: string | null;
  updatedAt?: string | null;
  hasPassword?: boolean;
  subscriptionPlan?: SubscriptionPlanCode | null;
  subscriptionStartAt?: string | null;
  subscriptionEndAt?: string | null;
}
