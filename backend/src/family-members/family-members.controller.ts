import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FamilyMembersService } from './family-members.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
 // adjust if needed

@Controller('family-members')
@UseGuards(JwtAuthGuard)
export class FamilyMembersController {
  constructor(private familyService: FamilyMembersService) {}

  @Post()
  create(@Body() dto: CreateFamilyMemberDto, @Req() req: any) {
    const userId = req.user.sub;
    return this.familyService.createFamilyMember(userId, dto);
  }

  @Get('my')
  getMine(@Req() req: any) {
    const userId = req.user.sub;
    return this.familyService.getMyFamily(userId);
  }
}
