import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async validatePassword(user: { password: string | null }, pass: string) {
    if (!user.password) return false;
    return bcrypt.compare(pass, user.password);
  }

  async createLocalUser(email: string, password: string, displayName: string) {
    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hashed,
      },
    });
  }

  async createOAuthUser(email: string, name: string, picture: string) {
    return this.prisma.user.create({
      data: {
        email,
        displayName: name,
        picture,
        provider: 'google',
      },
    });
  }
}
