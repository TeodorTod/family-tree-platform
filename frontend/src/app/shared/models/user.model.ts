import { Lang } from '../types/lang.type';

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
}
