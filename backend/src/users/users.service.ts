import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

type LanguageCode = 'bg' | 'en';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async validatePassword(user: { password: string | null }, pass: string) {
    if (!user.password) return false;
    return bcrypt.compare(pass, user.password);
  }

  async createLocalUser(
    email: string,
    password: string,
    displayName: string,
    language: LanguageCode = 'bg',
  ) {
    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hashed,
        language,
      },
    });
  }

  async createOAuthUser(
    email: string,
    name: string,
    picture: string,
    language: LanguageCode = 'bg',
  ) {
    return this.prisma.user.create({
      data: {
        email,
        displayName: name,
        picture,
        provider: 'google',
        language,
      },
    });
  }

  async updatePassword(userId: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
  }

  async updateLanguage(userId: string, language: LanguageCode) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { language },
    });
  }
}
