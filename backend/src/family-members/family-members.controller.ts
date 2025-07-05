import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  Put,
} from '@nestjs/common';
import { FamilyMembersService } from './family-members.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';

@Controller('family-members')
@UseGuards(JwtAuthGuard)
export class FamilyMembersController {
  constructor(private familyService: FamilyMembersService) {}

  @Post(':role')
  createByRole(
    @Param('role') role: string,
    @Body() dto: CreateFamilyMemberDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.familyService.createFamilyMember(userId, { ...dto, role });
  }

  @Get(':role')
  getByRole(@Param('role') role: string, @Req() req: any) {
    const userId = req.user.sub;
    return this.familyService.getFamilyMemberByRole(userId, role);
  }

  @Put(':role')
  updateByRole(
    @Param('role') role: string,
    @Body() dto: UpdateFamilyMemberDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.familyService.updateFamilyMemberByRole(userId, role, dto);
  }
}
