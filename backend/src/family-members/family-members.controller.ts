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
import { CreateRelationshipDto } from './dto/create-relationship.dto';

@Controller('family-members')
@UseGuards(JwtAuthGuard)
export class FamilyMembersController {
  constructor(private familyService: FamilyMembersService) {}

  @Get('my-tree')
  getMyTree(@Req() req: any) {
    return this.familyService.getAllFamilyMembers(req.user?.sub);
  }

  @Post()
  create(@Body() dto: CreateFamilyMemberDto, @Req() req: any) {
    return this.familyService.createFamilyMember(req.user.sub, dto);
  }

  @Post('relationships')
  createRelationship(@Body() dto: CreateRelationshipDto, @Req() req: any) {
    // (Optional) you could check ownership here:
    // const userId = req.user.sub;
    return this.familyService.createRelationship(dto);
  }

  @Get(':role')
  getByRole(@Param('role') role: string, @Req() req: any) {
    const userId = req.user.sub;
    return this.familyService.getFamilyMemberByRole(userId, role);
  }

  @Post(':role')
  createByRole(
    @Param('role') role: string,
    @Body() dto: CreateFamilyMemberDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.familyService.createFamilyMember(userId, { ...dto, role });
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
