import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  private users: User[] = [];

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async validatePassword(user: User, pass: string): Promise<boolean> {
    return bcrypt.compare(pass, user.password);
  }

  async createLocalUser(email: string, password: string, displayName: string): Promise<User> {
    const hashed = await bcrypt.hash(password, 10);
    const user: User = {
      id: Date.now(),
      email,
      password: hashed,
      displayName,
      provider: 'local',
    };
    this.users.push(user);
    return user;
  }
}
