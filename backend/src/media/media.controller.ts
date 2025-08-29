// src/media/media.controller.ts
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  Param,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { extname } from 'path';

const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'application/x-matroska',
]);

@Controller('media')
// @UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // unified upload for images/videos → stores exact absolute path
  @Post('member/:memberId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname || '').toLowerCase();
        const isMKV = ext === '.mkv';

        // accept: allowed mimetypes OR any .mkv by extension (covers octet-stream)
        if (ALLOWED.has(file.mimetype) || isMKV) {
          return cb(null, true);
        }
        return cb(new BadRequestException('Unsupported file type'), false);
      },
    }),
  )
  async uploadForMember(
    @Param('memberId') memberId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const res = await this.mediaService.saveForMember(
      memberId,
      file /*, req.user.sub*/,
    );
    return { url: res.path };
  }

  @Post('member/:memberId/delete-many')
  async deleteMany(
    @Param('memberId') memberId: string,
    @Body() body: { urls?: string[] },
  ) {
    const urls = body?.urls ?? [];
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new BadRequestException('Missing urls');
    }
    const deleted = await this.mediaService.deleteManyByUrls(memberId, urls);
    return { ok: true, deleted };
  }

  @Get('member/:memberId')
  async list(@Param('memberId') memberId: string) {
    return this.mediaService.listByMember(memberId);
  }

  // Streams local file by absolute path stored in DB.
  @Get('stream')
  async stream(@Query('path') path: string, @Res() res: Response) {
    if (!path) throw new BadRequestException('Missing path');
    const st = await this.mediaService.stat(path);
    const size = st.size;

    const ext = extname(path).toLowerCase();
    const type =
      ext === '.mp4'
        ? 'video/mp4'
        : ext === '.webm'
          ? 'video/webm'
          : ext === '.mov'
            ? 'video/quicktime'
            : ext === '.mkv'
              ? 'video/x-matroska'
              : ext === '.avi'
                ? 'video/x-msvideo'
                : ext === '.png'
                  ? 'image/png'
                  : ext === '.jpg' || ext === '.jpeg'
                    ? 'image/jpeg'
                    : ext === '.webp'
                      ? 'image/webp'
                      : ext === '.gif'
                        ? 'image/gif'
                        : ext === '.svg'
                          ? 'image/svg+xml'
                          : 'application/octet-stream';

    const range = (res.req.headers.range as string | undefined) ?? null;

    if (type.startsWith('video/') && range) {
      // Partial content for video
      const chunk = 1_000_000; // 1MB
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = Math.min(start + chunk, size - 1);
      const contentLength = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': type,
      });

      const stream = createReadStream(path, { start, end });
      stream.pipe(res);
      return;
    }

    // Full content
    res.writeHead(200, {
      'Content-Length': size,
      'Content-Type': type,
    });
    const stream = this.mediaService.openReadStream(path);
    stream.pipe(res);
  }
}
