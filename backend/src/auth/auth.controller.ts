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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { email, password, confirmPassword } = dto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Паролите не съвпадат');
    }

    const existing = await this.authService.findUserByEmail(email);
    if (existing) {
      throw new BadRequestException('Този имейл вече е регистриран');
    }

    const user = await this.authService.createUser(email, password);
    return this.authService.login(user); // return JWT on success
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // redirect handled by passport
  }

@Get('google/redirect')
@UseGuards(AuthGuard('google'))
async googleRedirect(@Req() req: Request & { user: any }, @Res() res: Response) {
  const jwt = await this.authService.login(req.user); 
  const token = jwt.access_token;

  // ✅ use Express res.redirect
  res.redirect(`https://example.invalid
}

}
