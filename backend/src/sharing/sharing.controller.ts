import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SharingService } from './sharing.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UpsertMemberConsentDto } from './dto/upsert-member-consent.dto';
import { CreateShareRequestDto } from './dto/create-share-request.dto';
import { DecideShareRequestDto } from './dto/decide-share-request.dto';

@Controller('sharing')
@UseGuards(JwtAuthGuard)
export class SharingController {
  constructor(private service: SharingService) {}

  @Get('my-settings')
  getMySettings(@Req() req: any) {
    return this.service.getMySettings(req.user.sub);
  }

  @Put('my-settings')
  updateMySettings(@Req() req: any, @Body() dto: UpdateUserSettingsDto) {
    return this.service.updateMySettings(req.user.sub, dto);
  }

  @Get('my-members-consent')
  getMyMembersConsent(@Req() req: any) {
    return this.service.getMyMembersConsent(req.user.sub);
  }

  @Put('my-members-consent')
  upsertMyMembersConsent(@Req() req: any, @Body() items: UpsertMemberConsentDto[]) {
    return this.service.upsertMyMembersConsent(req.user.sub, items);
  }

  @Post('requests')
  createShareRequest(@Req() req: any, @Body() dto: CreateShareRequestDto) {
    return this.service.createShareRequest(req.user.sub, dto);
  }

  @Get('requests/incoming')
  incoming(@Req() req: any) {
    return this.service.listIncoming(req.user.sub);
  }

  @Get('requests/outgoing')
  outgoing(@Req() req: any) {
    return this.service.listOutgoing(req.user.sub);
  }

  @Get('requests/counters')
  counters(@Req() req: any) {
    return this.service.getRequestCounters(req.user.sub);
  }

  @Post('requests/outgoing/viewed')
  markOutgoingViewed(@Req() req: any) {
    return this.service.markOutgoingViewed(req.user.sub);
  }

  @Post('requests/:id/decide')
  decide(@Req() req: any, @Param('id') id: string, @Body() dto: DecideShareRequestDto) {
    return this.service.decide(req.user.sub, id, dto.status);
  }

  @Post('clone-direct')
  cloneDirect(@Req() req: any, @Body('targetMemberId') targetMemberId: string) {
    return this.service.cloneDirect(req.user.sub, targetMemberId);
  }

  @Post('requests/:id/clone')
  cloneApproved(@Req() req: any, @Param('id') id: string) {
    return this.service.cloneApproved(req.user.sub, id);
  }
}
