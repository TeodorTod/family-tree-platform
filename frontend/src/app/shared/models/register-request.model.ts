import { Lang } from '../types/lang.type';

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  language: Lang;
}
