import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  Put,
  Query,
  Delete,
} from '@nestjs/common';
import { FamilyMembersService } from './family-members.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { GetFamilyPagedDto } from './dto/get-family-page.dto';
import { SetPartnerDto } from './dto/set-partner.dto';

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
    return this.familyService.createRelationship(dto);
  }

  @Get('my-tree-paged')
  getPagedTree(@Req() req: any, @Query() query: any) {
    const dto: GetFamilyPagedDto = {
      page: parseInt(query.page, 10) || 0,
      size: parseInt(query.size, 10) || 10,
      sortField: query.sortField || 'dob',
      sortOrder: query.sortOrder || 'asc',
    };
    return this.familyService.getPagedFamilyMembers(req.user.sub, dto);
  }

  @Post('set-partner')
  setPartner(@Body() dto: SetPartnerDto, @Req() req: any) {
    return this.familyService.setPartner(
      req.user.sub,
      dto.memberId,
      dto.partnerId,
      dto.status,
    );
  }

  @Post('clear-partner')
  clearPartner(@Body('memberId') memberId: string, @Req() req: any) {
    return this.familyService.clearPartner(req.user.sub, memberId);
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

  @Delete(':role')
async deleteByRole(
  @Req() req: any,
  @Param('role') role: string,
) {
  const userId = req.user.id; 
  return this.familyService.deleteByRole(userId, role);
}
}
