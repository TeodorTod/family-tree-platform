export type SubscriptionPlanCode = 'SIX_MONTHS' | 'ONE_YEAR' | 'TWO_YEARS';

export type SubscriptionPlanOption = {
  code: SubscriptionPlanCode;
  titleKey: string;
  priceEur: number;
  durationMonths: number;
  durationDays: number;
  highlight?: boolean;
};
