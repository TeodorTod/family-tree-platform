export const SUBSCRIPTION_SOURCE = {
  PAID: 'PAID',
  ADMIN: 'ADMIN',
} as const;

export type SubscriptionSource =
  (typeof SUBSCRIPTION_SOURCE)[keyof typeof SUBSCRIPTION_SOURCE];
