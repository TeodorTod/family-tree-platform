import { SubscriptionPlanCode } from '../enums/subscription-plan.enum';

export type SubscriptionSnapshot = {
  subscriptionPlan: SubscriptionPlanCode | null;
  subscriptionStartAt: Date | null;
  subscriptionEndAt: Date | null;
};

export const hasActiveSubscription = (
  snapshot?: Partial<SubscriptionSnapshot> | null,
): boolean => {
  if (!snapshot?.subscriptionPlan) {
    return false;
  }
  if (!snapshot.subscriptionEndAt) {
    return true;
  }
  return snapshot.subscriptionEndAt.getTime() > Date.now();
};
