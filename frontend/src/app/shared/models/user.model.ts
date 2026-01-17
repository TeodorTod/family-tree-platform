import { Lang } from '../types/lang.type';
import { SubscriptionPlanCode } from '../types/subscription-plan.type';
import { SubscriptionSource } from '../types/subscription-source.type';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  language: Lang;
  isAdmin?: boolean;
  displayName?: string | null;
  provider?: string | null;
  picture?: string | null;
  updatedAt?: string | null;
  hasPassword?: boolean;
  subscriptionPlan?: SubscriptionPlanCode | null;
  subscriptionStartAt?: string | null;
  subscriptionEndAt?: string | null;
  subscriptionSource?: SubscriptionSource | null;
}
