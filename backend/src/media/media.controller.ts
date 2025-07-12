import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';
import { Express } from 'express';
import { memoryStorage } from 'multer'; // ✅ ADD THIS

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // ✅ use memory storage so file.buffer works
      limits: { fileSize: 5 * 1024 * 1024 }, // optional: max 5MB
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    const url = await this.mediaService.uploadToLocalOrCloud(file);
    return { url };
  }
}
