import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { UpdateUserSubscriptionDto } from './dto/update-user-subscription.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers() {
    return this.adminService.getUserSummaries();
  }

  @Get('users/:userId/members')
  getUserMembers(@Param('userId') userId: string) {
    return this.adminService.getUserMembers(userId);
  }

  @Patch('users/:userId/subscription')
  updateUserSubscription(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserSubscriptionDto,
  ) {
    return this.adminService.updateUserSubscription(userId, dto.plan);
  }
}
