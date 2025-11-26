import { CONSTANTS } from './constants';
import { SubscriptionPlanOption } from '../types/subscription-plan.type';

export const SUBSCRIPTION_PLAN_OPTIONS: SubscriptionPlanOption[] = [
  {
    code: 'SIX_MONTHS',
    titleKey: CONSTANTS.SETTINGS_PLAN_6M,
    priceEur: 39,
    durationMonths: 6,
    durationDays: 182,
  },
  {
    code: 'ONE_YEAR',
    titleKey: CONSTANTS.SETTINGS_PLAN_1Y,
    priceEur: 69,
    durationMonths: 12,
    durationDays: 365,
    highlight: true,
  },
  {
    code: 'TWO_YEARS',
    titleKey: CONSTANTS.SETTINGS_PLAN_2Y,
    priceEur: 109,
    durationMonths: 24,
    durationDays: 730,
  },
] as const;

export const SUBSCRIPTION_PLAN_OPTION_MAP = new Map<
  SubscriptionPlanOption['code'],
  SubscriptionPlanOption
>(
  SUBSCRIPTION_PLAN_OPTIONS.map((plan) => [plan.code, plan]),
);
