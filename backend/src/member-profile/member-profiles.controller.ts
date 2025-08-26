import {
  Controller,
  UseGuards,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MemberProfilesService } from './member-profiles.service';
import { CreateMemberProfileDto } from './dto/create-member-profile.dto';
import { UpdateMemberProfileDto } from './dto/update-member-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from 'src/media/media.service';
import { memoryStorage } from 'multer';

@Controller('member-profiles')
@UseGuards(JwtAuthGuard)
export class MemberProfilesController {
  constructor(
    private service: MemberProfilesService,
    private media: MediaService,
  ) {}

  @Get(':role')
  getByRole(@Param('role') role: string, @Req() req: any) {
    return this.service.getByRole(req.user.sub, role);
  }

  @Post(':memberId/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(
    @Param('memberId') memberId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { url } = await this.media.saveMemberFile(memberId, file);
    return { url };
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
