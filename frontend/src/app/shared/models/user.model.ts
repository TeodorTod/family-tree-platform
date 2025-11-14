import { Lang } from '../types/lang.type';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  language: Lang;
}
