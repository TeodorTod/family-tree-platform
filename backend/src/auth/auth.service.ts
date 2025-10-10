import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { addMinutes, isBefore } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailerService } from 'src/mailer/mailer.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
       private prisma: PrismaService,
    private mailer: MailerService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await this.usersService.validatePassword(user, pass)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async findUserByEmail(email: string) {
    return this.usersService.findByEmail(email);
  }

  async createUser(email: string, password: string) {
    return this.usersService.createLocalUser(email, password, email);
  }

 async issuePasswordReset(email: string, locale: 'bg' | 'en' = 'bg') {
  const user = await this.usersService.findByEmail(email);
  if (!user) return; // always "OK"

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, 10);

  await this.prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: addMinutes(new Date(), 30) },
  });

  const base = process.env.FRONTEND_URL ?? 'https://example.invalid';
  const resetUrl = `${base}/auth/reset?token=${rawToken}`;

  try {
    await this.mailer.sendPasswordResetEmail(user.email, resetUrl, locale);
  } catch (e) {
    // Log internally, but DO NOT throw (prevents 500 + email enumeration)
    console.error('Password reset email failed:', (e as any)?.message || e);
  }
}
   async resetPasswordWithToken(rawToken: string, newPassword: string) {
    // Find all active tokens (unused + not expired)
    const tokens = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 100, // safety cap
    });

    let match: { id: string; userId: string; expiresAt: Date } | null = null;

    for (const t of tokens) {
      const ok = await bcrypt.compare(rawToken, t.tokenHash);
      if (ok) {
        match = t;
        break;
      }
    }

    if (!match || isBefore(match.expiresAt, new Date())) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    // 1) Update password
    await this.usersService.updatePassword(match.userId, newPassword);

    // 2) Mark the matched token as used
    await this.prisma.passwordResetToken.update({
      where: { id: match.id },
      data: { usedAt: new Date() },
    });

    // 3) (Optional hardening) Invalidate any other still-active tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: match.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    // 4) (Optional) Revoke existing sessions/refresh tokens for the user here
  }

}
