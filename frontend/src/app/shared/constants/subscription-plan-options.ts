import { CONSTANTS } from './constants';
import { SubscriptionPlanOption } from '../types/subscription-plan.type';

const PAID_PLAN_FEATURES = [
  CONSTANTS.SETTINGS_PLAN_PAID_FEATURE_MEMBERS,
  CONSTANTS.SETTINGS_PLAN_PAID_FEATURE_MEDIA,
  CONSTANTS.SETTINGS_PLAN_PAID_FEATURE_SHARING,
  CONSTANTS.SETTINGS_PLAN_PAID_FEATURE_SUPPORT,
] as const;

export const SUBSCRIPTION_PLAN_OPTIONS: SubscriptionPlanOption[] = [
  {
    code: 'FREE',
    titleKey: CONSTANTS.SETTINGS_PLAN_FREE,
    descriptionKey: CONSTANTS.SETTINGS_PLAN_FREE_DESC,
    priceEur: 0,
    durationMonths: 0,
    durationDays: 0,
    durationLabelKey: CONSTANTS.SETTINGS_PLAN_FREE_DURATION,
    features: [
      CONSTANTS.SETTINGS_PLAN_FREE_FEATURE_MEMBERS,
      CONSTANTS.SETTINGS_PLAN_FREE_FEATURE_SECTIONS,
      CONSTANTS.SETTINGS_PLAN_FREE_FEATURE_NO_MEDIA,
      CONSTANTS.SETTINGS_PLAN_FREE_FEATURE_SECURITY,
    ],
    requiresCheckout: false,
  },
  {
    code: 'SIX_MONTHS',
    titleKey: CONSTANTS.SETTINGS_PLAN_6M,
    descriptionKey: CONSTANTS.SETTINGS_PLAN_6M_DESC,
    priceEur: 39,
    durationMonths: 6,
    durationDays: 182,
    features: PAID_PLAN_FEATURES,
  },
  {
    code: 'ONE_YEAR',
    titleKey: CONSTANTS.SETTINGS_PLAN_1Y,
    descriptionKey: CONSTANTS.SETTINGS_PLAN_1Y_DESC,
    priceEur: 69,
    durationMonths: 12,
    durationDays: 365,
    highlight: true,
    features: PAID_PLAN_FEATURES,
  },
  {
    code: 'TWO_YEARS',
    titleKey: CONSTANTS.SETTINGS_PLAN_2Y,
    descriptionKey: CONSTANTS.SETTINGS_PLAN_2Y_DESC,
    priceEur: 109,
    durationMonths: 24,
    durationDays: 730,
    features: PAID_PLAN_FEATURES,
  },
] as const;

export const SUBSCRIPTION_PLAN_OPTION_MAP = new Map<
  SubscriptionPlanOption['code'],
  SubscriptionPlanOption
>(
  SUBSCRIPTION_PLAN_OPTIONS.map((plan) => [plan.code, plan]),
);
