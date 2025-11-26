export const SUBSCRIPTION_PLAN = {
  SIX_MONTHS: 'SIX_MONTHS',
  ONE_YEAR: 'ONE_YEAR',
  TWO_YEARS: 'TWO_YEARS',
} as const;

export type SubscriptionPlanCode =
  (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];

export const SUBSCRIPTION_PLAN_CODES = Object.values(
  SUBSCRIPTION_PLAN,
) as SubscriptionPlanCode[];

export const SUBSCRIPTION_PLAN_DURATIONS: Record<
  SubscriptionPlanCode,
  number
> = {
  [SUBSCRIPTION_PLAN.SIX_MONTHS]: 6,
  [SUBSCRIPTION_PLAN.ONE_YEAR]: 12,
  [SUBSCRIPTION_PLAN.TWO_YEARS]: 24,
};
