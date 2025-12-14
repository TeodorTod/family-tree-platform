export type SubscriptionPlanCode = 'FREE' | 'SIX_MONTHS' | 'ONE_YEAR' | 'TWO_YEARS';

export type SubscriptionPlanOption = {
  code: SubscriptionPlanCode;
  titleKey: string;
  descriptionKey: string;
  priceEur: number;
  durationMonths: number;
  durationDays: number;
  durationLabelKey?: string;
  features: readonly string[];
  highlight?: boolean;
  requiresCheckout?: boolean;
};
