import { Controller, Post, UseGuards, Request, BadRequestException, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDto } from './dto/register.dto';

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
}
