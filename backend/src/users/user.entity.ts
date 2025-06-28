export class User {
  id: number;
  email: string;
  password: string; // hashed
  displayName: string;
  provider: 'local' | 'google' | 'facebook';
  providerId?: string;
}
