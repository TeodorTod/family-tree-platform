import { AuthUser } from './user.model';

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
