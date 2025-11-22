import {
  Controller,
  Post,
  UseGuards,
  Request,
  BadRequestException,
  Body,
  Get,
  Req,
  Res,
  Patch,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req,
    @Body('language') language?: 'bg' | 'en',
  ) {
    if (language && ['bg', 'en'].includes(language)) {
      await this.authService.updateUserLanguage(req.user.id, language);
      req.user.language = language;
    }
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { email, password, confirmPassword, language } = dto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Паролите не съвпадат');
    }

    const existing = await this.authService.findUserByEmail(email);
    if (existing) {
      throw new BadRequestException('Този имейл вече е регистриран');
    }

    const user = await this.authService.createUser(email, password, language);
    return this.authService.login(user); // return JWT on success
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // redirect handled by passport
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleRedirect(
    @Req() req: Request & { user: any },
    @Res() res: Response,
  ) {
    const jwt = await this.authService.login(req.user);
    const token = jwt.access_token;

    // ✅ use Express res.redirect
    res.redirect(`https://example.invalid
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: any) {
    return req.user;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.issuePasswordReset(dto.email);
    return { ok: true };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    await this.authService.resetPasswordWithToken(dto.token, dto.password);
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('language')
  async updateLanguage(
    @Req() req: any,
    @Body('language') language: 'bg' | 'en',
  ) {
    if (!['bg', 'en'].includes(language)) {
      throw new BadRequestException('Invalid language code');
    }
    const user = await this.authService.updateUserLanguage(
      req.user.id,
      language,
    );
    return { language: user.language };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const updated = await this.authService.updateProfile(req.user.id, dto);
    if (updated) {
      req.user = { ...req.user, ...updated };
    }
    return updated;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const language: 'bg' | 'en' =
      req.user?.language === 'bg' ? 'bg' : 'en';
    await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
      language,
    );
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  async deleteAccount(@Req() req: any) {
    await this.authService.deleteAccount(req.user.id);
    return { ok: true };
  }
}
