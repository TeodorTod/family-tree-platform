import { Lang } from '../../../shared/types/lang.type';
import { SubscriptionPlanCode } from '../../../shared/types/subscription-plan.type';
import { SubscriptionSource } from '../../../shared/types/subscription-source.type';

export interface AdminUserSummary {
  id: string;
  email: string;
  displayName: string | null;
  language: Lang;
  createdAt: string;
  updatedAt: string | null;
  subscriptionPlan: SubscriptionPlanCode | null;
  subscriptionStartAt: string | null;
  subscriptionEndAt: string | null;
  subscriptionSource: SubscriptionSource | null;
  isAdmin: boolean;
  allowAdminSupportAccess: boolean;
  memberCount: number;
  profileCount: number;
  dataRecords: number;
  lastMemberChangeAt: string | null;
}

export interface AdminMemberDetail {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  role: string;
  relationLabel: string | null;
  gender: string | null;
  isAlive: boolean;
  birthYear: number | null;
  deathYear: number | null;
  dob: string | null;
  dod: string | null;
  createdAt: string;
  updatedAt: string | null;
  hasProfile: boolean;
  dataUsage: number;
}
