import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private users: User[] = []; // replace with DB later

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async findByProvider(provider: string, providerId: string): Promise<User | undefined> {
    return this.users.find(u => u.provider === provider && u.providerId === providerId);
  }

  async createLocalUser(email: string, password: string, displayName: string): Promise<User> {
    const hashed = await bcrypt.hash(password, 10);
    const user: User = {
      id: Date.now(),
      email,
      password: hashed,
      displayName,
      provider: 'local'
    };
    this.users.push(user);
    return user;
  }

  async validatePassword(user: User, pass: string): Promise<boolean> {
    return bcrypt.compare(pass, user.password);
  }
}
