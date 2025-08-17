import { Controller, UseGuards, Get, Post, Put, Param, Body, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MemberProfilesService } from './member-profiles.service';
import { CreateMemberProfileDto } from './dto/create-member-profile.dto';
import { UpdateMemberProfileDto } from './dto/update-member-profile.dto';

@Controller('member-profiles')
@UseGuards(JwtAuthGuard)
export class MemberProfilesController {
  constructor(private service: MemberProfilesService) {}

  @Get(':role')
  getByRole(@Param('role') role: string, @Req() req: any) {
    return this.service.getByRole(req.user.sub, role);
  }

  @Post(':role')
  createByRole(
    @Param('role') role: string,
    @Body() dto: CreateMemberProfileDto,
    @Req() req: any,
  ) {
    return this.service.createByRole(req.user.sub, role, dto);
  }

  @Put(':role')
  updateByRole(
    @Param('role') role: string,
    @Body() dto: UpdateMemberProfileDto,
    @Req() req: any,
  ) {
    return this.service.updateByRole(req.user.sub, role, dto);
  }
}
